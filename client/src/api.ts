import type { Repository, UserProfile, UserSettings, InstallationStatus, SyncStatus, SummaryStats, RepoMetadata, AnalyticsData } from './types.js';

const API_BASE = '/api';

const SESSION_TOKEN_KEY = 'repopulse_session_token';

let storedSessionToken = typeof window !== 'undefined' ? (localStorage.getItem(SESSION_TOKEN_KEY) || '') : '';

export function setSessionToken(token: string | null) {
  if (token) {
    storedSessionToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    }
  } else {
    storedSessionToken = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }
}

function getHeaders(custom: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-RepoPulse-Client': 'web-v2',
    ...custom,
  };
  if (storedSessionToken) {
    headers['X-Session-Token'] = storedSessionToken;
  }
  return headers;
}

export async function fetchMe(): Promise<{ user: UserProfile; settings: UserSettings; installation: InstallationStatus; last_sync: SyncStatus | null }> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401) {
      setSessionToken(null);
    }
    throw new Error(`Failed to fetch user profile: ${res.status}`);
  }
  return res.json();
}

export async function fetchRepos(): Promise<{ repos: Repository[]; summary: string; stats: SummaryStats; thresholds: { active: number; cooling: number; stale: number } }> {
  const res = await fetch(`${API_BASE}/repos`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/repos/analytics`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics: ${res.status}`);
  }
  return res.json();
}

export async function updateRepoMeta(repoId: number, meta: Partial<RepoMetadata>): Promise<{ ok: boolean; meta: RepoMetadata }> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/meta`, {
    method: 'PATCH',
    headers: getHeaders(),
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
    headers: getHeaders(),
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
    headers: getHeaders(),
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
    headers: getHeaders(),
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
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    throw new Error('Demo login failed');
  }
  const data = await res.json();
  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

export async function signupUser(params: { username: string; password: string; token?: string }): Promise<{ ok: boolean; user: UserProfile }> {
  const res = await fetch(`/auth/signup`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Signup failed');
  }
  const data = await res.json();
  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

export async function loginUser(params: { username: string; password: string }): Promise<{ ok: boolean; user: UserProfile }> {
  const res = await fetch(`/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }
  const data = await res.json();
  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

export async function loginWithToken(token: string): Promise<{ ok: boolean; user: UserProfile }> {
  const res = await fetch(`/auth/token-login`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Personal Access Token authentication failed');
  }
  const data = await res.json();
  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

export async function connectToken(token: string): Promise<{ ok: boolean; message: string; repos_read?: number }> {
  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to connect token');
  }
  return res.json();
}

export async function disconnectToken(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/token`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to disconnect token');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  setSessionToken(null);
  await fetch(`/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
}

export async function logoutAll(): Promise<void> {
  setSessionToken(null);
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
  setSessionToken(null);
  if (!res.ok) {
    throw new Error('Failed to delete account');
  }
}
