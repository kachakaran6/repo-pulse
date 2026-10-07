import React, { useState, useEffect, useCallback } from 'react';
import type { Repository, UserProfile, UserSettings, InstallationStatus, SummaryStats, RepoMetadata } from './types.js';
import * as api from './api.js';
import { Shell } from './components/Shell.js';
import { OverviewView } from './components/OverviewView.js';
import { TriageView } from './components/TriageView.js';
import { ArchiveView } from './components/ArchiveView.js';
import { SettingsView } from './components/SettingsView.js';
import { RepoDetailModal } from './components/RepoDetailModal.js';
import { OnboardingView } from './components/OnboardingView.js';
import { SkeletonRow, Toast, ErrorBanner } from './components/FeedbackComponents.js';

interface UndoAction {
  repoId: number;
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
  const [repos, setRepos] = useState<Repository[]>([]);
  const [summarySentence, setSummarySentence] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'triage' | 'archive' | 'settings'>('overview');
  const [selectedRepoForDetail, setSelectedRepoForDetail] = useState<Repository | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  // Load user profile and initial repository data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const meData = await api.fetchMe();
      setUser(meData.user);
      setSettings(meData.settings);
      setInstallation(meData.installation);

      const reposData = await api.fetchRepos();
      setRepos(reposData.repos);
      setSummarySentence(reposData.summary);
      setStats(reposData.stats);
    } catch (err: any) {
      // User is not signed in or session is unauthenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Reload repos when needed
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
    repoId: number,
    decision: 'keep' | 'pause' | 'retire',
    options?: { goal_date?: string | null; paused_until?: string | null }
  ) => {
    const targetRepo = repos.find((r) => r.id === repoId);
    if (!targetRepo) return;

    // Save previous state to undo stack
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
  const handleBringBack = async (repoId: number) => {
    const target = repos.find((r) => r.id === repoId);
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
    repoId: number,
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

  // Demo Login
  const handleDemoLogin = async (username: string) => {
    setIsLoading(true);
    try {
      await api.loginDemoUser(username);
      await loadInitialData();
      showToast(`Signed in as ${username}`);
    } catch (err: any) {
      setErrorMessage('Failed to sign in demo user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Shell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      user={user}
      stats={stats}
      onSync={handleSync}
      isSyncing={isSyncing}
      onSignOut={handleSignOut}
      onSignOutAll={handleSignOutAll}
    >
      {/* Toast Notice */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}

      {/* Error Banner */}
      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          actionText="Dismiss"
          onAction={() => setErrorMessage(null)}
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div>
          <div style={{ width: '100%', height: '48px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: '16px' }} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : !user ? (
        /* Unauthenticated Onboarding / Sign-in */
        <OnboardingView onDemoLogin={handleDemoLogin} isLoading={isLoading} />
      ) : (
        /* Authenticated Main Views */
        <>
          {activeTab === 'overview' && (
            <OverviewView
              repos={repos}
              summarySentence={summarySentence}
              onOpenDetails={(r) => setSelectedRepoForDetail(r)}
              onQuickLabel={(r, label) => handleSaveRepoDetails(r.id, { label })}
              thresholds={{
                active: settings.active_days,
                cooling: settings.cooling_days,
                stale: settings.stale_days,
              }}
            />
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
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          )}
        </>
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
