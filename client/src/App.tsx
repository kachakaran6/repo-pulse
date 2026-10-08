import React, { useState, useEffect, useCallback } from 'react';
import type {
  Repository,
  UserProfile,
  UserSettings,
  InstallationStatus,
  SyncStatus,
  SummaryStats,
  RepoMetadata,
} from './types.js';
import * as api from './api.js';
import { Shell } from './components/Shell.js';
import { OverviewView } from './components/OverviewView.js';
import { AnalyticsView } from './components/AnalyticsView.js';
import { TriageView } from './components/TriageView.js';
import { ArchiveView } from './components/ArchiveView.js';
import { SettingsView } from './components/SettingsView.js';
import { RepoDetailModal } from './components/RepoDetailModal.js';
import { OnboardingView } from './components/OnboardingView.js';
import { SkeletonRow, Toast, ErrorBanner } from './components/FeedbackComponents.js';

interface UndoAction {
  repoId: string | number;
  previousMeta: RepoMetadata;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    active_days: 7,
    cooling_days: 14,
    stale_days: 30,
    theme: 'system',
  });
  const [installation, setInstallation] = useState<InstallationStatus>({ connected: false });
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [summarySentence, setSummarySentence] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'triage' | 'archive' | 'settings'>('overview');
  const [selectedRepoForDetail, setSelectedRepoForDetail] = useState<Repository | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo stack for triage
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  // Load user profile and initial repository data via /api/me
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const meData = await api.fetchMe();
      setUser(meData.user);
      setSettings(meData.settings);
      setInstallation(meData.installation);
      setLastSync(meData.last_sync);

      const reposData = await api.fetchRepos();
      setRepos(reposData.repos);
      setSummarySentence(reposData.summary);
      setStats(reposData.stats);

      // If user is authenticated but has 0 repos, initiate auto-sync
      if (reposData.repos.length === 0 && meData.user) {
        setIsSyncing(true);
        try {
          const syncRes = await api.triggerSync(false);
          if (syncRes.ok) {
            const updated = await api.fetchRepos();
            setRepos(updated.repos);
            setSummarySentence(updated.summary);
            setStats(updated.stats);
          }
        } catch {
          // ignore rate limits or initial state
        } finally {
          setIsSyncing(false);
        }
      }
    } catch {
      // User is unauthenticated
      setUser(null);
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Reload repos
  const refreshRepos = async () => {
    try {
      const reposData = await api.fetchRepos();
      setRepos(reposData.repos);
      setSummarySentence(reposData.summary);
      setStats(reposData.stats);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to refresh repository data');
    }
  };

  // Triage Decision
  const handleTriageDecision = async (
    repoId: string | number,
    decision: 'keep' | 'pause' | 'retire',
    options?: { goal_date?: string | null; paused_until?: string | null }
  ) => {
    const targetRepo = repos.find((r) => String(r.id) === String(repoId));
    if (!targetRepo) return;

    setUndoStack((prev) => [
      ...prev,
      { repoId, previousMeta: { ...targetRepo.meta } },
    ]);

    try {
      await api.updateRepoMeta(repoId, {
        decision,
        goal_date: options?.goal_date,
        paused_until: options?.paused_until,
      });

      await refreshRepos();

      const actionWord = decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused' : 'Retired';
      showToast(`${actionWord} ${targetRepo.full_name}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record decision');
    }
  };

  // Undo last triage decision
  const handleUndoLastDecision = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    const newStack = undoStack.slice(0, -1);
    setUndoStack(newStack);

    try {
      await api.updateRepoMeta(lastAction.repoId, {
        decision: lastAction.previousMeta.decision,
        goal_date: lastAction.previousMeta.goal_date,
        paused_until: lastAction.previousMeta.paused_until,
      });
      await refreshRepos();
      showToast('Undid last decision');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to undo action');
    }
  };

  // Bring back retired repository from Archive
  const handleBringBack = async (repoId: string | number) => {
    const target = repos.find((r) => String(r.id) === String(repoId));
    try {
      await api.updateRepoMeta(repoId, {
        decision: 'keep',
      });
      await refreshRepos();
      showToast(`Restored ${target?.full_name || 'repository'} to active ledger`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore repository');
    }
  };

  // Save details / metadata modal
  const handleSaveRepoDetails = async (
    repoId: string | number,
    updates: { label?: string | null; goal_date?: string | null; note?: string | null }
  ) => {
    try {
      await api.updateRepoMeta(repoId, updates);
      await refreshRepos();
      showToast('Repository metadata saved');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save repository metadata');
    }
  };

  // Trigger manual sync
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await api.triggerSync(true);
      setLastSync({
        status: 'success',
        repos_read: res.repos_read || 0,
        finished_at: new Date().toISOString(),
      });
      await refreshRepos();
      showToast(res.message || 'Synchronization complete');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const res = await api.updateSettings(newSettings);
      setSettings(res.settings);
      await refreshRepos();
      showToast('Settings updated');
    } catch (err: any) {
      throw err;
    }
  };

  // Export Data JSON
  const handleExportData = () => {
    window.open('/api/export', '_blank');
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      setUser(null);
      setRepos([]);
      showToast('Account permanently deleted');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete account');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await api.logout();
    setUser(null);
    setRepos([]);
    showToast('Signed out');
  };

  // Sign out everywhere
  const handleSignOutAll = async () => {
    await api.logoutAll();
    setUser(null);
    setRepos([]);
    showToast('Signed out everywhere');
  };

  // Register Account
  const handleRegister = async (params: { login: string; email?: string; password: string; name?: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.registerUser(params);
      await loadInitialData();
      showToast(`Account created! Welcome, @${params.login}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Password Sign In
  const handlePasswordLogin = async (params: { loginOrEmail: string; password: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.loginWithPassword(params);
      await loadInitialData();
      showToast('Signed in successfully');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Connect GitHub Token (PAT)
  const handleConnectToken = async (token: string) => {
    setIsSyncing(true);
    try {
      const res = await api.connectGitHubToken(token);
      await loadInitialData();
      showToast(res.message || 'GitHub account connected!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect GitHub');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect GitHub
  const handleDisconnectGitHub = async () => {
    try {
      await api.disconnectGitHub();
      await loadInitialData();
      showToast('GitHub disconnected');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect GitHub');
    }
  };

  // Demo Login
  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await api.loginDemoUser();
      await loadInitialData();
      showToast('Welcome to RepoPulse Demo! Explore triage, ledger, and analytics.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Dev Login
  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      await api.loginDevUser();
      await loadInitialData();
      showToast('Signed in via developer mode');
    } catch (err: any) {
      setErrorMessage(err.message || 'Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // GitHub Login
  const handleGithubLogin = () => {
    api.loginWithGithub();
  };

  if (isLoading && !user) {
    return (
      <div className="main-content" style={{ maxWidth: '1040px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ width: '100%', height: '36px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)', marginBottom: '24px' }} />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  // Unauthenticated Route Guard
  if (!user) {
    return (
      <>
        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
        <OnboardingView
          onGithubLogin={handleGithubLogin}
          onRegister={handleRegister}
          onPasswordLogin={handlePasswordLogin}
          onDemoLogin={handleDemoLogin}
          onDevLogin={handleDevLogin}
          isLoading={isLoading}
        />
      </>
    );
  }

  // Authenticated Application Shell
  return (
    <Shell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      user={user}
      stats={stats}
      lastSync={lastSync}
      onSync={handleSync}
      isSyncing={isSyncing}
      onSignOut={handleSignOut}
      onSignOutAll={handleSignOutAll}
    >
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          actionText="Dismiss"
          onAction={() => setErrorMessage(null)}
        />
      )}

      {activeTab === 'overview' && (
        <OverviewView
          repos={repos}
          summarySentence={summarySentence}
          currentUsername={user.login}
          onOpenDetails={(r) => setSelectedRepoForDetail(r)}
          thresholds={{
            active: settings.active_days,
            cooling: settings.cooling_days,
            stale: settings.stale_days,
          }}
          isSyncing={isSyncing}
          isLoading={isLoading}
          onSync={handleSync}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsView />
      )}

      {activeTab === 'triage' && (
        <TriageView
          repos={repos}
          onDecision={handleTriageDecision}
          onUndoLastDecision={handleUndoLastDecision}
          hasUndoableAction={undoStack.length > 0}
        />
      )}

      {activeTab === 'archive' && (
        <ArchiveView repos={repos} onBringBack={handleBringBack} />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          settings={settings}
          installation={installation}
          onUpdateSettings={handleUpdateSettings}
          onExportData={handleExportData}
          onDeleteAccount={handleDeleteAccount}
          onConnectToken={handleConnectToken}
          onDisconnectGitHub={handleDisconnectGitHub}
          onGithubLogin={handleGithubLogin}
        />
      )}

      {/* Repository Detail Modal */}
      {selectedRepoForDetail && (
        <RepoDetailModal
          repo={selectedRepoForDetail}
          onClose={() => setSelectedRepoForDetail(null)}
          onSave={handleSaveRepoDetails}
        />
      )}
    </Shell>
  );
};
