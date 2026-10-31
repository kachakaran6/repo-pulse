import type {
  Repository,
  UserProfile,
  UserSettings,
  InstallationStatus,
  SyncStatus,
  SummaryStats,
  RepoMetadata,
  AnalyticsData,
  VerdictLearningStats,
  VerdictSuggestion,
  VerdictFeatures,
  Verdict,
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
  installations?: any[];
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
  githubAppConfigured?: boolean;
  demoEnabled: boolean;
  appSlug?: string | null;
  installUrl?: string | null;
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

export async function fetchAuthMe(): Promise<{ authenticated: boolean; user: UserProfile | null }> {
  try {
    const res = await fetch('/auth/me', {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { authenticated: false, user: null };
}

export async function fetchInstallations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/installations`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
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

export async function fetchSavedViews(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/repos/saved-views`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch saved views');
  }
  return res.json();
}

export async function createSavedView(name: string, query: any): Promise<any> {
  const res = await fetch(`${API_BASE}/repos/saved-views`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ name, query }),
  });
  if (!res.ok) {
    throw new Error('Failed to create saved view');
  }
  return res.json();
}

export async function deleteSavedView(id: string | number): Promise<void> {
  const res = await fetch(`${API_BASE}/repos/saved-views/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to delete saved view');
  }
}



// ==========================================
// Semantic & Hybrid Search APIs
// ==========================================

import type {
  SearchScope,
  SearchResult,
  GroupedSearchResult,
  SearchIndexStatus,
  SearchSettings,
  OutboundPreview,
  SimilarRepo,
} from '@shared';

export async function searchHybrid(
  query: string,
  scope: SearchScope = 'all',
  limit = 20
): Promise<{
  query: string;
  scope: SearchScope;
  totalMatches: number;
  results: SearchResult[];
  groupedByRepo: GroupedSearchResult[];
}> {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&scope=${scope}&limit=${limit}`;
  const res = await fetch(url, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Search failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSearchIndexStatus(): Promise<SearchIndexStatus> {
  const res = await fetch(`${API_BASE}/search/status`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch search index status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function triggerSearchIndex(
  fullReindex = false
): Promise<{ ok: boolean; status?: SearchIndexStatus }> {
  const res = await fetch(`${API_BASE}/search/index?wait=true`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ fullReindex }),
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger index: HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteSearchIndex(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/search/index`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete index: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOutboundPreview(): Promise<OutboundPreview> {
  const res = await fetch(`${API_BASE}/search/preview-outbound`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch outbound preview: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateSearchSettings(
  settings: Partial<SearchSettings>
): Promise<{ ok: boolean; settings: SearchSettings }> {
  const res = await fetch(`${API_BASE}/search/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    throw new Error(`Failed to update search settings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSimilarRepos(
  repoId: string | number,
  limit = 5
): Promise<SimilarRepo[]> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/similar?limit=${limit}`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

// =====================================================================
// Personalized Verdict Learning & Suggestions
// =====================================================================

export async function fetchVerdictLearningStats(): Promise<VerdictLearningStats> {
  const res = await fetch(`${API_BASE}/verdicts/learning`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch verdict learning stats: HTTP ${res.status}`);
  }
  return res.json();
}

export async function resetVerdictPersonalization(): Promise<{ ok: boolean; stats: VerdictLearningStats }> {
  const res = await fetch(`${API_BASE}/verdicts/reset`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to reset verdict personalization: HTTP ${res.status}`);
  }
  return res.json();
}

export async function triggerVerdictModelTraining(): Promise<{ ok: boolean; stats: VerdictLearningStats }> {
  const res = await fetch(`${API_BASE}/verdicts/train`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to train verdict model: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSuggestedVerdict(
  repoId: string | number
): Promise<{ suggestion: VerdictSuggestion; features: VerdictFeatures }> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/suggested-verdict`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch suggested verdict: HTTP ${res.status}`);
  }
  return res.json();
}

export async function recordVerdictDecision(data: {
  repoId: string | number;
  verdict: Verdict;
  suggestedVerdict?: Verdict | null;
  suggestionConfidence?: number | null;
  suggestionSource?: string;
  previousVerdict?: Verdict | null;
}): Promise<{ ok: boolean; record: any }> {
  const res = await fetch(`${API_BASE}/verdicts/decision`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to record verdict decision: HTTP ${res.status}`);
  }
  return res.json();
}

