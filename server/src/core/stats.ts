import { statusOf, type RepoStatus, type StatusThresholds, DEFAULT_THRESHOLDS } from './status.js';

export interface RepoWithActivity {
  id: string | number;
  github_repo_id: string | number;
  full_name: string;
  is_private: boolean;
  is_fork?: boolean;
  is_archived?: boolean;
  owner_login?: string;
  owner_type?: string;
  relationship?: string;
  permission?: string;
  default_branch: string;
  last_commit_at: string | Date | null;
  pushed_at?: string | Date | null;
  created_at_github?: string | Date | null;
  language?: string | null;
  archived_on_github: boolean;
  meta?: {
    label?: string | null;
    goal_date?: string | null;
    note?: string | null;
    decision?: 'keep' | 'pause' | 'retire' | null;
    paused_until?: string | null;
    decided_at?: string | Date | null;
  };
  activity?: { day: string; commits_mine?: number; commits_all?: number; commits?: number }[];
}

export interface UnifiedStats {
  totalRepos: number;
  activeCount: number;
  coolingCount: number;
  staleCount: number;
  deadCount: number;
  retiredCount: number;
  weeklyCommits: number;
  committedReposThisWeek: number;
  wentColdCount: number;
  summarySentence: string;
  longestStreak: number;
  currentStreak: number;
  mostActiveWeekday: string;
  revivedReposCount: number;
  decisionsMadeCount: number;
  totalCommits7d: number;
  totalCommits30d: number;
  totalCommits90d: number;
  languages: { name: string; count: number; percentage: number }[];
  weeklyVelocity: { weekLabel: string; commits: number; weekStart: string }[];
}

/**
 * Computes unified statistics across all repositories for a user
 */
export function computeUnifiedStats(
  repos: RepoWithActivity[],
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS,
  statusChanges: { repo_id: string | number; status: string; created_at: Date | string }[] = [],
  now: number = Date.now()
): UnifiedStats {
  const todayStr = new Date(now).toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(now - 7 * 864e5).toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(now - 30 * 864e5).toISOString().split('T')[0];
  const ninetyDaysAgoStr = new Date(now - 90 * 864e5).toISOString().split('T')[0];

  let totalRepos = repos.length;
  let activeCount = 0;
  let coolingCount = 0;
  let staleCount = 0;
  let deadCount = 0;
  let retiredCount = 0;

  let weeklyCommits = 0;
  let committedReposThisWeek = 0;
  let totalCommits7d = 0;
  let totalCommits30d = 0;
  let totalCommits90d = 0;

  let decisionsMadeCount = 0;
  const langCountMap: Record<string, number> = {};

  // Aggregate daily commits for streak & weekday calculation
  const dailyGlobalCommits: Record<string, number> = {};
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1, ...

  // Initialize 90 days of dates
  for (let i = 89; i >= 0; i--) {
    const dStr = new Date(now - i * 864e5).toISOString().split('T')[0];
    dailyGlobalCommits[dStr] = 0;
  }

  for (const r of repos) {
    const status = statusOf(r.last_commit_at, now, thresholds);
    const meta = r.meta || {};
    const isRetired = meta.decision === 'retire';

    if (meta.decision) {
      decisionsMadeCount++;
    }

    if (isRetired) {
      retiredCount++;
    } else {
      if (status === 'active') activeCount++;
      else if (status === 'cooling') coolingCount++;
      else if (status === 'stale') staleCount++;
      else if (status === 'dead') deadCount++;
    }

    if (r.language) {
      langCountMap[r.language] = (langCountMap[r.language] || 0) + 1;
    }

    let repoCommittedThisWeek = false;

    if (r.activity && Array.isArray(r.activity)) {
      for (const act of r.activity) {
        const count = act.commits_mine ?? act.commits ?? 0;
        if (count > 0) {
          if (act.day >= sevenDaysAgoStr && act.day <= todayStr) {
            weeklyCommits += count;
            totalCommits7d += count;
            repoCommittedThisWeek = true;
          }
          if (act.day >= thirtyDaysAgoStr && act.day <= todayStr) {
            totalCommits30d += count;
          }
          if (act.day >= ninetyDaysAgoStr && act.day <= todayStr) {
            totalCommits90d += count;
          }

          if (dailyGlobalCommits[act.day] !== undefined) {
            dailyGlobalCommits[act.day] += count;
          }

          const dayOfWeek = new Date(act.day).getUTCDay();
          weekdayTotals[dayOfWeek] += count;
        }
      }
    }

    if (repoCommittedThisWeek) {
      committedReposThisWeek++;
    }
  }

  // Calculate wentColdCount from status_changes in the last 7 days
  let wentColdCount = 0;
  const recentChanges = statusChanges.filter((sc) => {
    const changeTime = new Date(sc.created_at).getTime();
    return changeTime >= now - 7 * 864e5;
  });

  const coldStatuses = new Set(['cooling', 'stale', 'dead']);
  const countedColdRepoIds = new Set<string>();
  for (const change of recentChanges) {
    const rId = String(change.repo_id);
    if (coldStatuses.has(change.status) && !countedColdRepoIds.has(rId)) {
      wentColdCount++;
      countedColdRepoIds.add(rId);
    }
  }

  // If no status_changes table records exist yet, compute from repository last commit date
  if (statusChanges.length === 0) {
    for (const r of repos) {
      if (r.last_commit_at) {
        const days = Math.floor((now - new Date(r.last_commit_at).getTime()) / 864e5);
        if (days > thresholds.active && days <= thresholds.active + 7) {
          wentColdCount++;
        }
      }
    }
  }

  // Calculate revivedReposCount (repos with commits in last 7 days whose previous state was dead/stale)
  let revivedReposCount = 0;
  for (const change of recentChanges) {
    if (change.status === 'active') {
      revivedReposCount++;
    }
  }

  // Compute Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedDays = Object.keys(dailyGlobalCommits).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];
    const count = dailyGlobalCommits[day] || 0;
    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Current active streak from today backwards
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const day = sortedDays[i];
    const count = dailyGlobalCommits[day] || 0;
    if (count > 0 || (i === sortedDays.length - 1 && count === 0)) {
      if (count > 0) currentStreak++;
    } else {
      break;
    }
  }

  // Most active weekday
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let maxWeekdayIdx = 1; // default Monday
  let maxWeekdayVal = -1;
  weekdayTotals.forEach((val, idx) => {
    if (val > maxWeekdayVal) {
      maxWeekdayVal = val;
      maxWeekdayIdx = idx;
    }
  });
  const mostActiveWeekday = weekdayNames[maxWeekdayIdx];

  // Languages distribution
  const totalLangRepos = Object.values(langCountMap).reduce((a, b) => a + b, 0);
  const languages = Object.entries(langCountMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalLangRepos > 0 ? Math.round((count / totalLangRepos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 26-week weekly velocity
  const weeklyVelocity: { weekLabel: string; commits: number; weekStart: string }[] = [];
  for (let w = 25; w >= 0; w--) {
    const weekStartMs = now - (w * 7 + 6) * 864e5;
    const weekEndMs = now - w * 7 * 864e5;
    const startStr = new Date(weekStartMs).toISOString().split('T')[0];
    const endStr = new Date(weekEndMs).toISOString().split('T')[0];

    let weekCommits = 0;
    for (const r of repos) {
      if (r.activity) {
        for (const act of r.activity) {
          if (act.day >= startStr && act.day <= endStr) {
            weekCommits += (act.commits_mine ?? act.commits ?? 0);
          }
        }
      }
    }

    const d = new Date(weekStartMs);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const weekLabel = `${monthName} ${d.getDate()}`;

    weeklyVelocity.push({
      weekLabel,
      commits: weekCommits,
      weekStart: startStr,
    });
  }

  // Summary sentence construction
  let summarySentence: string;
  if (totalRepos === 0) {
    summarySentence = 'No repositories connected yet. Connect your GitHub account to get started.';
  } else {
    const part1 = committedReposThisWeek > 0
      ? `You committed to ${committedReposThisWeek} repo${committedReposThisWeek === 1 ? '' : 's'} this week.`
      : activeCount > 0
      ? `${activeCount} repo${activeCount === 1 ? ' is' : 's are'} active.`
      : 'No commits this week.';

    const part2 = wentColdCount > 0
      ? `${wentColdCount} went cold.`
      : 'Nothing went cold this week.';

    summarySentence = `${part1} ${part2}`;
  }

  return {
    totalRepos,
    activeCount,
    coolingCount,
    staleCount,
    deadCount,
    retiredCount,
    weeklyCommits,
    committedReposThisWeek,
    wentColdCount,
    summarySentence,
    longestStreak,
    currentStreak,
    mostActiveWeekday,
    revivedReposCount,
    decisionsMadeCount,
    totalCommits7d,
    totalCommits30d,
    totalCommits90d,
    languages,
    weeklyVelocity,
  };
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  icon: string;
}

/**
 * Computes rule-based achievements from unified stats
 */
export function computeAchievements(stats: UnifiedStats): AchievementBadge[] {
  return [
    {
      id: 'streak_7',
      name: '7-Day Momentum',
      description: 'Maintained a 7-day daily commit streak',
      earned: stats.longestStreak >= 7,
      icon: 'Flame',
    },
    {
      id: 'streak_30',
      name: 'Iron Habit',
      description: 'Maintained a 30-day continuous streak',
      earned: stats.longestStreak >= 30,
      icon: 'Calendar',
    },
    {
      id: 'century_commits',
      name: 'Century Velocity',
      description: 'Authored 100+ commits in the last 30 days',
      earned: stats.totalCommits30d >= 100,
      icon: 'GitCommit',
    },
    {
      id: 'revived_trio',
      name: 'Necromancer',
      description: 'Revived 3 stale or cooling repositories',
      earned: stats.revivedReposCount >= 3,
      icon: 'RotateCcw',
    },
    {
      id: 'triage_master',
      name: 'Inbox Zero',
      description: 'Decided on every cooling and stale repository',
      earned: (stats.coolingCount + stats.staleCount === 0) && stats.totalRepos > 0,
      icon: 'CheckCircle2',
    },
    {
      id: 'poly_shipper',
      name: 'Poly Shipper',
      description: 'Committed to 5+ distinct repositories in a single week',
      earned: stats.committedReposThisWeek >= 5,
      icon: 'GitFork',
    },
  ];
}
