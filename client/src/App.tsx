import { countActiveKeepRepos, getActiveKeepRepos, wouldExceedWipLimit } from '@shared';
import { WipLimitDialog } from './components/wip/WipLimitDialog.js';
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
import { LandingPage } from './components/LandingPage.js';
import { WelcomeView } from './components/WelcomeView.js';
import { ShareView } from './components/ShareView.js';
import { LegalView } from './components/LegalViews.js';
import { DesignTokensPage } from './components/DesignTokensPage.js';
import { ComponentsCatalogPage } from './components/ComponentsCatalogPage.js';
import { ShellV4 } from './components/v4/layout/ShellV4.js';
import { OverviewViewV4 } from './components/v4/OverviewViewV4.js';
import { TriageViewV4 } from './components/v4/TriageViewV4.js';
import { SettingsViewV4 } from './components/v4/SettingsViewV4.js';
import { RepoDetailDrawerV4 } from './components/v4/RepoDetailDrawerV4.js';
import { ArchiveViewV4 } from './components/v4/ArchiveViewV4.js';
import { DecisionsViewV4 } from './components/v4/DecisionsViewV4.js';
import { DigestViewV4 } from './components/v4/DigestViewV4.js';
import { ShareViewV4 } from './components/v4/ShareViewV4.js';
import { AnalyticsViewV4 } from './components/v4/AnalyticsViewV4.js';
import { LandingPageV4 } from './components/v4/LandingPageV4.js';
import { FirstRunExperienceV4 } from './components/v4/onboarding/FirstRunExperienceV4.js';
import { FeedbackPromptV4 } from './components/v4/FeedbackPromptV4.js';
import { getDemoRepos, computeDemoStats } from './data/demoRepos.js';
import { OverviewSkeletonV4 } from './components/v4/OverviewSkeletonV4.js';
import { useFeatureFlag } from './hooks/useFeatureFlag.js';
import { showAppToast } from './lib/toast.js';
import { SkeletonRow, ErrorBanner } from './components/FeedbackComponents.js';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [installations, setInstallations] = useState<any[]>([]);
  const [authStatus, setAuthStatus] = useState<{
    githubConfigured: boolean;
    githubAppConfigured?: boolean;
    demoEnabled: boolean;
    appSlug?: string | null;
    installUrl?: string | null;
  } | null>(null);
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [summarySentence, setSummarySentence] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'triage' | 'archive' | 'settings' | 'share'
  >(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'decisions' || tabParam === 'archive') return 'archive';
    if (tabParam === 'digest' || tabParam === 'share') return 'share';
    if (tabParam === 'triage') return 'triage';
    if (tabParam === 'analytics') return 'analytics';
    if (tabParam === 'settings') return 'settings';
    if (window.location.pathname === '/share') return 'share';
    return 'overview';
  });
  const { isV4, version: uiVersion, setVersion: setUiVersion, isScreenV4, wipLimitEnabled } = useFeatureFlag();
  const [isDesignTokensRoute, setIsDesignTokensRoute] = useState<boolean>(
    () =>
      window.location.pathname === '/design-tokens' ||
      new URLSearchParams(window.location.search).get('tab') === 'tokens'
  );
  const [isComponentsRoute, setIsComponentsRoute] = useState<boolean>(
    () =>
      window.location.pathname === '/components' ||
      new URLSearchParams(window.location.search).get('tab') === 'components'
  );
  const [selectedRepoForDetail, setSelectedRepoForDetail] = useState<Repository | null>(null);
  const [isWelcomeRoute, setIsWelcomeRoute] = useState<boolean>(() => window.location.pathname === '/welcome');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get('demo') === 'true'
  );
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(() => {
    if (window.location.pathname === '/privacy') return 'privacy';
    if (window.location.pathname === '/terms') return 'terms';
    return null;
  });
  const [devEnabled, setDevEnabled] = useState<boolean>(false);



  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [wipDialogTarget, setWipDialogTarget] = useState<Repository | null>(null);
  const activeKeepCount = countActiveKeepRepos(repos);
  const currentWipLimit = settings.wipLimit !== undefined ? settings.wipLimit : settings.wip_limit;

  // Undo stack for triage
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const showToast = (msg: string, onUndo?: () => void) => {
    showAppToast(msg, onUndo ? { onUndo } : undefined);
  };

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const key = 'repopulse-theme';
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem(key);
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', dark);
    } else {
      root.setAttribute('data-theme', settings.theme);
      localStorage.setItem(key, settings.theme);
      root.classList.toggle('dark', settings.theme === 'dark');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (meta) meta.setAttribute('content', isDark ? '#101827' : '#f5f7fb');
  }, [settings.theme]);

  // Check auth status for dev mode and GitHub App install URL
  useEffect(() => {
    api.fetchAuthStatus().then((st) => {
      setDevEnabled(st.demoEnabled);
      setAuthStatus(st);
    }).catch(() => {});
  }, []);

  // Launch Demo Mode directly
  const handleTryDemo = useCallback((skipWelcome: boolean = false) => {
    const demoReposList = getDemoRepos();
    const demoStats = computeDemoStats(demoReposList);
    setUser({
      id: 999,
      login: 'demo-developer',
      name: 'Demo Developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
      created_at: new Date().toISOString(),
    });
    setInstallation({
      connected: true,
      account_login: 'demo-developer',
      repository_selection: 'selected',
      repository_count: demoReposList.length,
    });
    setLastSync({
      status: 'success',
      repos_read: demoReposList.length,
      finished_at: new Date().toISOString(),
    });
    setRepos(demoReposList);
    setStats(demoStats);
    setSummarySentence(demoStats.summarySentence || '');
    setIsDemoMode(true);
    if (skipWelcome) {
      setIsWelcomeRoute(false);
      const url = new URL(window.location.href);
      url.searchParams.set('demo', 'true');
      const tabParam = url.searchParams.get('tab');
      if (tabParam === 'decisions' || tabParam === 'archive') setActiveTab('archive');
      else if (tabParam === 'digest' || tabParam === 'share') setActiveTab('share');
      else if (tabParam === 'triage') setActiveTab('triage');
      else if (tabParam === 'analytics') setActiveTab('analytics');
      else if (tabParam === 'settings') setActiveTab('settings');
      else setActiveTab('overview');
      window.history.pushState({}, '', url.toString());
    } else {
      setIsWelcomeRoute(true);
      window.history.pushState({}, '', '/welcome?demo=true');
    }
  }, []);

  // Complete Onboarding Flow
  const handleCompleteOnboarding = async (
    finalRepos: Repository[],
    decisions: Record<number, 'keep' | 'pause' | 'retire'>
  ) => {
    setRepos(finalRepos);
    const updatedStats = computeDemoStats(finalRepos);
    setStats(updatedStats);
    setSummarySentence(updatedStats.summarySentence || '');
    setIsWelcomeRoute(false);
    window.history.pushState({}, '', isDemoMode ? '/?demo=true' : '/');
    setActiveTab('overview');

    if (!isDemoMode && user) {
      for (const [repoIdStr, verdict] of Object.entries(decisions)) {
        try {
          await api.updateRepoMeta(Number(repoIdStr), { decision: verdict });
        } catch {
          // continue
        }
      }
      await refreshRepos();
    }

    showAppToast('First triage complete! Welcome to your RepoPulse ledger.');
  };

  // Load user profile and initial repository data via /api/me
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const searchParams = new URLSearchParams(window.location.search);
    const isDemoQuery = searchParams.get('demo') === 'true';
    const skipWelcome =
      searchParams.get('skipOnboarding') === 'true' || searchParams.get('welcome') === 'false';
    if (isDemoQuery) {
      handleTryDemo(skipWelcome);
      setIsLoading(false);
      return;
    }

    try {
      const meData = await api.fetchMe();
      setUser(meData.user);
      setSettings(meData.settings);
      setInstallation(meData.installation);
      setInstallations(meData.installations || []);
      setLastSync(meData.last_sync);

      const reposData = await api.fetchRepos();
      setRepos(reposData.repos);
      setSummarySentence(reposData.summary);
      setStats(reposData.stats);

      // If user has zero repos and is on /welcome or first login
      if (reposData.repos.length === 0 && meData.user && window.location.pathname === '/welcome') {
        setIsWelcomeRoute(true);
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
    options?: {
      goal_date?: string | null;
      paused_until?: string | null;
      override?: boolean;
      wip_override?: boolean;
      skipWipCheck?: boolean;
    }
  ) => {
    const targetRepo = repos.find((r) => String(r.id) === String(repoId));
    if (!targetRepo) return;

    const isAlreadyKeep = targetRepo.meta?.decision === 'keep';
    const shouldCheckWip =
      wipLimitEnabled &&
      typeof currentWipLimit === 'number' &&
      currentWipLimit > 0 &&
      decision === 'keep' &&
      !isAlreadyKeep &&
      !options?.skipWipCheck &&
      !options?.override &&
      !options?.wip_override &&
      activeTab !== 'triage';

    if (shouldCheckWip && wouldExceedWipLimit(activeKeepCount, isAlreadyKeep, currentWipLimit)) {
      setWipDialogTarget(targetRepo);
      return;
    }

    const isOverLimitInTriage =
      decision === 'keep' &&
      !isAlreadyKeep &&
      activeTab === 'triage' &&
      wipLimitEnabled &&
      typeof currentWipLimit === 'number' &&
      currentWipLimit > 0 &&
      wouldExceedWipLimit(activeKeepCount, isAlreadyKeep, currentWipLimit);

    const finalWipOverride = Boolean(options?.wip_override || options?.override || isOverLimitInTriage);

    setUndoStack((prev) => [
      ...prev,
      { repoId, previousMeta: { ...targetRepo.meta } },
    ]);

    const triggerUndo = () => {
      handleUndoLastDecision();
    };

    if (isDemoMode) {
      setRepos((prev) =>
        prev.map((r) =>
          String(r.id) === String(repoId)
            ? {
                ...r,
                is_retired: decision === 'retire',
                is_paused: decision === 'pause',
                meta: {
                  ...r.meta,
                  decision,
                  decided_at: new Date().toISOString(),
                  wip_override: finalWipOverride,
                  override: finalWipOverride,
                  goal_date: options?.goal_date ?? r.meta?.goal_date ?? null,
                  paused_until: options?.paused_until ?? r.meta?.paused_until ?? null,
                },
              }
            : r
        )
      );
      const actionWord = decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused' : 'Retired';
      showToast(`${actionWord} ${targetRepo.full_name}`, triggerUndo);
      return;
    }

    try {
      await api.updateRepoMeta(repoId, {
        decision,
        goal_date: options?.goal_date,
        paused_until: options?.paused_until,
        wip_override: finalWipOverride,
        override: finalWipOverride,
      });

      await refreshRepos();

      const actionWord = decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused' : 'Retired';
      showToast(`${actionWord} ${targetRepo.full_name}`, triggerUndo);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record decision');
    }
  };

  const handlePauseInstead = async (repoToPause: Repository, target: Repository) => {
    await handleTriageDecision(repoToPause.id, 'pause', { skipWipCheck: true });
    await handleTriageDecision(target.id, 'keep', { skipWipCheck: true });
    setWipDialogTarget(null);
  };

  const handleRaiseLimit = async (newLimit: number, target: Repository) => {
    await handleUpdateSettings({ wipLimit: newLimit, wip_limit: newLimit });
    await handleTriageDecision(target.id, 'keep', { skipWipCheck: true });
    setWipDialogTarget(null);
  };

  const handleKeepAnyway = async (target: Repository) => {
    await handleTriageDecision(target.id, 'keep', {
      override: true,
      wip_override: true,
      skipWipCheck: true,
    });
    setWipDialogTarget(null);
  };

  // Undo last triage decision
  const handleUndoLastDecision = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    const newStack = undoStack.slice(0, -1);
    setUndoStack(newStack);

    if (isDemoMode) {
      setRepos((prev) =>
        prev.map((r) =>
          String(r.id) === String(lastAction.repoId)
            ? {
                ...r,
                is_retired: lastAction.previousMeta.decision === 'retire',
                is_paused: lastAction.previousMeta.decision === 'pause',
                meta: {
                  ...r.meta,
                  decision: lastAction.previousMeta.decision,
                  goal_date: lastAction.previousMeta.goal_date,
                  paused_until: lastAction.previousMeta.paused_until,
                },
              }
            : r
        )
      );
      showToast('Undid last decision');
      return;
    }

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

    if (isDemoMode) {
      setRepos((prev) =>
        prev.map((r) =>
          String(r.id) === String(repoId)
            ? {
                ...r,
                is_retired: false,
                is_paused: false,
                meta: {
                  ...r.meta,
                  decision: 'keep',
                  decided_at: new Date().toISOString(),
                },
              }
            : r
        )
      );
      showToast(`Restored ${target?.full_name || 'repository'} to active ledger`);
      return;
    }

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

  // Deep-link helpers for opening/closing/navigating repo drawer
  const handleOpenRepoDetail = (repo: Repository) => {
    setSelectedRepoForDetail(repo);
    const url = new URL(window.location.href);
    url.searchParams.set('repo', String(repo.id));
    window.history.pushState({}, '', url.toString());
  };

  const handleCloseRepoDetail = () => {
    setSelectedRepoForDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('repo');
    url.searchParams.delete('repoId');
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectRepoInDrawer = (nextRepo: Repository) => {
    setSelectedRepoForDetail(nextRepo);
    const url = new URL(window.location.href);
    url.searchParams.set('repo', String(nextRepo.id));
    window.history.pushState({}, '', url.toString());
  };

  // Sync URL deep-link (?repo=<id>)
  useEffect(() => {
    const checkRepoInUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const repoParam = params.get('repo') || params.get('repoId');
      if (repoParam && repos.length > 0) {
        const found = repos.find(
          (r) => String(r.id) === repoParam || r.full_name === repoParam
        );
        setSelectedRepoForDetail(found || null);
      }
    };

    checkRepoInUrl();
    window.addEventListener('popstate', checkRepoInUrl);
    return () => window.removeEventListener('popstate', checkRepoInUrl);
  }, [repos]);

  // Trigger manual sync
  const handleSync = async () => {
    if (isSyncing) return;

    if (isDemoMode) {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setLastSync({
          status: 'success',
          repos_read: repos.length,
          finished_at: new Date().toISOString(),
        });
        showToast('Demo repositories refreshed');
      }, 500);
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await api.triggerSync();
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
    const res = await api.updateSettings(newSettings);
    setSettings(res.settings);
    await refreshRepos();
    showToast('Settings updated');
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
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setRepos([]);
      window.history.pushState({}, '', '/');
      showToast('Signed out of demo mode');
      return;
    }
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

  if (isDesignTokensRoute) {
    return (
      <DesignTokensPage
        onBack={() => {
          setIsDesignTokensRoute(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (isComponentsRoute) {
    return (
      <ComponentsCatalogPage
        onBack={() => {
          setIsComponentsRoute(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (isLoading && !user) {
    if (isScreenV4('landing')) {
      return (
        <div className="max-w-4xl mx-auto p-6 md:p-12">
          <OverviewSkeletonV4 />
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-6 pt-10 md:px-8">
        <Skeleton className="h-9 w-64" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  // Unauthenticated Route Guard: Show clean Landing Page or Legal View
  if (!user) {
    if (legalView) {
      return (
        <LegalView
          type={legalView}
          onBack={() => {
            setLegalView(null);
            window.history.pushState({}, '', '/');
          }}
        />
      );
    }

    if (isScreenV4('landing')) {
      return (
        <LandingPageV4
          onGithubLogin={handleGithubLogin}
          onDevLogin={handleDevLogin}
          onTryDemo={handleTryDemo}
          devEnabled={devEnabled}
          onNavigateLegal={(type) => {
            setLegalView(type);
            window.history.pushState({}, '', `/${type}`);
          }}
          onOpenDesignTokens={() => {
            setIsDesignTokensRoute(true);
            window.history.pushState({}, '', '/design-tokens');
          }}
          onOpenComponents={() => {
            setIsComponentsRoute(true);
            window.history.pushState({}, '', '/components');
          }}
        />
      );
    }

    return (
      <LandingPage
        onGithubLogin={handleGithubLogin}
        onDevLogin={handleDevLogin}
        devEnabled={devEnabled}
        onNavigateLegal={(type) => {
          setLegalView(type);
          window.history.pushState({}, '', `/${type}`);
        }}
        onOpenDesignTokens={() => {
          setIsDesignTokensRoute(true);
          window.history.pushState({}, '', '/design-tokens');
        }}
        onOpenComponents={() => {
          setIsComponentsRoute(true);
          window.history.pushState({}, '', '/components');
        }}
      />
    );
  }

  // First-time Onboarding View at /welcome
  if (isWelcomeRoute) {
    if (isScreenV4('landing')) {
      return (
        <FirstRunExperienceV4
          candidateRepos={isDemoMode ? getDemoRepos() : repos}
          user={user}
          installUrl={authStatus?.installUrl}
          onGithubLogin={handleGithubLogin}
          onTryDemo={handleTryDemo}
          onRefreshRepos={refreshRepos}
          onCompleteOnboarding={handleCompleteOnboarding}
          onExitOnboarding={() => {
            setIsWelcomeRoute(false);
            window.history.pushState({}, '', isDemoMode ? '/?demo=true' : '/');
            setActiveTab('overview');
          }}
          isDemoMode={isDemoMode}
        />
      );
    }

    return (
      <WelcomeView
        repos={repos}
        onRefreshRepos={refreshRepos}
        onComplete={() => {
          setIsWelcomeRoute(false);
          window.history.pushState({}, '', '/');
          setActiveTab('overview');
        }}
        onStartTriage={() => {
          setIsWelcomeRoute(false);
          window.history.pushState({}, '', '/');
          setActiveTab('triage');
        }}
      />
    );
  }

  // Authenticated Application Shell (V4 or V3)
  const CurrentShell = isScreenV4('shell') ? ShellV4 : Shell;

  return (
    <CurrentShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      user={user}
      stats={stats}
      lastSync={lastSync}
      onSync={handleSync}
      isSyncing={isSyncing}
      onSignOut={handleSignOut}
      onSignOutAll={handleSignOutAll}
      onOpenDesignTokens={() => {
        setIsDesignTokensRoute(true);
        window.history.pushState({}, '', '/design-tokens');
      }}
      onOpenComponents={() => {
        setIsComponentsRoute(true);
        window.history.pushState({}, '', '/components');
      }}
      uiVersion={uiVersion}
      onToggleUiVersion={() => setUiVersion(isV4 ? 'v3' : 'v4')}
      onSelectRepo={(repoId) => {
        const found = repos.find((r) => String(r.id) === String(repoId));
        if (found) setSelectedRepoForDetail(found);
      }}
    >
      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          actionText="Dismiss"
          onAction={() => setErrorMessage(null)}
        />
      )}

      {activeTab === 'overview' && (
        isScreenV4('ledger') ? (
          <OverviewViewV4
            repos={repos}
            summarySentence={summarySentence}
            currentUsername={user.login}
            onOpenDetails={handleOpenRepoDetail}
            thresholds={{
              active: settings.active_days,
              cooling: settings.cooling_days,
              stale: settings.stale_days,
            }}
            isSyncing={isSyncing}
            isLoading={isLoading}
            onSync={handleSync}
            onStartTriage={() => setActiveTab('triage')}
            onDecision={handleTriageDecision}
            onUpdateLabel={async (repoId, label) => {
              await api.updateRepoMeta(repoId, { label: label || null });
              await refreshRepos();
            }}
            installUrl={authStatus?.installUrl}
            installations={installations}
            onTryDemo={handleTryDemo}
          />
        ) : (
          <OverviewView
            repos={repos}
            summarySentence={summarySentence}
            currentUsername={user.login}
            onOpenDetails={handleOpenRepoDetail}
            thresholds={{
              active: settings.active_days,
              cooling: settings.cooling_days,
              stale: settings.stale_days,
            }}
            isSyncing={isSyncing}
            isLoading={isLoading}
            onSync={handleSync}
          />
        )
      )}

      {activeTab === 'analytics' && (
        isScreenV4('analytics') ? (
          <AnalyticsViewV4 onNavigateShare={() => setActiveTab('share')} />
        ) : (
          <AnalyticsView onNavigateShare={() => setActiveTab('share')} />
        )
      )}

      {activeTab === 'share' && user && (
        isScreenV4('digest') ? (
          <ShareViewV4
            user={user}
            repos={repos}
            stats={stats}
            summarySentence={summarySentence}
            onStartTriage={() => setActiveTab('triage')}
          />
        ) : (
          <ShareView
            user={user}
            repos={repos}
            stats={stats}
            summarySentence={summarySentence}
          />
        )
      )}

      {activeTab === 'triage' && (
        isScreenV4('triage') ? (
          <TriageViewV4
            repos={repos}
            onDecision={handleTriageDecision}
            onUndoLastDecision={handleUndoLastDecision}
            hasUndoableAction={undoStack.length > 0}
            onExitTriage={() => setActiveTab('overview')}
          />
        ) : (
          <TriageView
            repos={repos}
            onDecision={handleTriageDecision}
            onUndoLastDecision={handleUndoLastDecision}
            hasUndoableAction={undoStack.length > 0}
            wipLimit={currentWipLimit}
            wipLimitEnabled={wipLimitEnabled}
            activeKeepCount={activeKeepCount}
          />
        )
      )}

      {activeTab === 'archive' && (
        isScreenV4('decisions') ? (
          <DecisionsViewV4
            repos={repos}
            onBringBack={handleBringBack}
            onDecision={handleTriageDecision}
          />
        ) : (
          <ArchiveView repos={repos} onBringBack={handleBringBack} />
        )
      )}

      {activeTab === 'settings' && (
        isScreenV4('settings') ? (
          <SettingsViewV4
            settings={settings}
            installation={installation}
            installations={installations}
            installUrl={authStatus?.installUrl}
            onUpdateSettings={handleUpdateSettings}
            onExportData={handleExportData}
            onDeleteAccount={handleDeleteAccount}
          />
        ) : (
          <SettingsView
            settings={settings}
            installation={installation}
            installations={installations}
            onUpdateSettings={handleUpdateSettings}
            onExportData={handleExportData}
            onDeleteAccount={handleDeleteAccount}
          />
        )
      )}

      {/* Repository Detail Modal (v3) or Slide-over Sheet Drawer (v4) */}
      {selectedRepoForDetail && (
        isScreenV4('drawer') ? (
          <RepoDetailDrawerV4
            repo={selectedRepoForDetail}
            allRepos={repos.filter((r) => !r.is_retired)}
            onClose={handleCloseRepoDetail}
            onSelectRepo={handleSelectRepoInDrawer}
            onSave={handleSaveRepoDetails}
            onDecision={handleTriageDecision}
          />
        ) : (
          <RepoDetailModal
            repo={selectedRepoForDetail}
            onClose={handleCloseRepoDetail}
            onSave={handleSaveRepoDetails}
          />
        )
      )}
          {/* Work in progress limit dialog */}
      {wipDialogTarget && typeof currentWipLimit === 'number' && (
        <WipLimitDialog
          isOpen={Boolean(wipDialogTarget)}
          onClose={() => setWipDialogTarget(null)}
          targetRepo={wipDialogTarget}
          currentKeepRepos={getActiveKeepRepos(repos)}
          wipLimit={currentWipLimit}
          onPauseInstead={handlePauseInstead}
          onRaiseLimit={handleRaiseLimit}
          onKeepAnyway={handleKeepAnyway}
        />
      )}

      {/* Design Feedback Prompt (v4 rollout) */}
      {isV4 && (
        <FeedbackPromptV4
          onSwitchToClassic={() => {
            setUiVersion('v3');
            showToast('Switched back to classic view');
          }}
        />
      )}
    </CurrentShell>
  );
};
