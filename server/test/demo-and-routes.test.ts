import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { memoryDb } from '../src/db/index.js';
import { hashToken } from '../src/auth/session.js';

describe('Demo Mode & Route Quality Gates', () => {
  beforeEach(() => {
    memoryDb.clear();
  });

  it('verifies /health endpoint returns status ok and service information', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('repopulse-api');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('allows demo login in non-production mode and seeds demo repos', async () => {
    const res = await request(app)
      .post('/auth/demo-login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ username: 'test-architect' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.login).toBe('test-architect');

    // Extract session cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Verify authenticated request works with the cookie
    const meRes = await request(app)
      .get('/api/me')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.login).toBe('test-architect');
  });

  it('rejects demo login with 403 Forbidden in production environment', async () => {
    const originalEnv = env.NODE_ENV;
    try {
      (env as any).NODE_ENV = 'production';
      const res = await request(app)
        .post('/auth/demo-login')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ username: 'demo-hacker' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('Demo login is disabled in production');
    } finally {
      (env as any).NODE_ENV = originalEnv;
    }
  });

  it('validates settings update constraints', async () => {
    const user = memoryDb.createUser({
      github_user_id: 999,
      login: 'settings-tester',
    });
    const token = 'valid_session_token_32_characters_for_settings';
    memoryDb.createSession({
      id_hash: hashToken(token),
      user_id: user.id,
      expires_at: new Date(Date.now() + 864e5),
    });

    // Valid update
    const validRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', [`sid=${token}`])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ active_days: 10, cooling_days: 20, stale_days: 45, theme: 'dark' });

    expect(validRes.status).toBe(200);
    expect(validRes.body.settings.active_days).toBe(10);
    expect(validRes.body.settings.theme).toBe('dark');

    // Invalid update (stale <= cooling)
    const invalidRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', [`sid=${token}`])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ active_days: 30, cooling_days: 20, stale_days: 10 });

    expect(invalidRes.status).toBe(400);
  });

  it('rejects invalid GitHub Personal Access Token gracefully with 401', async () => {
    const res = await request(app)
      .post('/auth/token-login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ token: 'ghp_invalid_mock_token_12345' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication Failed');
  });

  it('allows disconnecting Personal Access Token via DELETE /api/token', async () => {
    const user = memoryDb.createUser({
      github_user_id: 888,
      login: 'pat-tester',
    });
    const sessionToken = 'pat_tester_session_token_32_characters';
    memoryDb.createSession({
      id_hash: hashToken(sessionToken),
      user_id: user.id,
      expires_at: new Date(Date.now() + 864e5),
    });

    const delRes = await request(app)
      .delete('/api/token')
      .set('Cookie', [`sid=${sessionToken}`])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);
    expect(delRes.body.message).toContain('disconnected');
  });
});

