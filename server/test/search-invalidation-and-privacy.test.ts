import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/db/index.js';
import {
  indexUserRepositories,
  getSearchIndexStatus,
  generateOutboundPreview,
  deleteUserSearchIndex,
} from '../src/search/indexer.js';
import { performHybridSearch, findSimilarRepos } from '../src/search/search.js';

describe('Search Index Invalidation, Privacy Controls & API Endpoints', () => {
  let sessionCookie: string;
  let userId: string;

  beforeEach(async () => {
    // 1. Dev login to obtain authenticated tenant session
    const loginRes = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(loginRes.status).toBe(200);
    sessionCookie = loginRes.headers['set-cookie'][0];
    userId = String(loginRes.body.user.id);

    // Reset search index for clean test state
    await deleteUserSearchIndex(userId);
  });

  describe('Index Invalidation Logic', () => {
    it('indexes repositories on first run, and skips unchanged repositories on subsequent runs', async () => {
      // Step A: First index run
      const firstRun = await indexUserRepositories(userId);
      expect(firstRun.reposIndexed).toBeGreaterThan(0);
      expect(firstRun.totalChunks).toBeGreaterThan(0);

      // Verify chunks were created
      const chunksFirst = await db.getRepoChunks(userId);
      expect(chunksFirst.length).toBe(firstRun.totalChunks);

      // Step B: Second index run with no repo changes
      const secondRun = await indexUserRepositories(userId);
      // All unchanged repos are skipped
      expect(secondRun.reposIndexed).toBe(0);

      // Step C: Trigger full reindex explicitly
      const fullRun = await indexUserRepositories(userId, { fullReindex: true });
      expect(fullRun.reposIndexed).toBe(firstRun.reposIndexed);
    });

    it('re-indexes when an embedding model or version changes', async () => {
      await indexUserRepositories(userId);

      // Change configured embedding model in settings
      await db.updateSearchSettings(userId, {
        embedding_model: 'custom-new-model-v2',
      });

      // Next index run should detect model mismatch and re-index
      const reindexRun = await indexUserRepositories(userId);
      expect(reindexRun.reposIndexed).toBeGreaterThan(0);
    });
  });

  describe('Privacy Controls', () => {
    it('excludes private repositories by default, and indexes them only when opted in', async () => {
      // 1. Verify default setting is false
      const settings = await db.getSearchSettings(userId);
      expect(settings.index_private_repos).toBe(false);

      // Index with private repos excluded
      await indexUserRepositories(userId);
      const chunksNoPrivate = await db.getRepoChunks(userId);

      // Check if private repo chunks were created
      const userRepos = await db.getUserRepos(userId);
      const privateRepoIds = new Set(userRepos.filter((r) => r.is_private).map((r) => String(r.id)));

      const hasPrivateChunks = chunksNoPrivate.some((c) => privateRepoIds.has(String(c.repo_id)));
      expect(hasPrivateChunks).toBe(false);

      // 2. Opt in to index private repos
      await db.updateSearchSettings(userId, { index_private_repos: true });
      await indexUserRepositories(userId);

      const chunksWithPrivate = await db.getRepoChunks(userId);
      const hasPrivateChunksNow = chunksWithPrivate.some((c) => privateRepoIds.has(String(c.repo_id)));
      if (privateRepoIds.size > 0) {
        expect(hasPrivateChunksNow).toBe(true);
      }
    });

    it('generates outbound preview showing exact text that would leave the server', async () => {
      const preview = await generateOutboundPreview(userId);
      expect(preview.sampleTexts.length).toBeGreaterThan(0);
      expect(preview.totalEstimatedTokens).toBeGreaterThan(0);
      expect(preview.targetProvider).toBeDefined();
      expect(preview.sampleTexts[0].previewText).toBeDefined();
    });

    it('provides "delete my index" which completely wipes chunks and resets index metadata', async () => {
      await indexUserRepositories(userId);
      let chunks = await db.getRepoChunks(userId);
      expect(chunks.length).toBeGreaterThan(0);

      // Delete index
      await deleteUserSearchIndex(userId);

      chunks = await db.getRepoChunks(userId);
      expect(chunks.length).toBe(0);

      const status = await getSearchIndexStatus(userId);
      expect(status.totalChunks).toBe(0);
      expect(status.indexedRepos).toBe(0);
      expect(status.lastIndexedAt).toBeNull();
    });
  });

  describe('Hybrid Search & Similarity API Endpoints', () => {
    beforeEach(async () => {
      // Index repositories first
      await indexUserRepositories(userId, { fullReindex: true });
    });

    it('GET /search with natural-language query returns ranked results with snippets and reasons', async () => {
      // Search for code or concepts remembered by user ("JWT refresh")
      const res = await request(app)
        .get('/search?q=JWT+refresh')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.query).toBe('JWT refresh');
      expect(res.body.results.length).toBeGreaterThan(0);

      const topResult = res.body.results[0];
      expect(topResult.repoFullName).toBeDefined();
      expect(topResult.snippet).toBeDefined();
      expect(topResult.matchReason).toBeDefined();
      expect(topResult.score).toBeGreaterThan(0);

      // Verify grouped by repo output
      expect(res.body.groupedByRepo.length).toBeGreaterThan(0);
      expect(res.body.groupedByRepo[0].matches.length).toBeGreaterThan(0);
    });

    it('supports scope filtering: repos, code, notes, decisions', async () => {
      const codeRes = await request(app)
        .get('/search?q=function&scope=code')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(codeRes.status).toBe(200);
      expect(codeRes.body.results.every((r: any) => r.kind === 'source_code')).toBe(true);

      const notesRes = await request(app)
        .get('/search?q=token&scope=notes')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(notesRes.status).toBe(200);
      expect(notesRes.body.results.every((r: any) => r.kind === 'notes')).toBe(true);
    });

    it('GET /api/search/status returns coverage and cost estimate', async () => {
      const res = await request(app)
        .get('/api/search/status')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.totalRepos).toBeGreaterThan(0);
      expect(res.body.indexedRepos).toBeGreaterThan(0);
      expect(res.body.coveragePercentage).toBeGreaterThan(0);
      expect(res.body.estimatedCostUsd).toBeDefined();
    });

    it('GET /api/repos/:id/similar returns nearest neighbors with similarity scores', async () => {
      const userRepos = await db.getUserRepos(userId);
      const firstRepo = userRepos[0];

      const res = await request(app)
        .get(`/api/repos/${firstRepo.id}/similar`)
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].similarity).toBeGreaterThan(0);
        expect(res.body[0].sharedSignals).toBeDefined();
      }
    });

    it('DELETE /api/search/index deletes index via API', async () => {
      const res = await request(app)
        .delete('/api/search/index')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const statusRes = await request(app)
        .get('/api/search/status')
        .set('Cookie', sessionCookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(statusRes.body.totalChunks).toBe(0);
    });
  });
});
