import { describe, it, expect, beforeAll } from 'vitest';
import { db, authPool, withTenant } from '../src/db/index.js';
import { hashToken } from '../src/auth/session.js';
import { runUserSync } from '../src/sync/engine.js';

let isDbAvailable = false;

describe('Real PostgreSQL Integration & RLS Isolation Tests', () => {
  beforeAll(async () => {
    try {
      await authPool.query('SELECT 1');
      isDbAvailable = true;
      // Ensure clean state before tests
      await authPool.query('DELETE FROM users WHERE login IN ($1, $2, $3, $4)', [
        'test-alice-rls',
        'test-bob-rls',
        'test-sync-preserve',
        'test-wipe-user',
      ]);
    } catch {
      isDbAvailable = false;
    }
  });

  it('upserts user twice giving exactly one row and updating login/avatar on rename', async () => {
    if (!isDbAvailable) return;
    const ghUserId = '888111222';

    // First login
    const user1 = await db.upsertUser({
      github_user_id: ghUserId,
      login: 'alice-original',
      name: 'Alice Developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/888111222?v=4',
    });

    expect(user1).toBeDefined();
    expect(user1.login).toBe('alice-original');

    // Second login after user renamed on GitHub
    const user2 = await db.upsertUser({
      github_user_id: ghUserId,
      login: 'alice-renamed',
      name: 'Alice Senior Engineer',
      avatar_url: 'https://avatars.githubusercontent.com/u/888111222?v=4&updated=1',
    });

    expect(String(user2.id)).toBe(String(user1.id));
    expect(user2.login).toBe('alice-renamed');

    // Check count in database
    const countRes = await authPool.query(
      'SELECT count(*) FROM users WHERE github_user_id = $1',
      [ghUserId]
    );
    expect(Number(countRes.rows[0].count)).toBe(1);

    // Cleanup
    await db.deleteUserAccount(user1.id);
  });

  it('proves strict Postgres RLS cross-tenant isolation between User A and User B', async () => {
    if (!isDbAvailable) return;
    // 1. Create User A (Alice)
    const alice = await db.upsertUser({
      github_user_id: '777001',
      login: 'test-alice-rls',
      name: 'Alice',
    });

    const aliceRepo = await db.upsertRepo({
      user_id: alice.id,
      github_repo_id: '99001',
      full_name: 'test-alice-rls/private-engine',
      is_private: true,
      last_commit_at: new Date(),
    });

    await db.upsertRepoMeta(aliceRepo.id, alice.id, {
      label: 'Critical SaaS',
      note: 'Alice confidential architectural note',
      decision: 'keep',
    });

    // 2. Create User B (Bob)
    const bob = await db.upsertUser({
      github_user_id: '777002',
      login: 'test-bob-rls',
      name: 'Bob',
    });

    const bobRepo = await db.upsertRepo({
      user_id: bob.id,
      github_repo_id: '99002',
      full_name: 'test-bob-rls/open-tool',
      is_private: false,
      last_commit_at: new Date(),
    });

    await db.upsertRepoMeta(bobRepo.id, bob.id, {
      label: 'Utility',
      note: 'Bob tool note',
      decision: 'pause',
    });

    // 3. Test RLS Isolation: Bob executes a raw SELECT * FROM repos with his tenant context
    const bobRepos = await withTenant(bob.id, async (client) => {
      const res = await client.query('SELECT * FROM repos');
      return res.rows;
    });

    // Bob can only see his own repo
    expect(bobRepos).toHaveLength(1);
    expect(bobRepos[0].full_name).toBe('test-bob-rls/open-tool');
    const hasAliceRepo = bobRepos.some((r) => r.full_name === 'test-alice-rls/private-engine');
    expect(hasAliceRepo).toBe(false);

    // 4. Test RLS Isolation: Bob attempts to maliciously UPDATE Alice's repo_meta by ID
    const maliciousUpdateResult = await withTenant(bob.id, async (client) => {
      const res = await client.query(
        `UPDATE repo_meta SET note = 'Hacked by Bob' WHERE repo_id = $1`,
        [aliceRepo.id]
      );
      return res.rowCount;
    });

    // RLS blocks access, so 0 rows are updated
    expect(maliciousUpdateResult).toBe(0);

    // Verify Alice's note was never altered
    const aliceRepos = await withTenant(alice.id, async (client) => {
      const res = await client.query(
        `SELECT m.note, m.decision FROM repo_meta m WHERE m.repo_id = $1`,
        [aliceRepo.id]
      );
      return res.rows[0];
    });
    expect(aliceRepos.note).toBe('Alice confidential architectural note');
    expect(aliceRepos.decision).toBe('keep');

    // Cleanup
    await db.deleteUserAccount(alice.id);
    await db.deleteUserAccount(bob.id);
  });

  it('guarantees sync engine upserts repositories and NEVER overwrites repo_meta', async () => {
    if (!isDbAvailable) return;
    const user = await db.upsertUser({
      github_user_id: '666111',
      login: 'test-sync-preserve',
    });

    // 1. Initial sync
    const firstSync = await runUserSync(user.id);
    expect(firstSync.status).toBe('success');
    expect(firstSync.reposRead).toBeGreaterThan(0);

    const userRepos = await db.getUserRepos(user.id);
    const targetRepo = userRepos[0];
    expect(targetRepo).toBeDefined();

    // 2. User sets custom label, goal date, note, decision
    await db.upsertRepoMeta(targetRepo.id, user.id, {
      label: 'Production SaaS',
      goal_date: '2026-12-31',
      note: 'Do not modify this metadata during subsequent syncs',
      decision: 'keep',
    });

    // 3. Run sync second and third times
    const secondSync = await runUserSync(user.id);
    expect(secondSync.status).toBe('success');

    const thirdSync = await runUserSync(user.id);
    expect(thirdSync.status).toBe('success');

    // 4. Verify repo_meta is completely preserved
    const refreshedRepos = await db.getUserRepos(user.id);
    const refreshedTarget = refreshedRepos.find((r) => String(r.id) === String(targetRepo.id));

    expect(refreshedTarget).toBeDefined();
    expect(refreshedTarget?.meta.label).toBe('Production SaaS');
    expect(refreshedTarget?.meta.goal_date).toBe('2026-12-31');
    expect(refreshedTarget?.meta.note).toBe('Do not modify this metadata during subsequent syncs');
    expect(refreshedTarget?.meta.decision).toBe('keep');

    // Cleanup
    await db.deleteUserAccount(user.id);
  });

  it('cascades account deletion and leaves ZERO orphan rows across all tables', async () => {
    if (!isDbAvailable) return;
    // 1. Create User to delete
    const user = await db.upsertUser({
      github_user_id: '555111',
      login: 'test-wipe-user',
    });

    // Add session, repo, activity, meta, sync run, audit log
    const token = 'wipe_user_token_32_characters_length_long_123';
    await db.createSession({
      id_hash: hashToken(token),
      user_id: user.id,
      expires_at: new Date(Date.now() + 864e5),
    });

    const syncRes = await runUserSync(user.id);
    expect(syncRes.status).toBe('success');

    // 2. Execute account deletion
    const deleteResult = await db.deleteUserAccount(user.id);
    expect(deleteResult).toBe(true);

    // 3. Verify ZERO rows remain in any table for this user
    const [
      usersCount,
      sessionsCount,
      reposCount,
      activityCount,
      metaCount,
      settingsCount,
      syncRunsCount,
      auditCount,
    ] = await Promise.all([
      authPool.query('SELECT count(*) FROM users WHERE id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM repos WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM repo_activity WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM repo_meta WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM settings WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM sync_runs WHERE user_id = $1', [user.id]),
      authPool.query('SELECT count(*) FROM audit_log WHERE user_id = $1', [user.id]),
    ]);

    expect(Number(usersCount.rows[0].count)).toBe(0);
    expect(Number(sessionsCount.rows[0].count)).toBe(0);
    expect(Number(reposCount.rows[0].count)).toBe(0);
    expect(Number(activityCount.rows[0].count)).toBe(0);
    expect(Number(metaCount.rows[0].count)).toBe(0);
    expect(Number(settingsCount.rows[0].count)).toBe(0);
    expect(Number(syncRunsCount.rows[0].count)).toBe(0);
    expect(Number(auditCount.rows[0].count)).toBe(0);
  });
});
