/**
 * Shared domain types for the ledger.
 * The running API still uses these names on the wire:
 * decision (not a separate verdict column), and a single label string (not a tag list).
 */

export const ACTIVITY_STATUSES = ['active', 'cooling', 'stale', 'dead'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const VERDICTS = ['keep', 'pause', 'retire'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** One free-text label. RepoPulse stores a single label per repo today. */
export type Tag = string;

export interface Repo {
  id: string | number;
  full_name: string;
  is_private: boolean;
  last_commit_at: string | null;
  language: string | null;
  status: ActivityStatus;
  /** Wire field. This is the triage verdict. */
  decision: Verdict | null;
  label: Tag | null;
  note: string | null;
}

const STATUS_ORDER: Record<ActivityStatus, number> = {
  active: 1,
  cooling: 2,
  stale: 3,
  dead: 4,
};

/** Bucket repos by the activity status already computed for each row. */
export function groupByActivity<T extends { status: ActivityStatus }>(
  repos: T[],
): Record<ActivityStatus, T[]> {
  const groups: Record<ActivityStatus, T[]> = {
    active: [],
    cooling: [],
    stale: [],
    dead: [],
  };
  for (const repo of repos) {
    groups[repo.status].push(repo);
  }
  return groups;
}

/**
 * Default ledger order: heat status, then newer commits first.
 * Matches GET /api/repos when `sort` is omitted.
 */
export function compareByActivity<
  T extends { status: ActivityStatus; last_commit_at: string | null },
>(a: T, b: T): number {
  const weight = (STATUS_ORDER[a.status] || 5) - (STATUS_ORDER[b.status] || 5);
  if (weight !== 0) return weight;
  if (!a.last_commit_at) return 1;
  if (!b.last_commit_at) return -1;
  return new Date(b.last_commit_at).getTime() - new Date(a.last_commit_at).getTime();
}

export * from './wipLimit.js';
export * from './search.js';
export * from './verdicts.js';
