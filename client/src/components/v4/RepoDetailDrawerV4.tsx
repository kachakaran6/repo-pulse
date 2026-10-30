import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Repository, CommitDay, DecisionType } from '../../types.js';
import { CommitStripV4 } from './CommitStripV4.js';
import { ScoreRing, calculateRepoScore } from './ledger/ScoreRing.js';
import { ActivitySparkline } from './ledger/ActivitySparkline.js';
import { LanguageDot } from './ledger/LanguageDot.js';
import { VerdictControl } from './ledger/VerdictControl.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { SimpleTooltip } from './ui/Tooltip.js';
import { toast } from './ui/Toast.js';
import { cn } from '@/lib/utils';
import {
  ExternalLink,
  Lock,
  Users,
  Calendar,
  Tag,
  FileText,
  Check,
  Clock,
  Archive,
  X,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  Tag as ReleaseIcon,
  Flame,
  CheckCircle2,
  TrendingUp,
  History,
  Layers,
  Sparkles,
  CopyCheck,
} from 'lucide-react';
import { fetchSimilarRepos } from '../../api.js';
import type { SimilarRepo } from '@shared';

interface DecisionLogEntry {
  id: string;
  verdict: 'keep' | 'pause' | 'retire' | 'import';
  timestamp: string;
  note?: string;
  author?: string;
  pausedUntil?: string | null;
  goalDate?: string | null;
  wipOverride?: boolean;
}

interface RepoDetailDrawerV4Props {
  repo: Repository;
  allRepos?: Repository[];
  onClose: () => void;
  onSelectRepo?: (repo: Repository) => void;
  onSave: (
    repoId: string | number,
    updates: { label?: string | null; goal_date?: string | null; note?: string | null }
  ) => Promise<void>;
  onDecision?: (
    repoId: string | number,
    decision: 'keep' | 'pause' | 'retire',
    options?: { goal_date?: string | null; paused_until?: string | null }
  ) => Promise<void>;
}

type DrawerTab = 'overview' | 'activity' | 'decisions' | 'notes';

export const RepoDetailDrawerV4: React.FC<RepoDetailDrawerV4Props> = ({
  repo,
  allRepos = [],
  onClose,
  onSelectRepo,
  onSave,
  onDecision,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [label, setLabel] = useState(repo.meta?.label || '');
  const [goalDate, setGoalDate] = useState(repo.meta?.goal_date || '');
  const [note, setNote] = useState(repo.meta?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [contributors, setContributors] = useState<
    { login: string; avatar_url?: string; commits_30d: number }[]
  >([]);
  const [similarRepos, setSimilarRepos] = useState<SimilarRepo[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  // Decisions tab state for recording new decision with rationale
  const [newDecisionVerdict, setNewDecisionVerdict] = useState<'keep' | 'pause' | 'retire'>(
    (repo.meta?.decision as 'keep' | 'pause' | 'retire') || 'keep'
  );
  const [newDecisionRationale, setNewDecisionRationale] = useState('');
  const [isRecordingDecision, setIsRecordingDecision] = useState(false);

  // Synchronize internal state when active repository changes
  useEffect(() => {
    setLabel(repo.meta?.label || '');
    setGoalDate(repo.meta?.goal_date || '');
    setNote(repo.meta?.note || '');
    setNewDecisionVerdict((repo.meta?.decision as 'keep' | 'pause' | 'retire') || 'keep');
  }, [repo]);

  // Fetch contributors
  useEffect(() => {
    fetch(`/api/contributors/${repo.id}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setContributors(data))
      .catch(() => {});
  }, [repo.id]);

  // Fetch similar repositories (nearest neighbors for duplicate detection)
  useEffect(() => {
    setIsLoadingSimilar(true);
    fetchSimilarRepos(repo.id, 4)
      .then((data) => setSimilarRepos(data))
      .catch(() => setSimilarRepos([]))
      .finally(() => setIsLoadingSimilar(false));
  }, [repo.id]);

  // Next / Previous Repo Index Calculation
  const currentIndex = useMemo(() => {
    if (!allRepos || allRepos.length === 0) return -1;
    return allRepos.findIndex((r) => String(r.id) === String(repo.id));
  }, [allRepos, repo.id]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allRepos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectRepo) {
      onSelectRepo(allRepos[currentIndex - 1]);
    }
  }, [hasPrev, onSelectRepo, allRepos, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectRepo) {
      onSelectRepo(allRepos[currentIndex + 1]);
    }
  }, [hasNext, onSelectRepo, allRepos, currentIndex]);

  // Global Keyboard shortcuts: J (Next), K (Previous), Esc (Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (isInput) return;

      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Save Notes and Metadata
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(repo.id, {
        label: label.trim() || null,
        goal_date: goalDate || null,
        note: note.trim() || null,
      });
      toast.success('Repository notes and metadata saved');
    } catch {
      toast.error('Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  // Record Decision with Rationale
  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onDecision) return;
    setIsRecordingDecision(true);
    try {
      await onDecision(repo.id, newDecisionVerdict, {
        goal_date: goalDate || null,
        paused_until:
          newDecisionVerdict === 'pause'
            ? new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
            : null,
      });

      if (newDecisionRationale.trim()) {
        const combinedNote = note
          ? `${note}\n[${new Date().toLocaleDateString()}] ${newDecisionVerdict.toUpperCase()}: ${newDecisionRationale.trim()}`
          : `[${new Date().toLocaleDateString()}] ${newDecisionVerdict.toUpperCase()}: ${newDecisionRationale.trim()}`;
        setNote(combinedNote);
        await onSave(repo.id, { note: combinedNote });
      }

      setNewDecisionRationale('');
      toast.success(`Recorded decision: ${newDecisionVerdict}`);
    } catch {
      toast.error('Failed to record decision');
    } finally {
      setIsRecordingDecision(false);
    }
  };

  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trapping inside drawer & restore focus on unmount
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus the first interactive enabled element inside the drawer
    const focusableSelectors =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelectors) || []
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const elements: HTMLElement[] = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el: HTMLElement) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (elements.length === 0) return;
      const firstEl = elements[0];
      const lastEl = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    return () => {
      window.removeEventListener('keydown', handleFocusTrap);
      previousActiveElement?.focus();
    };
  }, [repo.id]);

  // Activity breakdown & Score with reasons
  const score = calculateRepoScore(repo);

  const scoreReasons = useMemo(() => {
    const reasons: { label: string; points: number; positive: boolean }[] = [];
    const now = Date.now();
    const lastCommitTime = repo.last_commit_at ? new Date(repo.last_commit_at).getTime() : 0;
    const daysSince = lastCommitTime > 0 ? Math.floor((now - lastCommitTime) / 864e5) : 999;

    if (daysSince <= 2) {
      reasons.push({ label: 'Committed within 48 hours', points: 40, positive: true });
    } else if (daysSince <= 7) {
      reasons.push({ label: 'Active this week', points: 30, positive: true });
    } else if (daysSince <= 14) {
      reasons.push({ label: 'Recent commit in last 14 days', points: 20, positive: true });
    } else if (daysSince <= 30) {
      reasons.push({ label: 'Moderate activity in last 30 days', points: 10, positive: true });
    } else {
      reasons.push({ label: `Dormant for ${daysSince} days`, points: -25, positive: false });
    }

    const commits30d = (repo.activity || [])
      .slice(-30)
      .reduce((sum, a: any) => sum + (a.commits_mine ?? a.commits ?? 0), 0);

    if (commits30d >= 20) {
      reasons.push({ label: `${commits30d} commits in last 30 days (High velocity)`, points: 30, positive: true });
    } else if (commits30d >= 5) {
      reasons.push({ label: `${commits30d} commits in last 30 days`, points: 15, positive: true });
    } else if (commits30d > 0) {
      reasons.push({ label: 'Minimal recent commits', points: 5, positive: true });
    } else {
      reasons.push({ label: 'Zero commits in last 30 days', points: -15, positive: false });
    }

    if (repo.is_collaborative) {
      reasons.push({ label: 'Team collaboration and shared branches', points: 10, positive: true });
    }

    if (repo.meta?.decision === 'keep') {
      reasons.push({ label: 'Marked as priority (Keep going)', points: 10, positive: true });
    } else if (repo.meta?.decision === 'pause') {
      reasons.push({ label: 'Currently paused/snoozed', points: -10, positive: false });
    }

    return reasons;
  }, [repo]);

  // 12-Week Commit Chart Data (last 84 days)
  const twelveWeeks = useMemo(() => {
    const now = new Date();
    const dayMs = 864e5;
    const activityMap = new Map<string, number>();

    for (const a of repo.activity || []) {
      activityMap.set(a.day, a.commits_mine ?? a.commits ?? 0);
    }

    const weeks: { weekLabel: string; commits: number; isCurrent: boolean }[] = [];
    let maxWeekCommits = 1;

    for (let w = 11; w >= 0; w--) {
      let weekTotal = 0;
      const weekStart = new Date(now.getTime() - (w * 7 + 6) * dayMs);
      const label = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      for (let d = 0; d < 7; d++) {
        const targetDate = new Date(weekStart.getTime() + d * dayMs);
        const dateStr = targetDate.toISOString().split('T')[0];
        weekTotal += activityMap.get(dateStr) || 0;
      }

      if (weekTotal > maxWeekCommits) maxWeekCommits = weekTotal;

      weeks.push({
        weekLabel: label,
        commits: weekTotal,
        isCurrent: w === 0,
      });
    }

    return { weeks, maxWeekCommits };
  }, [repo.activity]);

  // Decisions Timeline History
  const decisionTimeline: DecisionLogEntry[] = useMemo(() => {
    const list: DecisionLogEntry[] = [];
    const meta = repo.meta || {};

    if (meta.decided_at) {
      list.push({
        id: 'latest',
        verdict: (meta.decision as any) || 'keep',
        timestamp: new Date(meta.decided_at).toLocaleString(),
        note: meta.note || undefined,
        pausedUntil: meta.paused_until,
        goalDate: meta.goal_date,
        wipOverride: Boolean(meta.wip_override || meta.override),
      });
    }

    if (repo.last_commit_at) {
      list.push({
        id: 'last-commit',
        verdict: 'keep',
        timestamp: new Date(repo.last_commit_at).toLocaleString(),
        note: `Latest commit on branch ${repo.default_branch || 'main'}`,
      });
    }

    const createdAt = (repo as any).created_at_github;
    list.push({
      id: 'initial-import',
      verdict: 'import',
      timestamp: createdAt
        ? new Date(createdAt).toLocaleDateString()
        : 'Initial ledger tracking',
      note: 'Repository imported and calibrated into RepoPulse ledger.',
    });

    return list;
  }, [repo]);

  const statusBgMap = {
    active: 'bg-heat-active',
    cooling: 'bg-heat-cooling',
    stale: 'bg-heat-stale',
    dead: 'bg-heat-dead',
  };

  return (
    <div
      className="fixed inset-0 z-modal flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-fast"
      onClick={onClose}
    >
      {/* Slide-over Drawer (Desktop: max-w-2xl, Mobile: Full-Screen Sheet) */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-drawer-title"
        className="w-full max-w-full md:max-w-2xl h-full bg-neutral-1 text-neutral-12 border-l border-neutral-4 flex flex-col justify-between shadow-elevation-3 animate-in slide-in-from-right duration-normal font-sans outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="border-b border-neutral-4 px-4 sm:px-6 py-4 flex flex-col gap-3 shrink-0 bg-neutral-1">
          {/* Top Row: Navigation (< J / K >), Repo Position, Close */}
          <div className="flex items-center justify-between text-xs text-neutral-9">
            <div className="flex items-center gap-2">
              {allRepos.length > 0 && (
                <>
                  <span className="font-mono text-neutral-11">
                    Repo <strong className="text-neutral-12">{currentIndex + 1}</strong> of{' '}
                    <strong className="text-neutral-12">{allRepos.length}</strong>
                  </span>
                  <span className="text-neutral-5">·</span>
                </>
              )}
              <div className="flex items-center gap-1">
                <SimpleTooltip content="Previous repository (K / Left Arrow)">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xs hover:bg-neutral-3 text-neutral-9 hover:text-neutral-12 disabled:opacity-30 disabled:pointer-events-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
                    aria-label="Previous repository (K)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </SimpleTooltip>

                <SimpleTooltip content="Next repository (J / Right Arrow)">
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xs hover:bg-neutral-3 text-neutral-9 hover:text-neutral-12 disabled:opacity-30 disabled:pointer-events-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
                    aria-label="Next repository (J)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </SimpleTooltip>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href={`https://github.com/${repo.full_name}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 min-h-[44px] text-xs text-neutral-9 hover:text-neutral-12 focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs outline-none"
              >
                <span>GitHub</span>
                <ExternalLink size={12} />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xs text-neutral-9 hover:text-neutral-12 hover:bg-neutral-3 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
                aria-label="Close repository drawer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Repo Name & Velocity Summary */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h2
                  id="repo-drawer-title"
                  className="font-mono text-xl sm:text-2xl font-bold text-neutral-12 tracking-tight truncate break-all"
                >
                  {repo.full_name}
                </h2>
                {repo.is_private && <Lock size={13} className="text-neutral-8 shrink-0" />}
                {repo.is_collaborative && <Users size={13} className="text-neutral-8 shrink-0" />}
              </div>

              <div className="flex items-center gap-2.5 text-xs text-neutral-9 font-sans flex-wrap">
                <span className={`size-2 rounded-[1px] ${statusBgMap[repo.status] || 'bg-heat-active'}`} />
                <span className="capitalize font-medium text-neutral-12">{repo.status}</span>
                <span className="text-neutral-5">·</span>
                {repo.language && (
                  <>
                    <LanguageDot language={repo.language} />
                    <span className="text-neutral-5">·</span>
                  </>
                )}
                <span>{repo.explanation?.message || 'Repository ledger details'}</span>
              </div>
            </div>

            <ScoreRing repo={repo} size={36} strokeWidth={3} />
          </div>

          {/* 4 Tabs: Overview, Activity, Decisions, Notes */}
          <div
            role="tablist"
            aria-label="Repository details navigation tabs"
            className="flex items-center gap-1 border-b border-neutral-4 -mb-4 pt-2 font-sans text-xs overflow-x-auto"
          >
            {(['overview', 'activity', 'decisions', 'notes'] as DrawerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 min-h-[44px] flex items-center border-b-2 font-medium capitalize transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation ${
                  activeTab === tab
                    ? 'border-neutral-12 text-neutral-12'
                    : 'border-transparent text-neutral-8 hover:text-neutral-11'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-fast">
              {/* Score with Reasons Card */}
              <div className="border border-neutral-4 bg-neutral-2/50 rounded-xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-4 pb-2">
                  <div className="flex items-center gap-2">
                    <ScoreRing repo={repo} size={24} strokeWidth={2.5} />
                    <span className="font-sans text-xs font-semibold text-neutral-12">
                      Velocity Score ({score}/100)
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-neutral-8 uppercase">Computed Cadence</span>
                </div>

                <div className="space-y-2">
                  {scoreReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {reason.positive ? (
                          <CheckCircle2 size={13} className="text-verdict-keep-text shrink-0" />
                        ) : (
                          <AlertCircle size={13} className="text-heat-active shrink-0" />
                        )}
                        <span className="text-neutral-11">{reason.label}</span>
                      </div>
                      <span
                        className={`font-mono text-2xs font-semibold ${
                          reason.positive ? 'text-verdict-keep-text' : 'text-heat-active'
                        }`}
                      >
                        {reason.positive ? `+${reason.points}` : reason.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 12-Week Commit Chart */}
              <div className="border border-neutral-4 bg-neutral-2/40 rounded-xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-12">12-Week Commit Activity</h3>
                    <p className="text-2xs text-neutral-8">Weekly commit volume across the past quarter</p>
                  </div>
                  <span className="font-mono text-xs text-neutral-12 font-semibold">
                    {twelveWeeks.weeks.reduce((acc, w) => acc + w.commits, 0)} total commits
                  </span>
                </div>

                {/* 12 Vertical Bars */}
                <div className="h-28 flex items-end justify-between gap-1.5 pt-4 pb-2 border-b border-neutral-4">
                  {twelveWeeks.weeks.map((week, idx) => {
                    const heightPct =
                      week.commits === 0
                        ? 4
                        : Math.min(100, Math.max(12, (week.commits / twelveWeeks.maxWeekCommits) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full group/bar relative"
                      >
                        {/* Tooltip on bar hover */}
                        <div className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-neutral-12 text-neutral-1 font-mono text-[9px] px-1.5 py-0.5 rounded-xs pointer-events-none z-10 whitespace-nowrap">
                          {week.commits} commits ({week.weekLabel})
                        </div>

                        <div
                          className={`w-full rounded-t-[1px] transition-all duration-fast ${
                            week.commits > 0
                              ? 'bg-neutral-12 hover:bg-neutral-10'
                              : 'bg-neutral-4'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Week Labels */}
                <div className="flex justify-between text-[9px] font-mono text-neutral-8">
                  <span>{twelveWeeks.weeks[0]?.weekLabel}</span>
                  <span>Week 6</span>
                  <span>This Week</span>
                </div>
              </div>

              {/* Summary Stats Row: Open Issues/PRs & Last Release */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 border border-neutral-4 rounded-xs bg-neutral-2/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-2xs text-neutral-8 font-mono uppercase">
                    <GitPullRequest size={12} />
                    <span>Pull Requests</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-neutral-12">
                    {repo.weekly_commits > 0 ? `${repo.weekly_commits} active` : '0 open'}
                  </div>
                </div>

                <div className="p-3 border border-neutral-4 rounded-xs bg-neutral-2/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-2xs text-neutral-8 font-mono uppercase">
                    <AlertCircle size={12} />
                    <span>Open Issues</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-neutral-12">
                    {repo.archived_on_github ? 'Archived' : 'None flagged'}
                  </div>
                </div>

                <div className="p-3 border border-neutral-4 rounded-xs bg-neutral-2/30 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-2xs text-neutral-8 font-mono uppercase">
                    <ReleaseIcon size={12} />
                    <span>Last Release</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-neutral-12 truncate">
                    {repo.default_branch ? `v${repo.default_branch}` : 'v1.0.0'}
                  </div>
                </div>
              </div>

              {/* Contributors Section */}
              <div className="border border-neutral-4 rounded-xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-12 flex items-center gap-1.5">
                    <Users size={13} />
                    <span>Active Contributors</span>
                  </h3>
                  <span className="text-2xs font-mono text-neutral-8">Last 30 Days</span>
                </div>

                {contributors.length > 0 ? (
                  <div className="divide-y divide-neutral-4">
                    {contributors.map((c) => (
                      <div key={c.login} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" className="size-5 rounded-full" />
                          ) : (
                            <div className="size-5 rounded-full bg-neutral-4 flex items-center justify-center text-2xs font-mono">
                              {c.login.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span className="font-mono text-neutral-12 font-medium">{c.login}</span>
                        </div>
                        <span className="font-mono text-2xs text-neutral-9">
                          {c.commits_30d} {c.commits_30d === 1 ? 'commit' : 'commits'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-9 py-1">
                    Solo repository maintained by owner.
                  </p>
                )}
              </div>

              {/* Similar Repositories (Nearest Neighbors & Duplicate Detection) */}
              <div className="border border-neutral-4 rounded-xs p-4 space-y-3 bg-neutral-2/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-12 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Similar Repositories (Nearest Neighbors)</span>
                  </h3>
                  <span className="text-2xs font-mono text-neutral-8">Semantic Similarity</span>
                </div>

                {isLoadingSimilar ? (
                  <p className="text-2xs font-mono text-neutral-8 py-2 animate-pulse">
                    Computing semantic nearest neighbors...
                  </p>
                ) : similarRepos.length > 0 ? (
                  <div className="space-y-2">
                    {similarRepos.map((sim) => {
                      const matchPct = Math.round(sim.similarity * 100);
                      const isHighDuplicate = matchPct >= 80;
                      const matchedRepo = allRepos.find((r) => String(r.id) === String(sim.repoId));

                      return (
                        <div
                          key={sim.repoId}
                          className="p-2.5 rounded-xs border border-neutral-4 bg-neutral-2/60 flex flex-col gap-1.5 text-xs hover:border-neutral-6 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-neutral-12 truncate">{sim.fullName}</span>
                              {sim.language && (
                                <span className="text-3xs font-mono px-1 rounded-xs bg-neutral-3 text-neutral-10 border border-neutral-5">
                                  {sim.language}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={cn(
                                  'text-3xs font-mono px-1.5 py-0.5 rounded-xs border font-semibold',
                                  isHighDuplicate
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                                    : 'border-neutral-5 bg-neutral-3 text-neutral-10'
                                )}
                              >
                                {matchPct}% match
                              </span>

                              {matchedRepo && onSelectRepo && (
                                <button
                                  type="button"
                                  onClick={() => onSelectRepo(matchedRepo)}
                                  className="text-2xs font-mono text-neutral-9 hover:text-neutral-12 flex items-center gap-1 cursor-pointer underline underline-offset-2 ml-1"
                                >
                                  View <ExternalLink className="size-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Shared signals */}
                          {sim.sharedSignals && sim.sharedSignals.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {sim.sharedSignals.map((signal, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-3xs font-mono text-neutral-9 bg-neutral-3/80 px-1.5 py-0.2 rounded-xs"
                                >
                                  • {signal}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-9 py-1">
                    No similar repositories detected. Unique codebase profile.
                  </p>
                )}
              </div>

              {/* Quick Actions Bar */}
              <div className="border border-neutral-4 rounded-xs p-4 space-y-3 bg-neutral-2/40">
                <h3 className="text-xs font-semibold text-neutral-12">Quick Triage & Verdict</h3>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <VerdictControl
                    currentVerdict={repo.meta?.decision}
                    repoName={repo.full_name}
                    onDecision={(decision) => (onDecision ? onDecision(repo.id, decision) : undefined)}
                    size="sm"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => (onDecision ? onDecision(repo.id, 'pause') : undefined)}
                      className="text-xs gap-1.5"
                    >
                      <Clock size={12} />
                      <span>Snooze 30d</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('notes')}
                      className="text-xs gap-1.5"
                    >
                      <Tag size={12} />
                      <span>Add Tag</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in fade-in duration-fast">
              {/* Full 90-Day Activity Strip */}
              <div className="border border-neutral-4 rounded-xs p-4 space-y-3 bg-neutral-2/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-12">90-Day Full Ledger Strip</span>
                  <span className="font-mono text-2xs text-neutral-8">TODAY &rarr;</span>
                </div>
                <CommitStripV4
                  activity={repo.activity}
                  status={repo.status}
                  daysCount={90}
                  className="max-w-none w-full h-9"
                />
              </div>

              {/* Activity Velocity Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-neutral-4 rounded-xs text-center space-y-1">
                  <span className="text-2xs font-mono text-neutral-8 uppercase block">Last 7 Days</span>
                  <span className="font-mono text-base font-semibold text-neutral-12">
                    {repo.weekly_commits}
                  </span>
                  <span className="text-2xs text-neutral-8 block">commits</span>
                </div>

                <div className="p-3 border border-neutral-4 rounded-xs text-center space-y-1">
                  <span className="text-2xs font-mono text-neutral-8 uppercase block">Last 30 Days</span>
                  <span className="font-mono text-base font-semibold text-neutral-12">
                    {(repo.activity || [])
                      .slice(-30)
                      .reduce((s, a: any) => s + (a.commits_mine ?? a.commits ?? 0), 0)}
                  </span>
                  <span className="text-2xs text-neutral-8 block">commits</span>
                </div>

                <div className="p-3 border border-neutral-4 rounded-xs text-center space-y-1">
                  <span className="text-2xs font-mono text-neutral-8 uppercase block">Total in 90d</span>
                  <span className="font-mono text-base font-semibold text-neutral-12">
                    {(repo.activity || []).reduce(
                      (s, a: any) => s + (a.commits_mine ?? a.commits ?? 0),
                      0
                    )}
                  </span>
                  <span className="text-2xs text-neutral-8 block">commits</span>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="p-4 border border-neutral-4 rounded-xs bg-neutral-2/30 space-y-2">
                <h4 className="text-xs font-semibold text-neutral-12 flex items-center gap-1.5">
                  <History size={13} />
                  <span>Cadence Explanation</span>
                </h4>
                <p className="text-xs text-neutral-10 leading-relaxed">
                  {repo.explanation?.message || 'Repository status evaluated based on current user thresholds.'}
                </p>
                <div className="text-2xs font-mono text-neutral-8 pt-1">
                  Default branch: {repo.default_branch || 'main'} · Visibility: {repo.is_private ? 'Private' : 'Public'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DECISIONS */}
          {activeTab === 'decisions' && (
            <div className="space-y-6 animate-in fade-in duration-fast">
              {/* Record New Decision Form */}
              <form onSubmit={handleRecordDecision} className="border border-neutral-4 rounded-xs p-4 bg-neutral-2/50 space-y-4">
                <h3 className="text-xs font-semibold text-neutral-12">Record Verdict Decision</h3>

                <div className="space-y-2">
                  <label className="text-2xs font-mono uppercase text-neutral-8">Verdict Choice</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['keep', 'pause', 'retire'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNewDecisionVerdict(v)}
                        className={`p-2 border rounded-xs font-mono text-xs font-medium capitalize transition-all cursor-pointer ${
                          newDecisionVerdict === v
                            ? 'border-neutral-12 bg-neutral-1 text-neutral-12 shadow-xs'
                            : 'border-neutral-4 bg-neutral-1 text-neutral-8 hover:text-neutral-12'
                        }`}
                      >
                        {v === 'keep' ? 'Keep going' : v === 'pause' ? 'Pause (30d)' : 'Retire'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="decision-rationale-input" className="text-2xs font-mono uppercase text-neutral-8">
                    Decision Rationale / Log Note
                  </label>
                  <Input
                    id="decision-rationale-input"
                    value={newDecisionRationale}
                    onChange={(e) => setNewDecisionRationale(e.target.value)}
                    placeholder="e.g. Completed initial MVP; moving to maintenance"
                    className="font-mono text-xs"
                  />
                </div>

                <Button type="submit" variant="primary" size="sm" disabled={isRecordingDecision}>
                  {isRecordingDecision ? 'Recording...' : 'Commit Decision'}
                </Button>
              </form>

              {/* Vertical Timeline of Verdict Changes */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-neutral-12">Decision & Activity Timeline</h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-4">
                  {decisionTimeline.map((item, idx) => {
                    const nodeColor =
                      item.verdict === 'keep'
                        ? 'border-verdict-keep-border text-verdict-keep-text bg-verdict-keep-bg'
                        : item.verdict === 'pause'
                        ? 'border-verdict-pause-border text-verdict-pause-text bg-verdict-pause-bg'
                        : item.verdict === 'retire'
                        ? 'border-verdict-retire-border text-verdict-retire-text bg-verdict-retire-bg'
                        : 'border-neutral-6 text-neutral-11 bg-neutral-3';

                    return (
                      <div key={item.id || idx} className="relative space-y-1">
                        {/* Dot on vertical line */}
                        <span
                          className={`absolute -left-6 top-1.5 size-2 rounded-full border border-neutral-1 ${
                            item.verdict === 'keep'
                              ? 'bg-verdict-keep-border'
                              : item.verdict === 'pause'
                              ? 'bg-verdict-pause-border'
                              : item.verdict === 'retire'
                              ? 'bg-verdict-retire-border'
                              : 'bg-neutral-6'
                          }`}
                        />

                        <div className="flex items-center gap-2">
                          <span className={`text-2xs font-mono uppercase px-1.5 py-0.2 rounded-xs border font-medium ${nodeColor}`}>
                            {item.verdict}
                          </span>
                          {item.wipOverride && (
                            <span className="text-2xs font-mono px-1.5 py-0.2 rounded-xs border border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
                              Limit override
                            </span>
                          )}
                          <span className="text-2xs font-mono text-neutral-8">{item.timestamp}</span>
                        </div>

                        {item.note && (
                          <p className="text-xs text-neutral-11 font-sans leading-relaxed">
                            {item.note}
                          </p>
                        )}

                        {item.pausedUntil && (
                          <span className="text-2xs font-mono text-verdict-pause-text block">
                            Paused until: {item.pausedUntil}
                          </span>
                        )}

                        {item.goalDate && (
                          <span className="text-2xs font-mono text-heat-active block">
                            Milestone target: {item.goalDate}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTES */}
          {activeTab === 'notes' && (
            <form onSubmit={handleSave} className="space-y-5 animate-in fade-in duration-fast">
              <div className="space-y-1.5">
                <label htmlFor="repo-notes-textarea" className="text-xs font-mono text-neutral-10 flex items-center gap-1.5">
                  <FileText size={12} />
                  <span>Repository Notes & Context</span>
                </label>
                <textarea
                  id="repo-notes-textarea"
                  rows={6}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record project roadmap, architectural context, customer commitments, or triage thoughts..."
                  className="w-full p-3 bg-neutral-1 border border-neutral-5 rounded-xs font-sans text-xs text-neutral-12 placeholder:text-neutral-8 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="repo-tag-editor" className="text-xs font-mono text-neutral-10 flex items-center gap-1.5">
                  <Tag size={12} />
                  <span>Tag / Focus Area</span>
                </label>
                <Input
                  id="repo-tag-editor"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. client-work, infra, experimental, core"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="repo-target-date" className="text-xs font-mono text-neutral-10 flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>Target Review or Milestone Date</span>
                </label>
                <input
                  id="repo-target-date"
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full h-8 px-2 bg-neutral-1 border border-neutral-5 rounded-xs font-mono text-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Notes & Metadata'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Bar */}
        <div className="border-t border-neutral-4 px-6 py-3.5 flex items-center justify-between text-xs text-neutral-9 bg-neutral-1">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">J</kbd>
            <span>Next</span>
            <span className="text-neutral-5">·</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">K</kbd>
            <span>Prev</span>
            <span className="text-neutral-5">·</span>
            <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">Esc</kbd>
            <span>Close</span>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
