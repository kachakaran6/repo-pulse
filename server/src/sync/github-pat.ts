import { memoryDb } from '../db/index.js';
import { logger } from '../utils/logger.js';
import type { SyncResult } from './engine.js';

export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

/**
 * In-memory store for user Personal Access Tokens (keyed by user_id)
 */
export const userTokens = new Map<number, string>();

/**
 * Validate a GitHub Personal Access Token and fetch user profile
 */
export async function validateGitHubToken(token: string): Promise<GitHubUserProfile> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Token cannot be empty');
  }

  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoPulse-PAT-Client/2.0',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid or expired GitHub Personal Access Token');
    }
    if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded or token lacks required scopes');
    }
    throw new Error(`GitHub verification failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  return {
    id: data.id,
    login: data.login,
    name: data.name || data.login,
    avatar_url: data.avatar_url,
  };
}

/**
 * Synchronize real repositories using user's Personal Access Token
 * Paginates through all pages so all repositories (e.g. 184+) are fetched accurately.
 */
export async function syncReposWithPat(userId: number, token: string): Promise<SyncResult> {
  const syncRun = memoryDb.createSyncRun(userId);
  const cleanToken = token.trim();

  logger.info({ userId }, 'Starting live GitHub repository sync with Personal Access Token');

  try {
    // 1. Fetch all repositories across all pages
    let page = 1;
    const allGithubRepos: any[] = [];

    while (true) {
      const reposRes = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
        {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RepoPulse-PAT-Client/2.0',
          },
        }
      );

      if (!reposRes.ok) {
        if (page === 1) {
          throw new Error(`Failed to fetch repositories from GitHub: HTTP ${reposRes.status}`);
        }
        break;
      }

      const pageRepos = (await reposRes.json()) as any[];
      if (!Array.isArray(pageRepos) || pageRepos.length === 0) {
        break;
      }

      allGithubRepos.push(...pageRepos);
      logger.info({ userId, page, pageCount: pageRepos.length, totalSoFar: allGithubRepos.length }, 'Fetched repository page from GitHub');

      if (pageRepos.length < 100) {
        break;
      }

      page++;
      if (page > 30) {
        // Safety cap (3,000 repositories)
        break;
      }
    }

    const now = new Date();
    const since90Days = new Date(now.getTime() - 90 * 864e5).toISOString();
    const repoRecords: { id: number; fullName: string; defaultBranch: string }[] = [];

    // 2. Upsert every repository in database
    for (const ghRepo of allGithubRepos) {
      const isPrivate = ghRepo.private === true;
      const defaultBranch = ghRepo.default_branch || 'main';
      const lastPushedAt = ghRepo.pushed_at ? new Date(ghRepo.pushed_at) : null;

      // Upsert repository in database
      const repo = memoryDb.upsertRepo({
        user_id: userId,
        github_repo_id: ghRepo.id,
        full_name: ghRepo.full_name,
        is_private: isPrivate,
        default_branch: defaultBranch,
        last_commit_at: lastPushedAt,
        language: ghRepo.language || null,
        archived_on_github: ghRepo.archived === true,
      });

      repoRecords.push({ id: repo.id, fullName: ghRepo.full_name, defaultBranch });

      // Default metadata
      const existingMeta = memoryDb.repoMeta.get(repo.id);
      if (!existingMeta) {
        memoryDb.upsertRepoMeta(repo.id, userId, {
          label: null,
          decision: ghRepo.archived ? 'retire' : null,
          note: null,
          goal_date: null,
        });
      }
    }

    // 3. Fetch 90-day commit history concurrently in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < repoRecords.length; i += BATCH_SIZE) {
      const batch = repoRecords.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (r) => {
          try {
            const commitsRes = await fetch(
              `https://api.github.com/repos/${r.fullName}/commits?since=${since90Days}&per_page=100`,
              {
                headers: {
                  'Authorization': `Bearer ${cleanToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'RepoPulse-PAT-Client/2.0',
                },
              }
            );

            if (commitsRes.ok) {
              const commits = (await commitsRes.json()) as any[];
              if (Array.isArray(commits)) {
                const dailyCounts: Record<string, number> = {};
                for (const c of commits) {
                  const dateStr = c?.commit?.author?.date || c?.commit?.committer?.date;
                  if (dateStr) {
                    const day = dateStr.split('T')[0];
                    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
                  }
                }

                for (const [day, count] of Object.entries(dailyCounts)) {
                  memoryDb.upsertActivity(r.id, userId, day, count);
                }
              }
            }
          } catch (err: any) {
            logger.warn({ repo: r.fullName, error: err.message }, 'Failed to fetch commit history for repo');
          }
        })
      );
    }

    const reposCount = repoRecords.length;

    memoryDb.updateSyncRun(syncRun.id, {
      finished_at: new Date(),
      status: 'success',
      repos_read: reposCount,
      error: null,
    });

    memoryDb.logAudit(userId, 'sync_completed_pat', { repos_read: reposCount });

    return {
      reposRead: reposCount,
      status: 'success',
    };
  } catch (err: any) {
    logger.error({ userId, error: err.message }, 'PAT Sync failed');
    memoryDb.updateSyncRun(syncRun.id, {
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
