export type RepoStatus = 'active' | 'cooling' | 'stale' | 'dead';
export type DecisionType = 'keep' | 'pause' | 'retire';
export type ThemeChoice = 'light' | 'dark' | 'system';

export interface CommitDay {
  day: string; // YYYY-MM-DD
  commits: number;
}

export interface RepoMetadata {
  label: string | null;
  goal_date: string | null;
  note: string | null;
  decision: DecisionType | null;
  paused_until: string | null;
  decided_at: string | null;
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
  status: RepoStatus;
  explanation: StatusExplanation;
  meta: RepoMetadata;
  is_paused: boolean;
  is_retired: boolean;
  activity: CommitDay[];
  weekly_commits: number;
}

export interface UserSettings {
  active_days: number;
  cooling_days: number;
  stale_days: number;
  theme: ThemeChoice;
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
  account_login?: string;
  github_installation_id?: number;
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
}
