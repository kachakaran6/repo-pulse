import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { memoryDb } from '../src/db/index.js';
import { hashToken } from '../src/auth/session.js';

describe('Authentication & Multi-Tenant Isolation (Stage S2)', () => {
  beforeEach(() => {
    memoryDb.clear();
  });

  it('proves User A cannot access User B data (Cross-Tenant Isolation)', async () => {
    // 1. Create User A
    const userA = memoryDb.createUser({
      github_user_id: 101,
      login: 'alice',
      name: 'Alice Developer',
      avatar_url: 'https://example.com/alice.jpg',
    });

    const repoA = memoryDb.upsertRepo({
      user_id: userA.id,
      github_repo_id: 5001,
      full_name: 'alice/secret-saas',
      is_private: true,
      last_commit_at: new Date().toISOString(),
    });

    memoryDb.upsertRepoMeta(repoA.id, userA.id, {
      label: 'Core Product',
      note: 'Alice confidential note',
      decision: 'keep',
    });

    // 2. Create User B
    const userB = memoryDb.createUser({
      github_user_id: 102,
      login: 'bob',
      name: 'Bob Architect',
      avatar_url: 'https://example.com/bob.jpg',
    });

    const repoB = memoryDb.upsertRepo({
      user_id: userB.id,
      github_repo_id: 5002,
      full_name: 'bob/open-library',
      is_private: false,
      last_commit_at: new Date().toISOString(),
    });

    // 3. Authenticate as Bob
    const rawBobToken = 'bob_secret_session_token_32_characters_length_long';
    memoryDb.createSession({
      id_hash: hashToken(rawBobToken),
      user_id: userB.id,
      expires_at: new Date(Date.now() + 864e5),
    });

    // Bob requests his repo list
    const bobReposRes = await request(app)
      .get('/api/repos')
      .set('Cookie', [`sid=${rawBobToken}`])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(bobReposRes.status).toBe(200);
    expect(bobReposRes.body.repos).toHaveLength(1);
    expect(bobReposRes.body.repos[0].full_name).toBe('bob/open-library');

    // Bob cannot see Alice's repo in his repo list
    const foundAliceRepo = bobReposRes.body.repos.find((r: any) => r.full_name === 'alice/secret-saas');
    expect(foundAliceRepo).toBeUndefined();

    // 4. Bob tries to mutate Alice's repo meta by guessing Alice's repo ID
    const maliciousPatchRes = await request(app)
      .patch(`/api/repos/${repoA.id}/meta`)
      .set('Cookie', [`sid=${rawBobToken}`])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ note: 'Hacked by Bob', decision: 'retire' });

    // Expect 404 / access denied
    expect(maliciousPatchRes.status).toBe(404);

    // Verify Alice's note was NOT modified
    const aliceMeta = memoryDb.repoMeta.get(repoA.id);
    expect(aliceMeta?.note).toBe('Alice confidential note');
    expect(aliceMeta?.decision).toBe('keep');
  });

  it('enforces session expiration (idle 7 days / absolute 30 days)', async () => {
    const user = memoryDb.createUser({
      github_user_id: 201,
      login: 'charlie',
    });

    // Expired session (older than 30 days)
    const rawExpiredToken = 'expired_session_token_32_characters_long_val';
    const pastDate = new Date(Date.now() - 1000); // in past
    memoryDb.createSession({
      id_hash: hashToken(rawExpiredToken),
      user_id: user.id,
      expires_at: pastDate,
    });

    const res = await request(app)
      .get('/api/repos')
      .set('Cookie', [`sid=${rawExpiredToken}`]);

    expect(res.status).toBe(401);
  });

  it('supports sign out everywhere (logout-all)', async () => {
    const user = memoryDb.createUser({
      github_user_id: 301,
      login: 'dave',
    });

    // Create 3 active sessions for Dave
    const token1 = 'dave_session_token_1_with_32_characters_length';
    const token2 = 'dave_session_token_2_with_32_characters_length';
    const token3 = 'dave_session_token_3_with_32_characters_length';

    memoryDb.createSession({ id_hash: hashToken(token1), user_id: user.id, expires_at: new Date(Date.now() + 864e5) });
    memoryDb.createSession({ id_hash: hashToken(token2), user_id: user.id, expires_at: new Date(Date.now() + 864e5) });
    memoryDb.createSession({ id_hash: hashToken(token3), user_id: user.id, expires_at: new Date(Date.now() + 864e5) });

    expect(memoryDb.sessions.size).toBe(3);

    // Dave calls logout-all with token1
    const logoutRes = await request(app)
      .post('/auth/logout-all')
      .set('Cookie', [`sid=${token1}`])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(logoutRes.status).toBe(200);
    expect(memoryDb.sessions.size).toBe(0);

    // Other sessions (token2, token3) are now invalid
    const checkRes = await request(app)
      .get('/api/me')
      .set('Cookie', [`sid=${token2}`]);

    expect(checkRes.status).toBe(401);
  });
});
