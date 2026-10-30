import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Work in Progress (WIP) Limit API & Settings', () => {
  it('handles wipLimit in settings and wip_override in repo metadata', async () => {
    // 1. Dev login
    const loginRes = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // 2. GET /api/me defaults wipLimit to 5
    const meRes = await request(app)
      .get('/api/me')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(meRes.status).toBe(200);
    expect(meRes.body.settings.wipLimit).toBe(5);

    // 3. PATCH /api/settings to set wipLimit to 7
    const patchRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ wipLimit: 7 });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.settings.wipLimit).toBe(7);

    // 4. PATCH /api/settings to turn off wipLimit (null)
    const patchOffRes = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ wipLimit: null });

    expect(patchOffRes.status).toBe(200);
    expect(patchOffRes.body.settings.wipLimit).toBeNull();

    // 5. PATCH /api/settings rejects out-of-range wipLimit (< 1 or > 20)
    const patchInvalidHigh = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ wipLimit: 25 });
    expect(patchInvalidHigh.status).toBe(400);

    const patchInvalidLow = await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ wipLimit: 0 });
    expect(patchInvalidLow.status).toBe(400);

    // 6. Reset wipLimit to 5
    await request(app)
      .patch('/api/settings')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ wipLimit: 5 });

    // 7. GET /api/repos and pick a repo
    const reposRes = await request(app)
      .get('/api/repos')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(reposRes.status).toBe(200);
    const repo = reposRes.body.repos[0];
    expect(repo).toBeDefined();

    // 8. Record Keep decision with override flag
    const patchMetaRes = await request(app)
      .patch(`/api/repos/${repo.id}/meta`)
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        decision: 'keep',
        wip_override: true,
      });

    expect(patchMetaRes.status).toBe(200);
    expect(patchMetaRes.body.meta.decision).toBe('keep');
    expect(patchMetaRes.body.meta.wip_override).toBe(true);

    // 9. Fetch repos again and verify wip_override flag is included in meta
    const reposUpdatedRes = await request(app)
      .get('/api/repos')
      .set('Cookie', cookies)
      .set('X-Requested-With', 'XMLHttpRequest');

    const updatedRepo = reposUpdatedRes.body.repos.find((r: any) => String(r.id) === String(repo.id));
    expect(updatedRepo).toBeDefined();
    expect(updatedRepo.meta.decision).toBe('keep');
    expect(updatedRepo.meta.wip_override).toBe(true);
  });
});
