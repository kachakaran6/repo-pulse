import { describe, expect, it } from 'vitest';
import { compareByActivity, groupByActivity, type ActivityStatus } from '@shared';

describe('groupByActivity', () => {
  it('keeps heat buckets in the ledger order and does not drop rows', () => {
    const repos = [
      { id: 'dead', status: 'dead' as ActivityStatus, last_commit_at: null },
      {
        id: 'active-new',
        status: 'active' as ActivityStatus,
        last_commit_at: '2026-10-07T00:00:00.000Z',
      },
      {
        id: 'cooling',
        status: 'cooling' as ActivityStatus,
        last_commit_at: '2026-09-20T00:00:00.000Z',
      },
      {
        id: 'active-old',
        status: 'active' as ActivityStatus,
        last_commit_at: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'stale',
        status: 'stale' as ActivityStatus,
        last_commit_at: '2026-09-01T00:00:00.000Z',
      },
      { id: 'undated', status: 'active' as ActivityStatus, last_commit_at: null },
    ];

    const groups = groupByActivity(repos);
    expect(groups.active.map((repo) => repo.id)).toEqual(['active-new', 'active-old', 'undated']);
    expect(groups.cooling.map((repo) => repo.id)).toEqual(['cooling']);
    expect(groups.stale.map((repo) => repo.id)).toEqual(['stale']);
    expect(groups.dead.map((repo) => repo.id)).toEqual(['dead']);

    const ordered = [...repos].sort(compareByActivity).map((repo) => repo.id);
    expect(ordered).toEqual(['active-new', 'active-old', 'undated', 'cooling', 'stale', 'dead']);
  });
});
