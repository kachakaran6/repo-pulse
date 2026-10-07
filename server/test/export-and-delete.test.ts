import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { memoryDb } from '../src/db/index.js';
import { hashToken } from '../src/auth/session.js';

describe('Data Export & Account Deletion (P6 Acceptance)', () => {
  beforeEach(() => {
    memoryDb.clear();
  });

  it('exports complete user data as JSON format with all metadata and activities', async () => {
    const user = memoryDb.createUser({
      github_user_id: 401,
      login: 'exporter',
      name: 'Export User',
    });

    const repo = memoryDb.upsertRepo({
      user_id: user.id,
      github_repo_id: 6001,
      full_name: 'exporter/great-app',
      is_private: false,
      last_commit_at: new Date().toISOString(),
    });

    memoryDb.upsertRepoMeta(repo.id, user.id, {
      label: 'SaaS',
      decision: 'keep',
      note: 'Key milestone achieved',
    });

    memoryDb.upsertActivity(repo.id, user.id, '2026-10-06', 4);

    const token = 'exporter_session_token_32_characters_long_str';
    memoryDb.createSession({
      id_hash: hashToken(token),
      user_id: user.id,
      expires_at: new Date(Date.now() + 864e5),
    });

    const res = await request(app)
      .get('/api/export')
      .set('Cookie', [`sid=${token}`])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.user.login).toBe('exporter');
    expect(res.body.repositories).toHaveLength(1);
    expect(res.body.repositories[0].metadata.label).toBe('SaaS');
    expect(res.body.repositories[0].activity).toHaveLength(1);
  });

  it('permanently deletes account and all associated tenant rows (leaving zero orphan rows)', async () => {
    // 1. Create target User 1
    const user1 = memoryDb.createUser({ github_user_id: 501, login: 'to-delete' });
    const repo1 = memoryDb.upsertRepo({ user_id: user1.id, github_repo_id: 7001, full_name: 'to-delete/app' });
    memoryDb.upsertRepoMeta(repo1.id, user1.id, { label: 'Old', decision: 'retire' });
    memoryDb.upsertActivity(repo1.id, user1.id, '2026-10-05', 2);
    const token1 = 'delete_user_session_token_32_chars_length_123';
    memoryDb.createSession({ id_hash: hashToken(token1), user_id: user1.id, expires_at: new Date(Date.now() + 864e5) });

    // 2. Create neighbor User 2 (must not be touched!)
    const user2 = memoryDb.createUser({ github_user_id: 502, login: 'retained-user' });
    const repo2 = memoryDb.upsertRepo({ user_id: user2.id, github_repo_id: 7002, full_name: 'retained-user/vital-service' });

    // 3. User 1 invokes DELETE /api/account
    const deleteRes = await request(app)
      .delete('/api/account')
      .set('Cookie', [`sid=${token1}`])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.ok).toBe(true);

    // 4. Verify ZERO residual rows remain for User 1
    expect(memoryDb.findUserById(user1.id)).toBeNull();
    expect(memoryDb.getUserRepos(user1.id)).toHaveLength(0);
    expect(memoryDb.sessions.has(hashToken(token1))).toBe(false);

    // 5. Verify User 2 and repo2 remain completely intact!
    expect(memoryDb.findUserById(user2.id)).not.toBeNull();
    expect(memoryDb.getUserRepos(user2.id)).toHaveLength(1);
    expect(memoryDb.getUserRepos(user2.id)[0].full_name).toBe('retained-user/vital-service');
  });
});
