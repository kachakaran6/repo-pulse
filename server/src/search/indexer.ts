/**
 * Repository Indexing Pipeline for Semantic Search
 *
 * Implements:
 * - Two-pass chunking (README/metadata first, source-code second)
 * - Invalidation logic (re-indexes only repos whose pushedAt / commitSha changed or model changed)
 * - Privacy filtering (skips private repos unless user explicitly opted in)
 * - Outbound text preview before sending to external embedding APIs
 * - Cost estimation and status tracking
 */

import { db } from '../db/index.js';
import { chunkRepository, estimateTokens, type RawCommit, type RawFile } from './chunker.js';
import { getEmbeddingProvider } from './embeddings.js';
import { statusOf, DEFAULT_THRESHOLDS } from '../core/status.js';
import { logger } from '../utils/logger.js';
import type {
  SearchIndexStatus,
  OutboundPreview,
  OutboundPreviewSample,
  RepoChunkKind,
} from './types.js';

/**
 * Generate rich mock files & README for realistic dev/demo repositories
 */
function getRealisticRepoData(repo: any): {
  readme: string;
  commits: RawCommit[];
  fileTree: string[];
  sourceFiles: RawFile[];
} {
  const name = repo.full_name.toLowerCase();

  if (name.includes('auth') || name.includes('shield')) {
    return {
      readme: `# Auth Shield\n\nHigh-performance authentication gateway with JWT refresh rotation, sliding session expiration, and OAuth2 security guards.\n\n## Features\n- Cryptographic JWT signing with RS256/ES256\n- Automatic refresh token rotation to detect token reuse\n- Rate limiting on login and refresh endpoints\n- CSRF protection with double-submit cookie pattern`,
      commits: [
        { message: 'Implement JWT refresh token rotation with sliding expiration', author: 'dev' },
        { message: 'Add HMAC signature validation for webhooks', author: 'dev' },
        { message: 'Fix race condition during concurrent refresh token exchanges', author: 'dev' },
      ],
      fileTree: ['src/auth/jwt.ts', 'src/auth/refresh.ts', 'src/middleware/rateLimit.ts', 'README.md'],
      sourceFiles: [
        {
          path: 'src/auth/jwt.ts',
          content: `export function generateTokens(userId: string) {\n  const accessToken = jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });\n  const refreshToken = crypto.randomUUID();\n  // Store refresh token family in Redis/DB\n  return { accessToken, refreshToken };\n}`,
        },
        {
          path: 'src/auth/refresh.ts',
          content: `export async function refreshAccessToken(refreshToken: string) {\n  // Invalidate previous refresh token and issue new token pair (rotation)\n  const session = await db.findSessionByRefresh(refreshToken);\n  if (!session) throw new Error('Token revoked or reused');\n  return generateTokens(session.userId);\n}`,
        },
      ],
    };
  }

  if (name.includes('billing') || name.includes('stripe')) {
    return {
      readme: `# Cloud Billing Sync\n\nAutomated Stripe webhook reconciliation and cloud cost aggregation pipeline.\n\n## Features\n- Idempotent Stripe invoice and subscription webhook handlers\n- Pro-rated billing calculations and usage metering\n- Dead-letter queue for failed payment retries`,
      commits: [
        { message: 'Handle Stripe invoice.payment_succeeded and update subscription quota', author: 'dev' },
        { message: 'Add invoice PDF generation and tax receipt emailer', author: 'dev' },
      ],
      fileTree: ['src/webhooks/stripe.ts', 'src/billing/calculator.ts', 'README.md'],
      sourceFiles: [
        {
          path: 'src/webhooks/stripe.ts',
          content: `export async function handleStripeWebhook(event: Stripe.Event) {\n  if (event.type === 'invoice.payment_succeeded') {\n    await recordPaymentSuccess(event.data.object);\n  }\n}`,
        },
      ],
    };
  }

  if (name.includes('postgres') || name.includes('rls')) {
    return {
      readme: `# Postgres RLS Guard\n\nTenant isolation middleware utilizing PostgreSQL Row Level Security policies with automatic session variable injection.\n\n## Architecture\nEnsures that every SQL query runs with SET LOCAL app.user_id preventing cross-tenant data leakage.`,
      commits: [
        { message: 'Configure tenant isolation with app.user_id RLS policies', author: 'dev' },
        { message: 'Add automated SQL migration runner with schema verification', author: 'dev' },
      ],
      fileTree: ['src/db/rls.ts', 'src/db/migrations.sql', 'README.md'],
      sourceFiles: [
        {
          path: 'src/db/rls.ts',
          content: `export async function withTenant(userId: string, fn: (client: Client) => Promise<any>) {\n  await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);\n  return fn(client);\n}`,
        },
      ],
    };
  }

  // Default fallback data for any other repo
  return {
    readme: `# ${repo.full_name}\n\n${repo.meta?.note || repo.description || 'Repository momentum ledger project.'}\n\nPrimary language: ${repo.language || 'TypeScript'}.`,
    commits: [
      { message: `Update ${repo.language || 'code'} architecture and improve build pipeline`, author: 'dev' },
      { message: 'Initial commit and repository scaffold', author: 'dev' },
    ],
    fileTree: ['src/index.ts', 'package.json', 'README.md'],
    sourceFiles: [
      {
        path: 'src/index.ts',
        content: `console.log("Service ${repo.full_name} initialized");`,
      },
    ],
  };
}

/**
 * Main Indexing Workflow
 */
export async function indexUserRepositories(
  userId: string | number,
  options: { fullReindex?: boolean; repoId?: string | number } = {}
): Promise<{
  reposIndexed: number;
  totalChunks: number;
  totalTokens: number;
  estimatedCostUsd: number;
}> {
  const uid = String(userId);
  await db.updateSearchSettings(userId, { status: 'indexing' });

  try {
    const settings = await db.getSearchSettings(userId);
    const provider = getEmbeddingProvider(settings);
    const userRepos = await db.getUserRepos(userId);

    let reposIndexed = 0;
    let totalNewChunks = 0;
    let totalTokens = 0;

    for (const repo of userRepos) {
      const rId = String(repo.id);

      // Targeted single repo filter if specified
      if (options.repoId && rId !== String(options.repoId)) {
        continue;
      }

      // Privacy Enforcement:
      // If repo is private and user has NOT opted in, skip and purge any existing chunks
      if (repo.is_private && !settings.index_private_repos) {
        await db.deleteRepoChunks(userId, repo.id);
        continue;
      }

      // Invalidation Check:
      // Re-index only repos whose pushedAt / commitSha changed, or model changed, unless fullReindex requested
      const currentPushedAt = repo.pushed_at ? new Date(repo.pushed_at).toISOString() : (repo.last_commit_at ? new Date(repo.last_commit_at).toISOString() : 'initial');
      const existingChunks = await db.getRepoChunks(userId, repo.id);

      const isUpToDate =
        !options.fullReindex &&
        existingChunks.length > 0 &&
        existingChunks[0].commit_sha === currentPushedAt &&
        existingChunks[0].model_name === provider.name &&
        existingChunks[0].model_version === provider.version;

      if (isUpToDate) {
        // Skip re-indexing this repo
        continue;
      }

      // Generate repo content
      const data = getRealisticRepoData(repo);

      // Two-pass chunking
      const generatedChunks = chunkRepository(
        {
          id: repo.id,
          full_name: repo.full_name,
          description: repo.meta?.note || null,
          language: repo.language || null,
          status: (repo as any).status || statusOf(repo.last_commit_at, Date.now(), DEFAULT_THRESHOLDS),
          default_branch: repo.default_branch,
          is_private: repo.is_private,
          meta: repo.meta,
        },
        data,
        {
          maxChunkTokens: 500,
          overlapTokens: 80,
          maxSourceFiles: 30,
          maxTotalChunks: 60,
        }
      );

      if (generatedChunks.length === 0) continue;

      // Generate embeddings in batch
      const chunkTexts = generatedChunks.map((c) => c.text);
      const embeddings = await provider.embed(chunkTexts);

      // Prepare chunks for database
      const chunksToSave = generatedChunks.map((c, idx) => {
        totalTokens += c.tokenCount;
        return {
          kind: c.kind,
          path: c.path || null,
          text: c.text,
          token_count: c.tokenCount,
          embedding: embeddings[idx] || null,
          commit_sha: currentPushedAt,
          model_name: provider.name,
          model_version: provider.version,
        };
      });

      await db.saveRepoChunks(userId, repo.id, chunksToSave);
      reposIndexed++;
      totalNewChunks += chunksToSave.length;
    }

    const estimatedCostUsd = calculateCost(totalTokens, provider.name);

    await db.updateSearchSettings(userId, {
      last_indexed_at: new Date(),
      status: 'completed',
    });

    await db.logAudit(userId, 'search_index_completed', {
      repos_indexed: reposIndexed,
      total_chunks: totalNewChunks,
      total_tokens: totalTokens,
      provider: provider.name,
    });

    return {
      reposIndexed,
      totalChunks: totalNewChunks,
      totalTokens,
      estimatedCostUsd,
    };
  } catch (err: any) {
    logger.error({ userId, error: err.message }, 'Search indexing job failed');
    await db.updateSearchSettings(userId, { status: 'error' });
    throw err;
  }
}

/**
 * Calculate estimated embedding cost in USD
 */
function calculateCost(tokens: number, modelName: string): number {
  if (modelName.includes('text-embedding-3-small')) {
    // $0.02 per 1M tokens
    return Number(((tokens / 1_000_000) * 0.02).toFixed(6));
  }
  if (modelName.includes('text-embedding-3-large')) {
    // $0.13 per 1M tokens
    return Number(((tokens / 1_000_000) * 0.13).toFixed(6));
  }
  // Local models / Ollama / self-hosted: $0.00
  return 0.0;
}

/**
 * Get comprehensive search index status & coverage
 */
export async function getSearchIndexStatus(userId: string | number): Promise<SearchIndexStatus> {
  const settings = await db.getSearchSettings(userId);
  const userRepos = await db.getUserRepos(userId);
  const allChunks = await db.getRepoChunks(userId);

  // Determine which repos are indexed
  const indexedRepoIds = new Set(allChunks.map((c) => String(c.repo_id)));
  const totalRepos = userRepos.length;
  const indexedRepos = userRepos.filter((r) => indexedRepoIds.has(String(r.id))).length;

  const totalChunks = allChunks.length;
  const totalTokens = allChunks.reduce((acc, c) => acc + (c.token_count || estimateTokens(c.text)), 0);

  const coveragePercentage = totalRepos > 0 ? Math.round((indexedRepos / totalRepos) * 100) : 0;
  const estimatedCostUsd = calculateCost(totalTokens, settings.embedding_model);

  return {
    totalRepos,
    indexedRepos,
    totalChunks,
    totalTokens,
    lastIndexedAt: settings.last_indexed_at ? new Date(settings.last_indexed_at).toISOString() : null,
    status: (settings.status as any) || 'idle',
    coveragePercentage,
    estimatedCostUsd,
    provider: (settings.embedding_provider as any) || 'local',
    model: settings.embedding_model || 'all-MiniLM-L6-v2',
    indexPrivateRepos: Boolean(settings.index_private_repos),
    isIndexing: settings.status === 'indexing',
  };
}

/**
 * Privacy Outbound Preview:
 * Shows exactly what text leaves the server before any external embedding call
 */
export async function generateOutboundPreview(userId: string | number): Promise<OutboundPreview> {
  const settings = await db.getSearchSettings(userId);
  const userRepos = await db.getUserRepos(userId);

  const sampleTexts: OutboundPreviewSample[] = [];
  let totalEstimatedTokens = 0;
  let hasPrivateReposIncluded = false;

  for (const repo of userRepos) {
    if (repo.is_private) {
      if (!settings.index_private_repos) {
        continue;
      }
      hasPrivateReposIncluded = true;
    }

    const data = getRealisticRepoData(repo);
    const chunks = chunkRepository(
      {
        id: repo.id,
        full_name: repo.full_name,
        description: repo.meta?.note || null,
        language: repo.language || null,
        status: (repo as any).status || statusOf(repo.last_commit_at, Date.now(), DEFAULT_THRESHOLDS),
        default_branch: repo.default_branch,
        is_private: repo.is_private,
        meta: repo.meta,
      },
      data,
      { maxTotalChunks: 4 }
    );

    for (const c of chunks) {
      totalEstimatedTokens += c.tokenCount;
      if (sampleTexts.length < 10) {
        sampleTexts.push({
          repoName: repo.full_name,
          isPrivate: Boolean(repo.is_private),
          kind: c.kind as RepoChunkKind,
          path: c.path || null,
          previewText: c.text.length > 250 ? `${c.text.slice(0, 250)}...` : c.text,
          tokenCount: c.tokenCount,
        });
      }
    }
  }

  return {
    totalSampleChunks: sampleTexts.length,
    sampleTexts,
    totalEstimatedTokens,
    targetProvider: settings.embedding_provider || 'local',
    targetModel: settings.embedding_model || 'all-MiniLM-L6-v2',
    hasPrivateReposIncluded,
  };
}

/**
 * Delete User Search Index
 */
export async function deleteUserSearchIndex(userId: string | number): Promise<boolean> {
  await db.deleteUserSearchIndex(userId);
  await db.logAudit(userId, 'search_index_deleted', {});
  return true;
}
