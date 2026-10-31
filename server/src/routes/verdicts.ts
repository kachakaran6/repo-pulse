/**
 * Personalized Verdict Learning API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { verdictLearningService } from '../ml/service.js';
import { db } from '../db/index.js';
import { sendError } from '../http/errors.js';
import { parseRouteId } from '../http/validate.js';

export const verdictsRouter = Router();

verdictsRouter.use(requireAuth);

/**
 * GET /api/verdicts/learning
 * Returns user personalization learning statistics and agreement rate
 */
verdictsRouter.get('/learning', async (req, res) => {
  const userId = req.user!.id;
  const stats = await verdictLearningService.getLearningStats(userId);
  res.json(stats);
});

/**
 * POST /api/verdicts/reset
 * Resets user personalization model and agreement tracking back to cold-start rules
 */
verdictsRouter.post('/reset', async (req, res) => {
  const userId = req.user!.id;
  const stats = await verdictLearningService.resetPersonalization(userId);
  res.json({ ok: true, stats });
});

/**
 * POST /api/verdicts/train
 * Triggers model training on historical decisions
 */
verdictsRouter.post('/train', async (req, res) => {
  const userId = req.user!.id;
  const stats = await verdictLearningService.trainUserModel(userId);
  res.json({ ok: true, stats });
});

/**
 * GET /api/verdicts/history
 * Returns historical decisions logged for the user
 */
verdictsRouter.get('/history', async (req, res) => {
  const userId = req.user!.id;
  const verdicts = await db.getUserVerdicts(userId, 100);
  res.json({ verdicts });
});

const recordDecisionSchema = z.object({
  repoId: z.union([z.string(), z.number()]),
  verdict: z.enum(['keep', 'pause', 'retire']),
  suggestedVerdict: z.enum(['keep', 'pause', 'retire']).nullable().optional(),
  suggestionConfidence: z.number().nullable().optional(),
  suggestionSource: z.string().optional(),
  previousVerdict: z.enum(['keep', 'pause', 'retire']).nullable().optional(),
});

/**
 * POST /api/verdicts/decision
 * Explicit endpoint to record a decision with accuracy tracking
 */
verdictsRouter.post('/decision', async (req, res) => {
  const userId = req.user!.id;
  const parsed = recordDecisionSchema.safeParse(req.body);

  if (!parsed.success) {
    sendError(res, 400, 'Invalid Decision Payload', 'Request failed validation', parsed.error.format());
    return;
  }

  const { repoId, verdict, suggestedVerdict, suggestionConfidence, suggestionSource, previousVerdict } = parsed.data;
  const userRepos = await db.getUserRepos(userId);
  const targetRepo = userRepos.find((r: any) => String(r.id) === String(repoId));

  const record = await verdictLearningService.recordDecision(userId, repoId, verdict, {
    repo: targetRepo,
    suggestedVerdict,
    suggestionConfidence,
    suggestionSource,
    previousVerdict,
  });

  res.json({ ok: true, record });
});
