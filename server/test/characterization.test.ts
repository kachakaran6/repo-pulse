import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  ACTIVITY_STATUSES,
  VERDICTS,
  compareByActivity,
  groupByActivity,
  type ActivityStatus,
  type Verdict,
} from '../../shared/src/index.ts';
import { app } from '../src/app.js';

interface LedgerRepo {
  id: string;
  full_name: string;
  status: ActivityStatus;
  last_commit_at: string | null;
  is_retired: boolean;
  is_paused: boolean;
  meta: {
    decision: Verdict | null;
    paused_until: string | null;
    goal_date: string | null;
    label: string | null;
    note: string | null;
  };
}

function auth(cookies: string | string[]) {
  return {
    Cookie: cookies,
    'X-Requested-With': 'XMLHttpRequest',
  };
}

describe('characterization: ledger core flows', () => {
  it('fetches repos, groups them by activity, and overwrites a verdict', async () => {
    const login = await request(app)
      .post('/auth/dev-login')
      .set('X-Requested-With', 'XMLHttpRequest');
    expect(login.status).toBe(200);
    const cookies = login.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const listed = await request(app).get('/api/repos').set(auth(cookies!));
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.repos)).toBe(true);
    expect(listed.body.repos.length).toBeGreaterThan(0);
    expect(typeof listed.body.summary).toBe('string');
    expect(listed.body.thresholds).toEqual(
      expect.objectContaining({
        active: expect.any(Number),
        cooling: expect.any(Number),
        stale: expect.any(Number),
      }),
    );

    const repos = listed.body.repos as LedgerRepo[];
    for (const repo of repos) {
      expect(ACTIVITY_STATUSES).toContain(repo.status);
      expect(repo.full_name).toEqual(expect.any(String));
      if (repo.meta.decision !== null) {
        expect(VERDICTS).toContain(repo.meta.decision);
      }
    }

    const groups = groupByActivity(repos);
    const open = (status: ActivityStatus) => groups[status].filter((repo) => !repo.is_retired);
    expect(open('active').length).toBe(listed.body.stats.activeCount);
    expect(open('cooling').length).toBe(listed.body.stats.coolingCount);
    expect(open('stale').length).toBe(listed.body.stats.staleCount);
    expect(open('dead').length).toBe(listed.body.stats.deadCount);
    expect(repos.filter((repo) => repo.is_retired).length).toBe(listed.body.stats.retiredCount);

    const sorted = [...repos].sort(compareByActivity);
    expect(repos.map((repo) => repo.id)).toEqual(sorted.map((repo) => repo.id));

    const target = repos[0];
    const previous = {
      decision: target.meta.decision,
      paused_until: target.meta.paused_until,
      goal_date: target.meta.goal_date,
    };

    const retired = await request(app)
      .patch(`/api/repos/${target.id}/meta`)
      .set(auth(cookies!))
      .send({ decision: 'retire' });
    expect(retired.status).toBe(200);
    expect(retired.body.meta.decision).toBe('retire');

    const afterRetire = await request(app).get('/api/repos').set(auth(cookies!));
    const retiredRow = (afterRetire.body.repos as LedgerRepo[]).find(
      (repo) => repo.id === target.id,
    );
    expect(retiredRow?.meta.decision).toBe('retire');
    expect(retiredRow?.is_retired).toBe(true);

    const paused = await request(app)
      .patch(`/api/repos/${target.id}/meta`)
      .set(auth(cookies!))
      .send({ decision: 'pause', paused_until: '2099-01-01' });
    expect(paused.status).toBe(200);
    expect(paused.body.meta.decision).toBe('pause');

    const afterPause = await request(app).get('/api/repos').set(auth(cookies!));
    const pausedRow = (afterPause.body.repos as LedgerRepo[]).find((repo) => repo.id === target.id);
    expect(pausedRow?.is_paused).toBe(true);
    expect(pausedRow?.is_retired).toBe(false);

    const kept = await request(app)
      .patch(`/api/repos/${target.id}/meta`)
      .set(auth(cookies!))
      .send({ decision: 'keep' });
    expect(kept.status).toBe(200);
    expect(kept.body.meta.decision).toBe('keep');

    const invalid = await request(app)
      .patch(`/api/repos/${target.id}/meta`)
      .set(auth(cookies!))
      .send({ decision: 'archive' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Invalid Metadata');
    expect(typeof invalid.body.message).toBe('string');
    expect(invalid.body.details).toBeDefined();

    const restored = await request(app)
      .patch(`/api/repos/${target.id}/meta`)
      .set(auth(cookies!))
      .send(previous);
    expect(restored.status).toBe(200);
    expect(restored.body.meta.decision).toBe(previous.decision);
  });
});
