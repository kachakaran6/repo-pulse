import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';

export interface SyncResult {
  reposRead: number;
  status: 'success' | 'failed' | 'rate_limited';
  error?: string;
  pausedUntil?: string;
}

/**
 * Mint GitHub App installation access token using RS256 JWT
 */
export async function getInstallationToken(installationId: string | number): Promise<string> {
  if (!env.GITHUB_APP_ID || !env.GITHUB_PRIVATE_KEY_BASE64) {
    throw new Error('GitHub App credentials not fully configured for installation token minting.');
  }

  const pem = Buffer.from(env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600, // 10 minutes maximum
      iss: env.GITHUB_APP_ID,
    })
  ).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(pem, 'base64url');
  const jwtToken = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoPulse-v2',
    },
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to mint installation token from GitHub: HTTP ${tokenRes.status}`);
  }

  const data = (await tokenRes.json()) as any;
  return data.token;
}

/**
 * Single-pass GraphQL query for repos and 90 days of commits
 */
export const REPOS_GRAPHQL_QUERY = `
  query FetchViewerRepos($after: String, $since: GitTimestamp!) {
    viewer {
      repositories(
        first: 100
        after: $after
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: {field: PUSHED_AT, direction: DESC}
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          databaseId
          nameWithOwner
          isPrivate
          isArchived
          pushedAt
          updatedAt
          createdAt
          primaryLanguage { name }
          defaultBranchRef {
            name
            target {
              ... on Commit {
                committedDate
                history(first: 100, since: $since) {
                  totalCount
                  nodes {
                    committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Execute Sync for a specific user
 */
export async function runUserSync(userId: string | number): Promise<SyncResult> {
  const syncRun = await db.createSyncRun(userId);
  logger.info({ userId, syncRunId: syncRun.id }, 'Initiating repository synchronization');

  try {
    const user = await db.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const installation = await db.getInstallation(userId);
    const userGithubToken = (user as any).github_token as string | null | undefined;

    // If live GitHub token or App installation token is available, execute live GitHub sync
    let reposSynced = 0;

    let activeToken: string | null = null;
    if (userGithubToken) {
      activeToken = userGithubToken;
    } else if (installation && env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY_BASE64) {
      try {
        activeToken = await getInstallationToken(installation.github_installation_id);
      } catch (tokenErr: any) {
        logger.warn({ error: tokenErr.message }, 'Failed to mint GitHub App token');
      }
    }

    if (activeToken) {
      const syncedGithubRepoIds = new Set<string>();
      const repoMap = new Map<string, {
        github_repo_id: string;
        full_name: string;
        is_private: boolean;
        default_branch: string;
        last_commit_at: Date | null;
        language: string | null;
        archived_on_github: boolean;
        dailyCounts: Record<string, number>;
      }>();

      // STEP 1: Fetch ALL user repositories via REST API pagination to guarantee 100% complete coverage (all repositories)
      try {
        let page = 1;
        let hasMorePages = true;
        while (hasMorePages && page <= 25) {
          const restRes = await fetch(
            `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc`,
            {
              headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'RepoPulse-v2',
              },
            }
          );

          if (!restRes.ok) {
            if (restRes.status === 403 || restRes.status === 429) {
              const resetHeader = restRes.headers.get('x-ratelimit-reset');
              const pausedUntil = resetHeader ? new Date(Number(resetHeader) * 1000).toISOString() : undefined;
              await db.updateSyncRun(syncRun.id, userId, {
                finished_at: new Date(),
                status: 'rate_limited',
                error: 'GitHub API rate limit encountered',
              });
              return {
                reposRead: reposSynced,
                status: 'rate_limited',
                pausedUntil,
              };
            }
            logger.warn({ status: restRes.status }, 'REST user/repos fetch returned non-200');
            break;
          }

          const restRepos = (await restRes.json()) as any[];
          if (!Array.isArray(restRepos) || restRepos.length === 0) {
            hasMorePages = false;
            break;
          }

          for (const r of restRepos) {
            if (!r || !r.id) continue;
            const rId = String(r.id);
            const lastDate = r.pushed_at
              ? new Date(r.pushed_at)
              : r.updated_at
              ? new Date(r.updated_at)
              : r.created_at
              ? new Date(r.created_at)
              : null;

            repoMap.set(rId, {
              github_repo_id: rId,
              full_name: r.full_name || `${r.owner?.login || user.login}/${r.name}`,
              is_private: Boolean(r.private),
              default_branch: r.default_branch || 'main',
              last_commit_at: lastDate,
              language: r.language || null,
              archived_on_github: Boolean(r.archived),
              dailyCounts: {},
            });
            syncedGithubRepoIds.add(rId);
          }

          if (restRepos.length < 100) {
            hasMorePages = false;
          } else {
            page++;
          }
        }
      } catch (restErr: any) {
        logger.warn({ error: restErr.message }, 'REST user/repos sync encountered error');
      }

      // STEP 2: Query GraphQL for 90-day daily commit history sparklines & commit timestamps
      try {
        const now = new Date();
        const since90Days = new Date(now.getTime() - 90 * 864e5).toISOString();
        let hasNextPage = true;
        let afterCursor: string | null = null;
        let gqlPages = 0;

        while (hasNextPage && gqlPages < 25) {
          gqlPages++;
          const gqlRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${activeToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'RepoPulse-v2',
            },
            body: JSON.stringify({
              query: REPOS_GRAPHQL_QUERY,
              variables: {
                after: afterCursor,
                since: since90Days,
              },
            }),
          });

          if (!gqlRes.ok) {
            logger.warn({ status: gqlRes.status }, 'GraphQL sync non-200 status, using REST dataset');
            break;
          }

          const gqlData = (await gqlRes.json()) as any;
          const repoNodes = gqlData?.data?.viewer?.repositories?.nodes || [];
          const pageInfo = gqlData?.data?.viewer?.repositories?.pageInfo;

          for (const node of repoNodes) {
            if (!node || !node.databaseId) continue;
            const rId = String(node.databaseId);
            syncedGithubRepoIds.add(rId);

            const commitTarget = node?.defaultBranchRef?.target;
            const commitDate = commitTarget?.committedDate
              ? new Date(commitTarget.committedDate)
              : node.pushedAt
              ? new Date(node.pushedAt)
              : null;

            const existing = repoMap.get(rId);
            const dailyCounts: Record<string, number> = {};

            const commitNodes = commitTarget?.history?.nodes || [];
            for (const c of commitNodes) {
              if (c?.committedDate) {
                const dayStr = String(c.committedDate).split('T')[0];
                dailyCounts[dayStr] = (dailyCounts[dayStr] || 0) + 1;
              }
            }

            if (existing) {
              existing.dailyCounts = dailyCounts;
              if (commitDate && (!existing.last_commit_at || commitDate.getTime() > existing.last_commit_at.getTime())) {
                existing.last_commit_at = commitDate;
              }
            } else {
              repoMap.set(rId, {
                github_repo_id: rId,
                full_name: node.nameWithOwner,
                is_private: Boolean(node.isPrivate),
                default_branch: node?.defaultBranchRef?.name || 'main',
                last_commit_at: commitDate,
                language: node?.primaryLanguage?.name || null,
                archived_on_github: Boolean(node.isArchived),
                dailyCounts,
              });
            }
          }

          hasNextPage = Boolean(pageInfo?.hasNextPage);
          afterCursor = pageInfo?.endCursor || null;
        }
      } catch (gqlErr: any) {
        logger.warn({ error: gqlErr.message }, 'GraphQL commit history fetch error');
      }

      // STEP 3: Upsert all real repositories and their commit activity into database
      for (const repoData of repoMap.values()) {
        const repo = await db.upsertRepo({
          user_id: userId,
          installation_id: installation?.id || null,
          github_repo_id: repoData.github_repo_id,
          full_name: repoData.full_name,
          is_private: repoData.is_private,
          default_branch: repoData.default_branch,
          last_commit_at: repoData.last_commit_at,
          language: repoData.language,
          archived_on_github: repoData.archived_on_github,
        });

        for (const [day, count] of Object.entries(repoData.dailyCounts)) {
          await db.upsertActivity(repo.id, userId, day, count);
        }

        reposSynced++;
      }

      // STEP 4: Clean up any mock repos (e.g. fake auth-shield, fake repopulse) or deleted repos
      if (syncedGithubRepoIds.size > 0) {
        const removedCount = await db.removeMissingRepos(userId, Array.from(syncedGithubRepoIds));
        if (removedCount > 0) {
          logger.info({ userId, removedCount }, 'Purged mock/stale repositories from tenant database');
        }
      }
    }

    // Only generate mock dataset for dedicated demo/dev exploration when NO GitHub token is present
    if (reposSynced === 0 && (user.login === 'demo-user' || user.login === 'dev-user') && !activeToken) {
      const generatedRepos = generateRealisticDataset(userId, user.login);
      for (const repoData of generatedRepos) {
        const repo = await db.upsertRepo({
          user_id: userId,
          installation_id: installation?.id || null,
          github_repo_id: repoData.github_repo_id,
          full_name: repoData.full_name,
          is_private: repoData.is_private,
          default_branch: repoData.default_branch,
          last_commit_at: repoData.last_commit_at,
          language: repoData.language,
          archived_on_github: repoData.archived_on_github,
        });

        // Upsert activity history (never touches repo_meta!)
        for (const act of repoData.activity) {
          await db.upsertActivity(repo.id, userId, act.day, act.commits);
        }

        reposSynced++;
      }
    }

    await db.updateSyncRun(syncRun.id, userId, {
      finished_at: new Date(),
      status: 'success',
      repos_read: reposSynced,
      error: null,
    });

    await db.logAudit(userId, 'sync_completed', { repos_read: reposSynced });

    return {
      reposRead: reposSynced,
      status: 'success',
    };
  } catch (err: any) {
    logger.error({ userId, error: err.message }, 'Sync execution failed');
    await db.updateSyncRun(syncRun.id, userId, {
      finished_at: new Date(),
      status: 'failed',
      error: err.message,
    });
    return {
      reposRead: 0,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Generate realistic dataset for testing and dev environments
 */
function generateRealisticDataset(userId: string | number, login: string) {
  const now = new Date();
  const dayMs = 864e5;
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const repoDefs = [
    // ACTIVE (0-7 days)
    { name: `${login}/repopulse`, daysAgo: 0, language: 'TypeScript', private: false, commitPattern: [0, 0, 1, 2, 3, 5, 7, 10, 14, 21, 28] },
    { name: `${login}/auth-shield`, daysAgo: 1, language: 'Go', private: true, commitPattern: [1, 2, 4, 6, 12, 19, 25] },
    { name: `${login}/design-tokens-cli`, daysAgo: 2, language: 'TypeScript', private: false, commitPattern: [2, 3, 5, 8, 15, 22] },
    { name: `${login}/postgres-rls-guard`, daysAgo: 3, language: 'Rust', private: false, commitPattern: [3, 4, 7, 11, 18] },
    { name: `${login}/mobile-pos-app`, daysAgo: 4, language: 'Dart', private: true, commitPattern: [4, 5, 6, 10, 20] },
    { name: `${login}/inventory-service`, daysAgo: 5, language: 'Python', private: true, commitPattern: [5, 6, 7, 12] },
    { name: `${login}/analytics-pipeline`, daysAgo: 6, language: 'Python', private: false, commitPattern: [6, 7, 8, 15] },
    { name: `${login}/developer-portal`, daysAgo: 7, language: 'TypeScript', private: false, commitPattern: [7, 8, 14, 28] },

    // COOLING (8-14 days)
    { name: `${login}/metrics-exporter`, daysAgo: 8, language: 'Go', private: false, commitPattern: [8, 9, 11, 20, 35] },
    { name: `${login}/notification-broker`, daysAgo: 9, language: 'TypeScript', private: true, commitPattern: [9, 10, 15, 30] },
    { name: `${login}/react-virtual-ledger`, daysAgo: 10, language: 'TypeScript', private: false, commitPattern: [10, 12, 18, 40] },
    { name: `${login}/cloud-billing-sync`, daysAgo: 11, language: 'Python', private: true, commitPattern: [11, 14, 25, 45] },
    { name: `${login}/tailwind-theme-tokens`, daysAgo: 12, language: 'CSS', private: false, commitPattern: [12, 15, 30] },
    { name: `${login}/stripe-webhook-handler`, daysAgo: 13, language: 'TypeScript', private: true, commitPattern: [13, 16, 32] },
    { name: `${login}/graphql-cache-mesh`, daysAgo: 14, language: 'Go', private: false, commitPattern: [14, 18, 40] },

    // STALE (15-30 days)
    { name: `${login}/customer-crm-v1`, daysAgo: 16, language: 'TypeScript', private: true, commitPattern: [16, 20, 35, 60] },
    { name: `${login}/pdf-invoice-generator`, daysAgo: 18, language: 'Node.js', private: false, commitPattern: [18, 22, 50] },
    { name: `${login}/docker-pg-cluster`, daysAgo: 21, language: 'Shell', private: false, commitPattern: [21, 28, 65] },
    { name: `${login}/rust-embedded-firmware`, daysAgo: 24, language: 'Rust', private: true, commitPattern: [24, 30, 70] },
    { name: `${login}/markdown-blog-engine`, daysAgo: 27, language: 'Astro', private: false, commitPattern: [27, 35, 80] },
    { name: `${login}/k8s-cost-watcher`, daysAgo: 29, language: 'Go', private: false, commitPattern: [29, 45, 85] },

    // DEAD (31+ days)
    { name: `${login}/angularjs-legacy-portal`, daysAgo: 45, language: 'JavaScript', private: false, commitPattern: [45, 60, 88] },
    { name: `${login}/old-vue2-dashboard`, daysAgo: 62, language: 'Vue', private: false, commitPattern: [62, 75] },
    { name: `${login}/abandoned-solidity-dao`, daysAgo: 78, language: 'Solidity', private: false, commitPattern: [78] },
    { name: `${login}/flask-api-boilerplate`, daysAgo: 95, language: 'Python', private: false, commitPattern: [] },
    { name: `${login}/jquery-plugins-pack`, daysAgo: 120, language: 'JavaScript', private: false, commitPattern: [] },
    { name: `${login}/react-native-prototype-2023`, daysAgo: 180, language: 'TypeScript', private: true, commitPattern: [] },
    { name: `${login}/dead-crypto-bot`, daysAgo: 250, language: 'Python', private: true, commitPattern: [] },
    { name: `${login}/empty-starter-repo`, daysAgo: null, language: null, private: false, commitPattern: [] },
  ];

  return repoDefs.map((def, idx) => {
    const lastCommitDate = def.daysAgo !== null ? new Date(now.getTime() - def.daysAgo * dayMs) : null;
    const activityMap: Record<string, number> = {};
    for (const offset of def.commitPattern) {
      if (offset <= 90) {
        const d = new Date(now.getTime() - offset * dayMs);
        const dayStr = formatDate(d);
        activityMap[dayStr] = (activityMap[dayStr] || 0) + (offset === 0 ? 3 : 1 + (offset % 4));
      }
    }
    const activity = Object.entries(activityMap).map(([day, commits]) => ({ day, commits }));

    return {
      github_repo_id: String(200000 + idx),
      full_name: def.name,
      is_private: def.private,
      default_branch: 'main',
      last_commit_at: lastCommitDate,
      language: def.language,
      archived_on_github: def.daysAgo !== null && def.daysAgo > 100,
      activity,
    };
  });
}
