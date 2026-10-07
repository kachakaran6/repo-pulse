import type { Repository, UserProfile, UserSettings, InstallationStatus, SyncStatus, SummaryStats, RepoMetadata } from './types.js';

const API_BASE = '/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-RepoPulse-Client': 'web-v2',
};

export async function fetchMe(): Promise<{ user: UserProfile; settings: UserSettings; installation: InstallationStatus; last_sync: SyncStatus | null }> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: defaultHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.status}`);
  }
  return res.json();
}

export async function fetchRepos(): Promise<{ repos: Repository[]; summary: string; stats: SummaryStats; thresholds: { active: number; cooling: number; stale: number } }> {
  const res = await fetch(`${API_BASE}/repos`, {
    headers: defaultHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.status}`);
  }
  return res.json();
}

export async function updateRepoMeta(repoId: number, meta: Partial<RepoMetadata>): Promise<{ ok: boolean; meta: RepoMetadata }> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/meta`, {
    method: 'PATCH',
    headers: defaultHeaders,
    credentials: 'include',
    body: JSON.stringify(meta),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update metadata: ${res.status}`);
  }
  return res.json();
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<{ ok: boolean; settings: UserSettings }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: defaultHeaders,
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update settings: ${res.status}`);
  }
  return res.json();
}

export async function triggerSync(force = false): Promise<{ ok: boolean; status: string; message: string; repos_read?: number }> {
  const url = `${API_BASE}/sync${force ? '?force=true&wait=true' : '?wait=true'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Sync failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch(`${API_BASE}/sync/status`, {
    headers: defaultHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sync status: ${res.status}`);
  }
  return res.json();
}

export async function loginDemoUser(username = 'demo-developer'): Promise<{ ok: boolean; user: UserProfile }> {
  const res = await fetch(`/auth/demo-login`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    throw new Error('Demo login failed');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`/auth/logout`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
  });
}

export async function logoutAll(): Promise<void> {
  await fetch(`/auth/logout-all`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
  });
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/account`, {
    method: 'DELETE',
    headers: defaultHeaders,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to delete account');
  }
}
