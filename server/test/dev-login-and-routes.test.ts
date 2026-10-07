import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Dev Login & End-to-End API Route Tests', () => {
  it('GET /api/me returns 401 Unauthorized before login', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('POST /auth/dev-login creates session, then GET /api/me returns 200 with user profile and installation state', async () => {
    // 1. Dev login
    const loginRes = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.ok).toBe(true);
    expect(loginRes.body.user.login).toBe('dev-user');

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // 2. GET /api/me with session cookie
    const meRes = await request(app)
      .get('/api/me')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(meRes.status).toBe(200);
    expect(meRes.body.login).toBe('dev-user');
    expect(meRes.body.user.login).toBe('dev-user');
    expect(typeof meRes.body.id).toBe('string');
    expect(typeof meRes.body.hasInstallation).toBe('boolean');

    // 3. GET /api/repos with session cookie
    const reposRes = await request(app)
      .get('/api/repos')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(reposRes.status).toBe(200);
    expect(Array.isArray(reposRes.body.repos)).toBe(true);
    expect(reposRes.body.repos.length).toBeGreaterThan(0);

    const firstRepo = reposRes.body.repos[0];

    // 4. PATCH /api/repos/:id/meta
    const patchMetaRes = await request(app)
      .patch(`/api/repos/${firstRepo.id}/meta`)
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        label: 'Production Tool',
        decision: 'keep',
        note: 'Validated by integration test suite',
      });

    expect(patchMetaRes.status).toBe(200);
    expect(patchMetaRes.body.ok).toBe(true);
    expect(patchMetaRes.body.meta.label).toBe('Production Tool');
    expect(patchMetaRes.body.meta.decision).toBe('keep');
    expect(patchMetaRes.body.meta.note).toBe('Validated by integration test suite');

    // 5. PATCH /api/settings (valid update)
    const patchSettingsRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        active_days: 10,
        cooling_days: 20,
        stale_days: 45,
        theme: 'dark',
      });

    expect(patchSettingsRes.status).toBe(200);
    expect(patchSettingsRes.body.settings.active_days).toBe(10);
    expect(patchSettingsRes.body.settings.cooling_days).toBe(20);
    expect(patchSettingsRes.body.settings.stale_days).toBe(45);
    expect(patchSettingsRes.body.settings.theme).toBe('dark');

    // 6. PATCH /api/settings (invalid thresholds: stale <= cooling)
    const invalidSettingsRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        active_days: 25,
        cooling_days: 20,
        stale_days: 15,
      });

    expect(invalidSettingsRes.status).toBe(400);
    expect(invalidSettingsRes.body.error).toBe('Threshold Error');

    // 7. POST /auth/logout
    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(logoutRes.status).toBe(200);

    // 8. GET /api/me after logout -> 401
    const meAfterLogout = await request(app)
      .get('/api/me')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(meAfterLogout.status).toBe(401);
  });
});
