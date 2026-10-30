import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Repository, UserProfile, RepoStatus } from '../../../types.js';
import { Button } from '../ui/Button.js';
import { Switch } from '../ui/Switch.js';
import { Checkbox } from '../ui/Checkbox.js';
import { ScoreRing, calculateRepoScore } from '../ledger/ScoreRing.js';
import { ActivitySparkline } from '../ledger/ActivitySparkline.js';
import { LanguageDot } from '../ledger/LanguageDot.js';
import { CommitStripV4 } from '../CommitStripV4.js';
import {
  Sparkles,
  GitFork,
  Archive,
  Lock,
  Search,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  SkipForward,
  Star,
  ExternalLink,
  ShieldCheck,
  Flame,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '../ui/Toast.js';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={`inline-block shrink-0 ${className}`}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export type OnboardingStep = 'connect' | 'select' | 'sync' | 'triage' | 'complete';

export interface FirstRunExperienceV4Props {
  initialStep?: OnboardingStep;
  candidateRepos: Repository[];
  user: UserProfile | null;
  onGithubLogin: () => void;
  onTryDemo: () => void;
  onCompleteOnboarding: (
    finalRepos: Repository[],
    decisions: Record<number, 'keep' | 'pause' | 'retire'>
  ) => void;
  onExitOnboarding?: () => void;
  isDemoMode?: boolean;
}

export const FirstRunExperienceV4: React.FC<FirstRunExperienceV4Props> = ({
  initialStep = 'connect',
  candidateRepos,
  user,
  onGithubLogin,
  onTryDemo,
  onCompleteOnboarding,
  onExitOnboarding,
  isDemoMode = false,
}) => {
  // If user is already authenticated or in demo mode, skip connect and go to select
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    if (initialStep) return initialStep;
    if (user || isDemoMode || candidateRepos.length > 0) return 'select';
    return 'connect';
  });

  // Automatically advance to 'select' if candidateRepos populate or user signs in
  useEffect(() => {
    if (currentStep === 'connect' && (user || isDemoMode || candidateRepos.length > 0)) {
      setCurrentStep('select');
    }
  }, [user, isDemoMode, candidateRepos.length, currentStep]);

  // --- STEP 2: REPOSITORY SELECTION STATE ---
  const [includeForks, setIncludeForks] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(() => {
    // Default selection: select all non-fork and non-archived repos
    const initial = new Set<number>();
    for (const r of candidateRepos) {
      const isFork = (r as any).is_fork;
      const isArchived = r.archived_on_github || (r as any).is_archived;
      if (!isFork && !isArchived) {
        initial.add(r.id);
      }
    }
    return initial;
  });

  // Re-sync initial selection when candidateRepos loads if empty
  useEffect(() => {
    if (selectedRepoIds.size === 0 && candidateRepos.length > 0) {
      const initial = new Set<number>();
      for (const r of candidateRepos) {
        const isFork = (r as any).is_fork;
        const isArchived = r.archived_on_github || (r as any).is_archived;
        if (!isFork && !isArchived) {
          initial.add(r.id);
        }
      }
      setSelectedRepoIds(initial);
    }
  }, [candidateRepos, selectedRepoIds.size]);

  // Filter candidate repos based on toggles and search query
  const visibleCandidateRepos = useMemo(() => {
    return candidateRepos.filter((r) => {
      const isFork = (r as any).is_fork;
      const isArchived = r.archived_on_github || (r as any).is_archived;

      if (!includeForks && isFork) return false;
      if (!includeArchived && isArchived) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.full_name.toLowerCase().includes(q);
        const matchesDesc = (r as any).description?.toLowerCase().includes(q);
        const matchesLang = r.language?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLang) return false;
      }

      return true;
    });
  }, [candidateRepos, includeForks, includeArchived, searchQuery]);

  const toggleRepoSelection = (id: number) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      for (const r of visibleCandidateRepos) {
        next.add(r.id);
      }
      return next;
    });
  };

  const handleDeselectAllVisible = () => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      for (const r of visibleCandidateRepos) {
        next.delete(r.id);
      }
      return next;
    });
  };

  // --- STEP 3: CALM SYNC PROGRESS STATE ---
  const [syncProgressCount, setSyncProgressCount] = useState(0);
  const [syncStageIndex, setSyncStageIndex] = useState(0);
  const [currentSyncingRepoName, setCurrentSyncingRepoName] = useState('');
  const [isSyncComplete, setIsSyncComplete] = useState(false);

  const selectedReposList = useMemo(() => {
    return candidateRepos.filter((r) => selectedRepoIds.has(r.id));
  }, [candidateRepos, selectedRepoIds]);

  const startCalmSync = () => {
    setCurrentStep('sync');
    setSyncProgressCount(0);
    setSyncStageIndex(0);
    setIsSyncComplete(false);

    const totalToSync = selectedReposList.length || 15;
    let currentIdx = 0;

    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx <= totalToSync) {
        setSyncProgressCount(currentIdx);
        const repo = selectedReposList[currentIdx - 1];
        if (repo) {
          setCurrentSyncingRepoName(repo.full_name);
        }

        // Advance checklist stages smoothly
        const progressRatio = currentIdx / totalToSync;
        if (progressRatio > 0.8) {
          setSyncStageIndex(4);
        } else if (progressRatio > 0.6) {
          setSyncStageIndex(3);
        } else if (progressRatio > 0.35) {
          setSyncStageIndex(2);
        } else if (progressRatio > 0.1) {
          setSyncStageIndex(1);
        }
      } else {
        clearInterval(interval);
        setSyncStageIndex(5);
        setIsSyncComplete(true);
      }
    }, 180);
  };

  // --- STEP 4: GUIDED 5-REPO TRIAGE STATE ---
  // Select 5 cooling/stale candidate repos for the guided triage
  const guidedTriageQueue = useMemo(() => {
    const list = selectedReposList.filter((r) => {
      if (r.is_retired || r.is_paused) return false;
      return r.status === 'cooling' || r.status === 'stale';
    });

    // If fewer than 5 cooling/stale, fill with active or dormant repos
    if (list.length < 5) {
      const others = selectedReposList.filter((r) => !list.some((item) => item.id === r.id));
      list.push(...others);
    }

    return list.slice(0, 5);
  }, [selectedReposList]);

  const [triageIndex, setTriageIndex] = useState(0);
  const [decisionsRecord, setDecisionsRecord] = useState<Record<number, 'keep' | 'pause' | 'retire'>>({});
  const [undoStack, setUndoStack] = useState<{ id: number; prevVerdict?: 'keep' | 'pause' | 'retire' }[]>([]);

  const handleMakeDecision = (verdict: 'keep' | 'pause' | 'retire') => {
    const currentRepo = guidedTriageQueue[triageIndex];
    if (!currentRepo) return;

    setDecisionsRecord((prev) => ({
      ...prev,
      [currentRepo.id]: verdict,
    }));

    setUndoStack((prev) => [...prev, { id: currentRepo.id, prevVerdict: decisionsRecord[currentRepo.id] }]);

    // Move to next or complete
    if (triageIndex < guidedTriageQueue.length - 1) {
      setTriageIndex((prev) => prev + 1);
    } else {
      // Completed all 5!
      setCurrentStep('complete');
    }
  };

  const handleSkip = () => {
    if (triageIndex < guidedTriageQueue.length - 1) {
      setTriageIndex((prev) => prev + 1);
    } else {
      setCurrentStep('complete');
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setDecisionsRecord((prev) => {
      const next = { ...prev };
      if (last.prevVerdict) {
        next[last.id] = last.prevVerdict;
      } else {
        delete next[last.id];
      }
      return next;
    });

    if (triageIndex > 0) {
      setTriageIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation for Triage mode
  useEffect(() => {
    if (currentStep !== 'triage') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        handleMakeDecision('keep');
      } else if (key === 'p') {
        e.preventDefault();
        handleMakeDecision('pause');
      } else if (key === 'r') {
        e.preventDefault();
        handleMakeDecision('retire');
      } else if (key === 's') {
        e.preventDefault();
        handleSkip();
      } else if (key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, triageIndex, guidedTriageQueue, decisionsRecord]);

  // Finish onboarding and enter ledger
  const handleFinishOnboarding = () => {
    // Apply decisions to selectedReposList
    const finalRepos = selectedReposList.map((r) => {
      const decision = decisionsRecord[r.id];
      if (decision) {
        return {
          ...r,
          is_retired: decision === 'retire',
          is_paused: decision === 'pause',
          meta: {
            ...r.meta,
            decision,
            decided_at: new Date().toISOString(),
          },
        };
      }
      return r;
    });

    onCompleteOnboarding(finalRepos, decisionsRecord);
  };

  // --- RENDER STEPS ---

  return (
    <div className="min-h-screen bg-neutral-1 text-neutral-12 flex flex-col justify-between font-sans selection:bg-neutral-4">
      {/* Top Quiet Step Bar */}
      <header className="border-b border-neutral-4 px-6 md:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold tracking-tight text-neutral-12">
            RepoPulse
          </span>
          <span className="text-2xs font-mono text-neutral-8 px-1.5 py-0.5 rounded-xs border border-neutral-4">
            v4 onboarding
          </span>
          {isDemoMode && (
            <span className="text-2xs font-mono text-neutral-11 bg-neutral-3 px-2 py-0.5 rounded-xs border border-neutral-5">
              Demo sandbox
            </span>
          )}
        </div>

        {/* Step Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-8">
          <span className={cn(currentStep === 'connect' && 'text-neutral-12 font-bold')}>1. Connect</span>
          <span>→</span>
          <span className={cn(currentStep === 'select' && 'text-neutral-12 font-bold')}>2. Select</span>
          <span>→</span>
          <span className={cn(currentStep === 'sync' && 'text-neutral-12 font-bold')}>3. Sync</span>
          <span>→</span>
          <span className={cn(currentStep === 'triage' && 'text-neutral-12 font-bold')}>4. Triage</span>
          <span>→</span>
          <span className={cn(currentStep === 'complete' && 'text-neutral-12 font-bold')}>5. Ready</span>
        </div>

        {onExitOnboarding && (
          <button
            type="button"
            onClick={onExitOnboarding}
            className="text-xs text-neutral-9 hover:text-neutral-12 font-sans cursor-pointer transition-colors"
          >
            Skip to Ledger
          </button>
        )}
      </header>

      {/* Main Step Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col justify-center">
        {/* ================= STEP 1: CONNECT GITHUB / DEMO ================= */}
        {currentStep === 'connect' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-normal">
            <div className="space-y-3 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-12">
                Connect your repositories
              </h1>
              <p className="text-sm text-neutral-10 leading-relaxed">
                RepoPulse constructs a calibrated 90-day activity ledger from commit counts and
                timestamps. We never read or analyze your source code.
              </p>
            </div>

            {/* Path Options */}
            <div className="space-y-4 pt-2">
              {/* Option A: GitHub App OAuth */}
              <div className="p-5 border border-neutral-5 rounded-xs bg-neutral-2/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-12 flex items-center gap-2">
                      <GithubIcon size={16} />
                      <span>Continue with GitHub</span>
                    </h2>
                    <p className="text-xs text-neutral-9 mt-1 leading-normal">
                      Connect your GitHub account or organization with read-only repository metadata.
                      You choose which repositories to track in the next step.
                    </p>
                  </div>
                </div>

                <Button
                  id="onboarding-github-connect-btn"
                  variant="primary"
                  size="md"
                  onClick={onGithubLogin}
                  className="w-full sm:w-auto"
                >
                  <GithubIcon size={15} className="mr-2" />
                  Connect GitHub Account
                </Button>
              </div>

              {/* Option B: Try with Demo Data */}
              <div className="p-5 border border-neutral-5 rounded-xs bg-neutral-2/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-12 flex items-center gap-2">
                      <Sparkles size={16} className="text-neutral-12" />
                      <span>Try with demo data</span>
                    </h2>
                    <p className="text-xs text-neutral-9 mt-1 leading-normal">
                      Explore the complete onboarding flow and ledger experience instantly with 20
                      pre-populated repositories across active, cooling, and dormant states.
                    </p>
                  </div>
                </div>

                <Button
                  id="onboarding-try-demo-btn"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    onTryDemo();
                    setCurrentStep('select');
                  }}
                  className="w-full sm:w-auto"
                >
                  <Sparkles size={14} className="mr-2" />
                  Load Demo Repositories
                </Button>
              </div>
            </div>

            {/* Read-Only Assurance Note */}
            <div className="flex items-start gap-2.5 pt-2 text-2xs text-neutral-8">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" />
              <span>
                Zero write permissions. Access can be revoked at any time directly through your GitHub settings.
              </span>
            </div>
          </div>
        )}

        {/* ================= STEP 2: CHOOSE WHICH REPOS TO INCLUDE ================= */}
        {currentStep === 'select' && (
          <div className="space-y-6 animate-in fade-in duration-normal">
            {/* Header & Description */}
            <div className="border-b border-neutral-4 pb-4 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-12">
                Choose repositories to track
              </h1>
              <p className="text-xs sm:text-sm text-neutral-9">
                Select the projects you want in your ledger. You can exclude forks and archived repositories.
              </p>
            </div>

            {/* Controls Bar: Toggles, Search, Select/Deselect */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-neutral-2/60 border border-neutral-4 p-3.5 rounded-xs">
              {/* Toggles: Forks & Archived */}
              <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-11">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch
                    checked={includeForks}
                    onCheckedChange={(checked) => setIncludeForks(checked)}
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    <GitFork size={13} className="text-neutral-9" />
                    Include forks
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch
                    checked={includeArchived}
                    onCheckedChange={(checked) => setIncludeArchived(checked)}
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    <Archive size={13} className="text-neutral-9" />
                    Include archived
                  </span>
                </label>
              </div>

              {/* Search & Bulk Selection Actions */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-8" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter repositories..."
                    className="w-full h-8 pl-8 pr-3 text-xs font-mono bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 placeholder:text-neutral-8 focus:outline-none focus:border-neutral-12"
                  />
                </div>

                <div className="flex items-center gap-2 text-2xs font-mono">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="px-2 py-1 border border-neutral-5 rounded-xs hover:border-neutral-12 text-neutral-10 hover:text-neutral-12 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    className="px-2 py-1 border border-neutral-5 rounded-xs hover:border-neutral-12 text-neutral-10 hover:text-neutral-12 transition-colors cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </div>

            {/* Repositories Selection List */}
            <div className="border border-neutral-4 rounded-xs divide-y divide-neutral-4 max-h-[460px] overflow-y-auto bg-neutral-1">
              {visibleCandidateRepos.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-8 font-mono">
                  No repositories match your current filters.
                </div>
              ) : (
                visibleCandidateRepos.map((repo) => {
                  const isSelected = selectedRepoIds.has(repo.id);
                  const isFork = (repo as any).is_fork;
                  const isArchived = repo.archived_on_github || (repo as any).is_archived;
                  const description = (repo as any).description;
                  const stars = (repo as any).stargazers_count;

                  return (
                    <div
                      key={repo.id}
                      onClick={() => toggleRepoSelection(repo.id)}
                      className={cn(
                        'p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none',
                        isSelected ? 'bg-neutral-2/50' : 'hover:bg-neutral-2/30 opacity-70'
                      )}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRepoSelection(repo.id)}
                          aria-label={`Select ${repo.full_name}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-neutral-12">
                            {repo.full_name}
                          </span>

                          {repo.is_private && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-neutral-5 text-neutral-9">
                              <Lock size={9} />
                              Private
                            </span>
                          )}

                          {isFork && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-neutral-5 text-neutral-9">
                              <GitFork size={9} />
                              Fork
                            </span>
                          )}

                          {isArchived && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-neutral-5 text-neutral-8">
                              <Archive size={9} />
                              Archived
                            </span>
                          )}
                        </div>

                        {description && (
                          <p className="text-2xs text-neutral-9 font-sans truncate mt-1">
                            {description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-2xs text-neutral-8 font-sans mt-2">
                          <LanguageDot language={repo.language} />
                          {stars !== undefined && stars > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Star size={11} className="text-neutral-8" />
                              {stars}
                            </span>
                          )}
                          <span>
                            {repo.last_commit_at
                              ? `Active ${new Date(repo.last_commit_at).toLocaleDateString()}`
                              : 'No commits'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="flex items-center justify-between border-t border-neutral-4 pt-4">
              <div className="text-xs font-mono text-neutral-10">
                Selected <strong className="text-neutral-12 font-semibold">{selectedRepoIds.size}</strong> of{' '}
                {candidateRepos.length} repositories
              </div>

              <div className="flex items-center gap-3">
                <Button
                  id="onboarding-continue-sync-btn"
                  variant="primary"
                  size="md"
                  disabled={selectedRepoIds.size === 0}
                  onClick={startCalmSync}
                >
                  <span>Sync {selectedRepoIds.size} Repositories</span>
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CALM SYNC PROGRESS ================= */}
        {currentStep === 'sync' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-normal">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-12">
                {isSyncComplete ? 'Repository sync complete' : 'Indexing repository activity'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-9">
                {isSyncComplete
                  ? 'Your 90-day commit timelines and velocity scores are prepared.'
                  : 'Analyzing commit frequencies, branch health, and velocity momentum.'}
              </p>
            </div>

            {/* Calm Counter & Progress Bar */}
            <div
              role="status"
              aria-live="polite"
              aria-label="Repository sync progress"
              className="p-6 border border-neutral-4 rounded-xs bg-neutral-2/50 space-y-5"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-3xl font-bold text-neutral-12 tabular">
                  {syncProgressCount}{' '}
                  <span className="text-base font-normal text-neutral-8">/ {selectedReposList.length}</span>
                </div>
                <div className="text-xs font-mono text-neutral-9">
                  {Math.round((syncProgressCount / (selectedReposList.length || 1)) * 100)}%
                </div>
              </div>

              {/* Progress Track */}
              <div
                role="progressbar"
                aria-valuenow={Math.round((syncProgressCount / (selectedReposList.length || 1)) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Repository sync progress percentage"
                className="w-full h-1.5 bg-neutral-4 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-neutral-12 transition-all duration-fast ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((syncProgressCount / (selectedReposList.length || 1)) * 100))}%`,
                  }}
                />
              </div>

              {/* Live Streaming Repo Name Ticker */}
              {!isSyncComplete && currentSyncingRepoName && (
                <div className="flex items-center gap-2 text-2xs font-mono text-neutral-9 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-heat-active animate-pulse" />
                  <span>Indexing {currentSyncingRepoName}…</span>
                </div>
              )}
            </div>

            {/* Calm Staged Checklist */}
            <div className="space-y-2.5 text-xs font-mono">
              {[
                'Discovered selected repositories and active branches',
                'Extracted 90-day commit frequencies and authors',
                'Calculated velocity momentum scores',
                'Categorized into activity buckets (active, cooling, stale, dormant)',
                'Prepared first-triage queue (cooling projects needing attention)',
              ].map((stageLabel, idx) => {
                const isDone = syncStageIndex > idx;
                const isCurrent = syncStageIndex === idx && !isSyncComplete;

                return (
                  <div
                    key={stageLabel}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-xs transition-colors duration-fast',
                      isDone
                        ? 'text-neutral-12 bg-neutral-2/40'
                        : isCurrent
                        ? 'text-neutral-12 font-medium bg-neutral-3/50'
                        : 'text-neutral-7'
                    )}
                  >
                    <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                      {isDone ? (
                        <Check size={14} className="text-verdict-keep-text" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-neutral-12 animate-ping" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-5" />
                      )}
                    </div>
                    <span className="text-2xs sm:text-xs truncate">{stageLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Completion Transition Action */}
            {isSyncComplete && (
              <div className="pt-4 text-center animate-in fade-in duration-fast">
                <Button
                  id="onboarding-begin-triage-btn"
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentStep('triage')}
                  className="w-full sm:w-auto"
                >
                  <span>Begin Guided Triage (5 Repositories)</span>
                  <ArrowRight size={15} className="ml-2" />
                </Button>
                <div className="text-2xs text-neutral-8 mt-2">
                  Takes less than 2 minutes · Keyboard-first
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4: GUIDED 5-REPO TRIAGE ================= */}
        {currentStep === 'triage' && guidedTriageQueue[triageIndex] && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-normal">
            {/* Header: Progress & Value Prompt */}
            <div className="flex items-center justify-between border-b border-neutral-4 pb-3">
              <div>
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-9">
                  First Triage · {triageIndex + 1} of {guidedTriageQueue.length}
                </span>
                <h1 className="text-lg font-bold text-neutral-12 font-sans mt-0.5">
                  Calibrate your engineering attention
                </h1>
              </div>

              {/* Slim Progress Dots */}
              <div className="flex items-center gap-1.5">
                {guidedTriageQueue.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-fast',
                      idx === triageIndex
                        ? 'w-5 bg-neutral-12'
                        : idx < triageIndex
                        ? 'w-1.5 bg-neutral-9'
                        : 'w-1.5 bg-neutral-4'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Centered Large Repo Card */}
            {(() => {
              const repo = guidedTriageQueue[triageIndex];
              const score = calculateRepoScore(repo);
              const readmeSnippet = (repo as any).readme_snippet || (repo as any).description;
              const lastCommitDays = repo.explanation?.days ?? 14;

              return (
                <div className="border border-neutral-4 bg-neutral-2/40 rounded-xs p-6 space-y-6 shadow-elevation-1">
                  {/* Top: Name, Status, Score Ring */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-bold text-neutral-12 truncate">
                          {repo.full_name}
                        </span>
                        {repo.is_private && (
                          <Lock size={12} className="text-neutral-8 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-9 font-sans">
                        {(repo as any).description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      <ScoreRing score={score} size={48} strokeWidth={3.5} />
                    </div>
                  </div>

                  {/* Velocity Details & Context */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-neutral-1 p-3.5 rounded-xs border border-neutral-4">
                    <div>
                      <span className="text-2xs font-mono uppercase text-neutral-8 block">
                        Activity Momentum
                      </span>
                      <span className="font-sans font-medium text-neutral-11">
                        Last commit {lastCommitDays} days ago · {repo.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-2xs font-mono uppercase text-neutral-8 block">
                        Language & Details
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <LanguageDot language={repo.language} />
                        <span className="text-neutral-8 font-mono">·</span>
                        <span className="text-neutral-9 font-mono">
                          {repo.weekly_commits} commits this week
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Week Commit Sparkline */}
                  <div className="space-y-1.5">
                    <span className="text-2xs font-mono uppercase text-neutral-8 block">
                      90-Day Activity Strip
                    </span>
                    <CommitStripV4 activity={repo.activity} status={repo.status} className="h-6" />
                  </div>

                  {/* README Excerpt */}
                  {readmeSnippet && (
                    <div className="p-3 bg-neutral-1 border border-neutral-4 rounded-xs text-xs text-neutral-10 font-sans leading-relaxed">
                      <span className="text-2xs font-mono uppercase text-neutral-7 block mb-1">
                        Context excerpt
                      </span>
                      "{readmeSnippet}"
                    </div>
                  )}

                  {/* Verdict Buttons Row */}
                  <div className="pt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Keep */}
                      <button
                        type="button"
                        id="guided-verdict-keep"
                        onClick={() => handleMakeDecision('keep')}
                        className="p-3 border border-verdict-keep-border/70 hover:border-verdict-keep-border bg-verdict-keep-bg hover:bg-verdict-keep-bg/80 text-verdict-keep-text rounded-xs text-left transition-colors cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <Flame size={14} />
                            Keep going
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded-xs bg-neutral-1 text-2xs font-mono border border-neutral-4">
                            K
                          </kbd>
                        </div>
                        <span className="text-2xs text-verdict-keep-text/80 mt-1 block">
                          Active priority project
                        </span>
                      </button>

                      {/* Pause */}
                      <button
                        type="button"
                        id="guided-verdict-pause"
                        onClick={() => handleMakeDecision('pause')}
                        className="p-3 border border-verdict-pause-border/70 hover:border-verdict-pause-border bg-verdict-pause-bg hover:bg-verdict-pause-bg/80 text-verdict-pause-text rounded-xs text-left transition-colors cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <Clock size={14} />
                            Pause
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded-xs bg-neutral-1 text-2xs font-mono border border-neutral-4">
                            P
                          </kbd>
                        </div>
                        <span className="text-2xs text-verdict-pause-text/80 mt-1 block">
                          Waiting on external factor
                        </span>
                      </button>

                      {/* Retire */}
                      <button
                        type="button"
                        id="guided-verdict-retire"
                        onClick={() => handleMakeDecision('retire')}
                        className="p-3 border border-verdict-retire-border/70 hover:border-verdict-retire-border bg-verdict-retire-bg hover:bg-verdict-retire-bg/80 text-verdict-retire-text rounded-xs text-left transition-colors cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <Archive size={14} />
                            Retire
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded-xs bg-neutral-1 text-2xs font-mono border border-neutral-4">
                            R
                          </kbd>
                        </div>
                        <span className="text-2xs text-verdict-retire-text/80 mt-1 block">
                          Completed or archived work
                        </span>
                      </button>
                    </div>

                    {/* Secondary Navigation (Skip & Undo) */}
                    <div className="flex items-center justify-between pt-2 text-2xs font-mono text-neutral-8">
                      <button
                        type="button"
                        disabled={undoStack.length === 0}
                        onClick={handleUndo}
                        className="flex items-center gap-1 hover:text-neutral-12 disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        <RotateCcw size={12} />
                        <span>Undo [Z]</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSkip}
                        className="flex items-center gap-1 hover:text-neutral-12 cursor-pointer transition-colors"
                      >
                        <span>Skip for now [S]</span>
                        <SkipForward size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= STEP 5: CALM COMPLETION MOMENT ================= */}
        {currentStep === 'complete' && (
          <div className="max-w-xl mx-auto space-y-8 text-center animate-in fade-in duration-normal">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-verdict-keep-bg border border-verdict-keep-border flex items-center justify-center text-verdict-keep-text">
                <CheckCircle2 size={24} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-neutral-12">
                First triage complete!
              </h1>
              <p className="text-sm text-neutral-10 leading-relaxed max-w-md mx-auto">
                You made real triage decisions in your first two minutes. Your repository ledger is
                now calibrated and organized.
              </p>
            </div>

            {/* Decisions Summary Chips */}
            <div className="p-5 border border-neutral-4 rounded-xs bg-neutral-2/50 space-y-4">
              <span className="text-2xs font-mono uppercase tracking-wider text-neutral-8 block">
                Session Decisions
              </span>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {(() => {
                  const decisionsList = Object.values(decisionsRecord);
                  const kept = decisionsList.filter((d) => d === 'keep').length;
                  const paused = decisionsList.filter((d) => d === 'pause').length;
                  const retired = decisionsList.filter((d) => d === 'retire').length;

                  return (
                    <>
                      <span className="px-3 py-1 rounded-xs bg-verdict-keep-bg text-verdict-keep-text border border-verdict-keep-border text-xs font-mono font-medium">
                        {kept} Kept going
                      </span>
                      <span className="px-3 py-1 rounded-xs bg-verdict-pause-bg text-verdict-pause-text border border-verdict-pause-border text-xs font-mono font-medium">
                        {paused} Paused
                      </span>
                      <span className="px-3 py-1 rounded-xs bg-verdict-retire-bg text-verdict-retire-text border border-verdict-retire-border text-xs font-mono font-medium">
                        {retired} Retired
                      </span>
                    </>
                  );
                })()}
              </div>

              <p className="text-2xs text-neutral-8 pt-1">
                You can review or adjust any of these decisions at any time from the Decisions timeline.
              </p>
            </div>

            {/* Enter Ledger Button */}
            <div className="pt-2">
              <Button
                id="onboarding-enter-ledger-btn"
                variant="primary"
                size="lg"
                onClick={handleFinishOnboarding}
                className="w-full sm:w-auto"
              >
                <span>Enter Your Ledger</span>
                <ArrowRight size={15} className="ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-4 px-6 md:px-12 py-3.5 flex items-center justify-between text-2xs text-neutral-8 font-sans">
        <span>RepoPulse · Calibrated GitHub activity ledger</span>
        <span>Keyboard: K / P / R / S / Z</span>
      </footer>
    </div>
  );
};
