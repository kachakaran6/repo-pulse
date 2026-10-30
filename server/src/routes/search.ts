/**
 * Semantic & Hybrid Search Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { performHybridSearch, findSimilarRepos } from '../search/search.js';
import {
  getSearchIndexStatus,
  generateOutboundPreview,
  deleteUserSearchIndex,
  indexUserRepositories,
} from '../search/indexer.js';
import { enqueueIndexingJob } from '../search/queue.js';
import { sendError } from '../http/errors.js';
import type { SearchScope } from '../search/types.js';

export const searchRouter = Router();

// Require authentication for all search endpoints
searchRouter.use(requireAuth);

/**
 * GET /search & GET /api/search
 * Hybrid search across repos, code, notes, and decisions using tsvector + vector similarity + RRF
 */
searchRouter.get(['/', '/search'], async (req, res) => {
  const q = String(req.query.q || '');
  const scope = (String(req.query.scope || 'all') as SearchScope);
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 30;

  try {
    const searchResults = await performHybridSearch(req.user!.id, q, scope, { limit });
    res.json(searchResults);
  } catch (err: any) {
    sendError(res, 500, 'Search Error', err.message);
  }
});

/**
 * GET /api/search/status
 * Returns index coverage, last indexed timestamp, and cost estimate
 */
searchRouter.get(['/search/status', '/status'], async (req, res) => {
  try {
    const status = await getSearchIndexStatus(req.user!.id);
    res.json(status);
  } catch (err: any) {
    sendError(res, 500, 'Index Status Error', err.message);
  }
});

/**
 * POST /api/search/index
 * Enqueue or trigger repository indexing job
 */
searchRouter.post(['/search/index', '/index'], async (req, res) => {
  const fullReindex = req.body?.fullReindex === true || req.query.full === 'true';
  const wait = req.query.wait === 'true';

  try {
    if (wait) {
      // Synchronous run (useful for tests or immediate wait)
      const result = await indexUserRepositories(req.user!.id, { fullReindex });
      const status = await getSearchIndexStatus(req.user!.id);
      res.json({ ok: true, result, status });
    } else {
      const job = await enqueueIndexingJob(req.user!.id, { fullReindex });
      res.json({ ok: true, job });
    }
  } catch (err: any) {
    sendError(res, 500, 'Indexing Failed', err.message);
  }
});

/**
 * DELETE /api/search/index
 * Privacy control: Delete my index
 */
searchRouter.delete(['/search/index', '/index'], async (req, res) => {
  try {
    await deleteUserSearchIndex(req.user!.id);
    const status = await getSearchIndexStatus(req.user!.id);
    res.json({ ok: true, message: 'Search index deleted successfully.', status });
  } catch (err: any) {
    sendError(res, 500, 'Index Deletion Error', err.message);
  }
});

/**
 * GET /api/search/preview-outbound
 * Privacy control: Preview exactly what text leaves the server before external embedding calls
 */
searchRouter.get(['/search/preview-outbound', '/preview-outbound'], async (req, res) => {
  try {
    const preview = await generateOutboundPreview(req.user!.id);
    res.json(preview);
  } catch (err: any) {
    sendError(res, 500, 'Preview Error', err.message);
  }
});

const patchSearchSettingsSchema = z.object({
  index_private_repos: z.boolean().optional(),
  embedding_provider: z.enum(['local', 'openai', 'ollama', 'custom']).optional(),
  embedding_api_key: z.string().max(200).nullable().optional(),
  embedding_model: z.string().max(100).optional(),
  embedding_endpoint: z.string().max(300).nullable().optional(),
});

/**
 * PATCH /api/search/settings
 * Update embedding provider, model, API keys, and privacy opt-in
 */
searchRouter.patch(['/search/settings', '/settings'], async (req, res) => {
  const parsed = patchSearchSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'Invalid Settings', 'Failed settings validation.', parsed.error.format());
    return;
  }

  try {
    const updated = await db.updateSearchSettings(req.user!.id, parsed.data);
    await db.logAudit(req.user!.id, 'search_settings_updated', { updates: parsed.data });
    res.json({ ok: true, settings: updated });
  } catch (err: any) {
    sendError(res, 500, 'Update Settings Error', err.message);
  }
});

/**
 * GET /api/repos/:id/similar
 * Returns nearest neighbor repositories for duplicate detection and drawer view
 */
searchRouter.get(['/repos/:id/similar', '/search/similar/:id'], async (req, res) => {
  const repoId = String(req.params.id);
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 10) : 5;

  try {
    const similar = await findSimilarRepos(req.user!.id, repoId, limit);
    res.json(similar);
  } catch (err: any) {
    sendError(res, 500, 'Similar Repos Error', err.message);
  }
});
