import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { predictWithRules } from '../src/ml/rules.js';
import { verdictLearningService } from '../src/ml/service.js';
import { db } from '../src/db/index.js';
import type { VerdictFeatures } from '../src/ml/types.js';

describe('Personalized Verdicts: Fallback Behavior & API Endpoints', () => {
  it('falls back to calibrated Pulse Score rules when cold start is active', () => {
    const features: VerdictFeatures = {
      days_since_last_commit: 3,
      twelve_week_trend: 0.4,
      age_days: 120,
      language: 'TypeScript',
      stars: 10,
      open_issues_prs: 1,
      hygiene_score: 85,
      has_finish_line: true,
      size_kb: 500,
      contributors_count: 2,
      owner_type: 'User',
      time_since_last_verdict_change_days: 30,
    };

    // Cold start with only 5 decisions logged
    const suggestion = predictWithRules(features, 5);

    expect(suggestion.verdict).toBe('keep');
    expect(suggestion.source).toBe('rule_based_cold_start');
    expect(suggestion.decisionCount).toBe(5);
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0.75);
    expect(suggestion.explanation).toContain('Suggested by Pulse Score rules');
    expect(suggestion.explanation).toContain('5/30 logged');
    expect(suggestion.contributingFeatures).toHaveLength(3);

    // Stale repo under cold start
    const staleFeatures = { ...features, days_since_last_commit: 80 };
    const staleSuggestion = predictWithRules(staleFeatures, 5);
    expect(staleSuggestion.verdict).toBe('retire');
    expect(staleSuggestion.source).toBe('rule_based_cold_start');
  });

  it('interacts with verdict learning API endpoints end-to-end', async () => {
    // 1. Dev login
    const loginRes = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // 2. Initial learning stats should report cold start
    const initialStatsRes = await request(app)
      .get('/api/verdicts/learning')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(initialStatsRes.status).toBe(200);
    expect(initialStatsRes.body).toHaveProperty('status');
    expect(initialStatsRes.body).toHaveProperty('agreementRate');
    expect(initialStatsRes.body.minDecisionsRequired).toBe(30);

    // 3. GET /api/repos returns repos enriched with suggested_verdict
    const reposRes = await request(app)
      .get('/api/repos')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(reposRes.status).toBe(200);
    expect(Array.isArray(reposRes.body.repos)).toBe(true);

    if (reposRes.body.repos.length > 0) {
      const firstRepo = reposRes.body.repos[0];
      expect(firstRepo.suggested_verdict).toBeDefined();
      expect(['keep', 'pause', 'retire']).toContain(firstRepo.suggested_verdict.verdict);
      expect(firstRepo.suggested_verdict.confidence).toBeGreaterThan(0);
      expect(firstRepo.suggested_verdict.explanation).toBeDefined();

      // Test GET /api/repos/:id/suggested-verdict endpoint
      const singleSuggestedRes = await request(app)
        .get(`/api/repos/${firstRepo.id}/suggested-verdict`)
        .set('Cookie', cookies)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(singleSuggestedRes.status).toBe(200);
      expect(singleSuggestedRes.body.suggestion).toBeDefined();
      expect(singleSuggestedRes.body.features).toBeDefined();

      // 4. Update repo meta decision (agreeing with suggestion)
      const agreedVerdict = firstRepo.suggested_verdict.verdict;
      const patchMetaRes = await request(app)
        .patch(`/api/repos/${firstRepo.id}/meta`)
        .set('Cookie', cookies)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ decision: agreedVerdict });

      expect(patchMetaRes.status).toBe(200);
      expect(patchMetaRes.body.meta.decision).toBe(agreedVerdict);
    }

    // 5. Verify stats updated
    const updatedStatsRes = await request(app)
      .get('/api/verdicts/learning')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(updatedStatsRes.status).toBe(200);
    expect(updatedStatsRes.body.decisionCount).toBeGreaterThanOrEqual(1);

    // 6. Reset personalization
    const resetRes = await request(app)
      .post('/api/verdicts/reset')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.ok).toBe(true);
    expect(resetRes.body.stats.status).toBe('cold_start');
    expect(resetRes.body.stats.agreementCount).toBe(0);
  });

  it('supports confidence sorting on GET /api/repos?sort=confidence', async () => {
    const loginRes = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');

    const cookies = loginRes.headers['set-cookie'];

    const sortedRes = await request(app)
      .get('/api/repos?sort=confidence')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(sortedRes.status).toBe(200);
    const repos = sortedRes.body.repos;
    if (repos.length >= 2) {
      for (let i = 1; i < repos.length; i++) {
        const prevConf = repos[i - 1]?.suggested_verdict?.confidence ?? 0;
        const curConf = repos[i]?.suggested_verdict?.confidence ?? 0;
        expect(prevConf).toBeGreaterThanOrEqual(curConf);
      }
    }
  });
});
