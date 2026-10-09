import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { db } from '../src/db/index.js';
import { hashToken } from '../src/auth/session.js';
import { renderCardSvg } from '../src/routes/share.js';

describe('W6: Share Cards and Snapshots', () => {
  let userA: any;
  let userB: any;
  let userASessionCookie: string;
  let userBSessionCookie: string;

  beforeEach(async () => {
    // Reset test memory store
    userA = await db.upsertUser({
      github_user_id: '888001',
      login: 'alice-coder',
      avatar_url: 'https://avatars.githubusercontent.com/u/888001',
    });

    userB = await db.upsertUser({
      github_user_id: '888002',
      login: 'bob-reviewer',
      avatar_url: 'https://avatars.githubusercontent.com/u/888002',
    });

    // Create session for user A
    const rawTokenA = crypto.randomBytes(32).toString('hex');
    const hashA = hashToken(rawTokenA);
    await db.createSession({
      id_hash: hashA,
      user_id: userA.id,
      expires_at: new Date(Date.now() + 864e5),
    });
    userASessionCookie = `sid=${rawTokenA}`;

    // Create session for user B
    const rawTokenB = crypto.randomBytes(32).toString('hex');
    const hashB = hashToken(rawTokenB);
    await db.createSession({
      id_hash: hashB,
      user_id: userB.id,
      expires_at: new Date(Date.now() + 864e5),
    });
    userBSessionCookie = `sid=${rawTokenB}`;

    // Seed repositories for user A (1 public, 1 private)
    await db.upsertRepo({
      user_id: userA.id,
      github_repo_id: 101,
      full_name: 'alice-coder/public-engine',
      is_private: false,
      default_branch: 'main',
      last_commit_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      language: 'TypeScript',
      archived_on_github: false,
    });

    await db.upsertRepo({
      user_id: userA.id,
      github_repo_id: 102,
      full_name: 'alice-coder/top-secret-core',
      is_private: true,
      default_branch: 'main',
      last_commit_at: new Date(Date.now() - 1 * 864e5).toISOString(),
      language: 'Rust',
      archived_on_github: false,
    });
  });

  it('generates a frozen snapshot with private names masked by default', async () => {
    const res = await request(app)
      .post('/api/snapshots')
      .set('Cookie', userASessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        template: 'summary',
        size: '1200x630',
        period: '30d',
        theme: 'dark',
        title: "Alice's Momentum",
        hidePrivateNames: true,
        hideAllRepoNames: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.slug).toBeDefined();
    expect(res.body.slug.length).toBeGreaterThanOrEqual(20); // 128 bits base64url

    const snapshot = res.body.snapshot;
    expect(snapshot.title).toBe("Alice's Momentum");
    expect(snapshot.data.stats.totalRepos).toBe(2);
    expect(snapshot.data.stats.activeCount).toBe(2);

    // Verify private repo masking
    const repos = snapshot.data.repos;
    const publicRepo = repos.find((r: any) => !r.is_private);
    const privateRepo = repos.find((r: any) => r.is_private);

    expect(publicRepo.name).toBe('alice-coder/public-engine');
    expect(privateRepo.name).toBe('Private repo');
  });

  it('serves public server-rendered page at /s/:slug with OG tags and noindex', async () => {
    const createRes = await request(app)
      .post('/api/snapshots')
      .set('Cookie', userASessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        template: 'streak',
        size: '1200x630',
        theme: 'heat-accent',
        title: 'Alice Streak Card',
      });

    const slug = createRes.body.slug;

    // Unauthenticated GET request to /s/:slug
    const publicRes = await request(app).get(`/s/${slug}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.text).toContain('content="noindex, nofollow"');
    expect(publicRes.text).toContain('Alice Streak Card');
    expect(publicRes.text).toContain(`content="/s/${slug}/og.png"`);
    expect(publicRes.text).toContain('Track your own repos with RepoPulse');
  });

  it('serves dynamic SVG card at /s/:slug/og.png', async () => {
    const createRes = await request(app)
      .post('/api/snapshots')
      .set('Cookie', userASessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        template: 'language_mix',
        size: '1200x630',
        theme: 'dark',
      });

    const slug = createRes.body.slug;

    const imgRes = await request(app).get(`/s/${slug}/og.png`);
    expect(imgRes.status).toBe(200);
    expect(imgRes.headers['content-type']).toContain('image/svg+xml');
    const svgOutput = imgRes.text || (Buffer.isBuffer(imgRes.body) ? imgRes.body.toString('utf8') : String(imgRes.body || ''));
    expect(svgOutput).toContain('<svg width="1200" height="630"');
    expect(svgOutput).toContain('Made with RepoPulse');
  });


  it('revoking a snapshot returns 404 on subsequent public requests and isolates users', async () => {
    const createRes = await request(app)
      .post('/api/snapshots')
      .set('Cookie', userASessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        template: 'achievements',
        size: '1080x1080',
        theme: 'light',
      });

    const slug = createRes.body.slug;

    // User B attempts to revoke User A's snapshot -> should fail (404 / unauthorized)
    const revokeByB = await request(app)
      .delete(`/api/snapshots/${slug}`)
      .set('Cookie', userBSessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest');
    expect(revokeByB.status).toBe(404);

    // User A revokes their own snapshot -> success
    const revokeByA = await request(app)
      .delete(`/api/snapshots/${slug}`)
      .set('Cookie', userASessionCookie)
      .set('X-Requested-With', 'XMLHttpRequest');
    expect(revokeByA.status).toBe(200);

    // Public URL now returns 404
    const publicAfterRevoke = await request(app).get(`/s/${slug}`);
    expect(publicAfterRevoke.status).toBe(404);
    expect(publicAfterRevoke.text).toContain('Card Unavailable');

    const imageAfterRevoke = await request(app).get(`/s/${slug}/og.png`);
    expect(imageAfterRevoke.status).toBe(404);
  });
});

