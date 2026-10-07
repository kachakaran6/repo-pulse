import { z } from 'zod';

export type RepoStatus = 'active' | 'cooling' | 'stale' | 'dead';

export interface StatusThresholds {
  active: number;
  cooling: number;
  stale: number;
}

export const DEFAULT_THRESHOLDS: StatusThresholds = {
  active: 7,
  cooling: 14,
  stale: 30,
};

export const thresholdsSchema = z.object({
  active_days: z.number().int().min(1).max(90),
  cooling_days: z.number().int().min(2).max(180),
  stale_days: z.number().int().min(3).max(365),
}).refine(
  (data) => data.active_days < data.cooling_days && data.cooling_days < data.stale_days,
  {
    message: 'Thresholds must be strictly increasing: active < cooling < stale',
    path: ['active_days'],
  }
);

export interface StatusExplanation {
  status: RepoStatus;
  days: number | null;
  message: string;
  limits: StatusThresholds;
}

/**
 * Pure function to compute repository status from last commit date
 */
export function statusOf(
  lastCommitAt: string | Date | null | undefined,
  now: number = Date.now(),
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS
): RepoStatus {
  if (!lastCommitAt) return 'dead';

  const date = typeof lastCommitAt === 'string' ? new Date(lastCommitAt) : lastCommitAt;
  const time = date.getTime();
  if (isNaN(time)) return 'dead';

  const days = Math.floor((now - time) / 864e5);
  if (days < 0) return 'active'; // Future/just now

  if (days <= thresholds.active) return 'active';
  if (days <= thresholds.cooling) return 'cooling';
  if (days <= thresholds.stale) return 'stale';
  return 'dead';
}

/**
 * Explains status calculation in plain English
 */
export function explainStatus(
  lastCommitAt: string | Date | null | undefined,
  now: number = Date.now(),
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS
): StatusExplanation {
  if (!lastCommitAt) {
    return {
      status: 'dead',
      days: null,
      message: 'No commit activity recorded',
      limits: thresholds,
    };
  }

  const date = typeof lastCommitAt === 'string' ? new Date(lastCommitAt) : lastCommitAt;
  const time = date.getTime();
  if (isNaN(time)) {
    return {
      status: 'dead',
      days: null,
      message: 'Invalid commit timestamp',
      limits: thresholds,
    };
  }

  const days = Math.max(0, Math.floor((now - time) / 864e5));

  if (days <= thresholds.active) {
    return {
      status: 'active',
      days,
      message: `Active: committed ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`} (within ${thresholds.active}d limit)`,
      limits: thresholds,
    };
  }

  if (days <= thresholds.cooling) {
    return {
      status: 'cooling',
      days,
      message: `Cooling: ${days} days without commit (past ${thresholds.active}d active, within ${thresholds.cooling}d cooling)`,
      limits: thresholds,
    };
  }

  if (days <= thresholds.stale) {
    return {
      status: 'stale',
      days,
      message: `Stale: ${days} days without commit (past ${thresholds.cooling}d cooling, within ${thresholds.stale}d stale)`,
      limits: thresholds,
    };
  }

  return {
    status: 'dead',
    days,
    message: `Dead: ${days} days without commit (exceeds ${thresholds.stale}d stale limit)`,
    limits: thresholds,
  };
}

export interface SummaryStats {
  totalRepos: number;
  activeCount: number;
  coolingCount: number;
  staleCount: number;
  deadCount: number;
  weeklyCommits: number;
  committedReposThisWeek: number;
  wentColdCount: number;
}

/**
 * Generates rule-based summary sentence for Overview screen
 * "You committed to 3 repos this week. 2 went cold."
 */
export function generateSummarySentence(stats: SummaryStats): string {
  if (stats.totalRepos === 0) {
    return 'No repositories connected yet. Connect your GitHub account to get started.';
  }

  const parts: string[] = [];

  if (stats.committedReposThisWeek > 0) {
    parts.push(`You committed to ${stats.committedReposThisWeek} repo${stats.committedReposThisWeek === 1 ? '' : 's'} this week.`);
  } else if (stats.activeCount > 0) {
    parts.push(`${stats.activeCount} repo${stats.activeCount === 1 ? ' is' : 's are'} active.`);
  } else {
    parts.push('No commit activity this week.');
  }

  if (stats.wentColdCount > 0) {
    parts.push(`${stats.wentColdCount} went cold.`);
  } else if (stats.coolingCount > 0) {
    parts.push(`${stats.coolingCount} cooling.`);
  } else if (stats.staleCount > 0) {
    parts.push(`${stats.staleCount} need triage.`);
  }

  return parts.join(' ');
}
