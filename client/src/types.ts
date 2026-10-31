import type { ActivityStatus, Tag, Verdict, VerdictSuggestion, VerdictFeatures, VerdictLearningStats } from '@shared';

export type { ActivityStatus, Repo, Tag, Verdict, VerdictSuggestion, VerdictFeatures, VerdictLearningStats } from '@shared';

export type RepoStatus = ActivityStatus;
export type DecisionType = Verdict;
export type ThemeChoice = 'light' | 'dark' | 'system';

export interface CommitDay {
  day: string; // YYYY-MM-DD
  commits: number;
  commits_mine?: number;
  commits_all?: number;
}

export interface RepoMetadata {
  label: Tag | null;
  goal_date: string | null;
  note: string | null;
  decision: DecisionType | null;
  paused_until: string | null;
  decided_at: string | null;
  wip_override?: boolean;
  override?: boolean;
}

export interface StatusExplanation {
  status: RepoStatus;
  days: number | null;
  message: string;
}

export interface Repository {
  id: number;
  github_repo_id: number;
  full_name: string;
  is_private: boolean;
  default_branch: string;
  last_commit_at: string | null;
  language: string | null;
  archived_on_github: boolean;
  owner_login?: string;
  owner_type?: string;
  relationship?: string;
  is_collaborative?: boolean;
  status: RepoStatus;
  explanation: StatusExplanation;
  meta: RepoMetadata;
  is_paused: boolean;
  is_retired: boolean;
  activity: CommitDay[];
  weekly_commits: number;
  suggested_verdict?: VerdictSuggestion | null;
  stars?: number;
  open_issues?: number;
  hygiene_score?: number | null;
}

export interface UserSettings {
  active_days: number;
  cooling_days: number;
  stale_days: number;
  theme: ThemeChoice;
  wip_limit?: number | null;
  wipLimit?: number | null;
}

export interface UserProfile {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  created_at: string | null;
}

export interface InstallationStatus {
  connected: boolean;
  token_connected?: boolean;
  account_login?: string;
  github_installation_id?: number | string;
  repository_selection?: string;
  repository_count?: number;
  installation_id?: string | number;
}

export interface InstallationItem {
  id: string;
  account_login: string;
  account_type?: string;
  github_installation_id: string;
  installation_id: string;
  selection: string;
  repo_count: number;
  public_repo_count?: number;
  private_repo_count?: number;
  last_synced_at?: string;
}

export interface SyncStatus {
  status: 'idle' | 'running' | 'success' | 'failed' | 'rate_limited';
  repos_read: number;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
}

export interface SummaryStats {
  totalRepos: number;
  activeCount: number;
  coolingCount: number;
  staleCount: number;
  deadCount: number;
  retiredCount: number;
  weeklyCommits: number;
  committedReposThisWeek: number;
  wentColdCount: number;
  summarySentence?: string;
  longestStreak?: number;
  currentStreak?: number;
  mostActiveWeekday?: string;
  revivedReposCount?: number;
  decisionsMadeCount?: number;
  totalCommits7d?: number;
  totalCommits30d?: number;
  totalCommits90d?: number;
  languages?: { name: string; count: number; percentage: number }[];
  weeklyVelocity?: { weekLabel: string; commits: number; weekStart: string }[];
}

export interface AnalyticsData {
  total_repos: number;
  public_count: number;
  private_count: number;
  archived_count: number;
  health_score: number;
  commits: {
    past_7_days: number;
    past_30_days: number;
    past_90_days: number;
    weekly_average: number;
  };
  heat_distribution: {
    active: number;
    cooling: number;
    stale: number;
    dead: number;
    retired: number;
  };
  languages: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  most_active_repo: {
    id: number;
    name: string;
    commits_90d: number;
    language: string | null;
  } | null;
  oldest_dormant_repo: {
    id: number;
    name: string;
    days_inactive: number;
    last_commit_at: string | null;
  } | null;
  daily_trend: Array<{ day: string; commits: number }>;
}
