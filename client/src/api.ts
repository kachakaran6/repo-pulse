import type {
  Repository,
  UserProfile,
  UserSettings,
  InstallationStatus,
  SyncStatus,
  SummaryStats,
  RepoMetadata,
  AnalyticsData,
} from './types.js';

const API_BASE = '/api';

function getHeaders(custom: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-RepoPulse-Client': 'web-v2',
    ...custom,
  };
}

export async function fetchMe(): Promise<{
  id: string;
  login: string;
  avatarUrl: string;
  hasInstallation: boolean;
  user: UserProfile;
  settings: UserSettings;
  installation: InstallationStatus;
  last_sync: SyncStatus | null;
}> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRepos(): Promise<{
  repos: Repository[];
  summary: string;
  stats: SummaryStats;
  thresholds: { active: number; cooling: number; stale: number };
}> {
  const res = await fetch(`${API_BASE}/repos`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/repos/analytics`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateRepoMeta(
  repoId: string | number,
  meta: Partial<RepoMetadata>
): Promise<{ ok: boolean; meta: RepoMetadata }> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/meta`, {
    method: 'PATCH',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(meta),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update metadata: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<{ ok: boolean; settings: UserSettings }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update settings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function triggerSync(
  force = false
): Promise<{ ok: boolean; status: string; message: string; repos_read?: number }> {
  const url = `${API_BASE}/sync${force ? '?force=true&wait=true' : '?wait=true'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Sync failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch(`${API_BASE}/sync/status`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sync status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuthStatus(): Promise<{
  githubConfigured: boolean;
  demoEnabled: boolean;
  appUrl: string;
  clientId?: string | null;
}> {
  try {
    const res = await fetch('/auth/status', {
      headers: getHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback gracefully
  }
  return { githubConfigured: true, demoEnabled: true, appUrl: '' };
}

export function loginWithGithub(): void {
  window.location.href = '/auth/github/start';
}


export async function loginDevUser(): Promise<{ ok: boolean; user: UserProfile }> {
  const res = await fetch(`/auth/dev-login`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Dev login failed or disabled');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
}

export async function logoutAll(): Promise<void> {
  await fetch(`/auth/logout-all`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/account`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to delete account');
  }
}

export async function createSnapshot(config: any): Promise<{ ok: boolean; slug: string; url: string; snapshot: any }> {
  const res = await fetch(`${API_BASE}/snapshots`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create share card');
  }
  return res.json();
}

export async function fetchSnapshots(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/snapshots`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch snapshots');
  }
  return res.json();
}

export async function revokeSnapshot(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/snapshots/${slug}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to revoke share card');
  }
}

