import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Repository } from '../../types.js';
import { ScoreRing, calculateRepoScore } from './ledger/ScoreRing.js';
import { CommitStripV4 } from './CommitStripV4.js';
import { LanguageDot } from './ledger/LanguageDot.js';
import { Button } from './ui/Button.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog.js';
import { toast } from './ui/Toast.js';
import { VerdictSuggestionChip } from './ledger/VerdictSuggestionChip.js';
import {
  Check,
  Clock,
  Archive,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Lock,
  Users,
  Terminal,
  HelpCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TriageSessionDecision {
  repoId: number;
  repoName: string;
  decision: 'keep' | 'pause' | 'retire';
  timestamp: string;
}

interface TriageViewV4Props {
  repos: Repository[];
  onDecision: (
    repoId: number,
    decision: 'keep' | 'pause' | 'retire',
    options?: { goal_date?: string | null; paused_until?: string | null }
  ) => Promise<void>;
  onUndoLastDecision: () => Promise<void>;
  hasUndoableAction: boolean;
  wipLimit?: number | null;
  wipLimitEnabled?: boolean;
  activeKeepCount?: number;
  onExitTriage?: () => void;
}

export const TriageViewV4: React.FC<TriageViewV4Props> = ({
  repos,
  onDecision,
  onUndoLastDecision,
  hasUndoableAction,
  wipLimit,
  wipLimitEnabled = true,
  activeKeepCount,
  onExitTriage,
}) => {
  // Candidate pool: cooling and stale repositories not retired or paused, sorted by highest confidence first
  const triageCandidates = useMemo(() => {
    const candidates = (repos || []).filter((r) => {
      if (r.is_retired) return false;
      if (r.is_paused) return false;
      return r.status === 'cooling' || r.status === 'stale';
    });

    // Sort by highest confidence first so easy decisions go fast
    return candidates.sort((a, b) => {
      const confA = a.suggested_verdict?.confidence ?? 0;
      const confB = b.suggested_verdict?.confidence ?? 0;
      return confB - confA;
    });
  }, [repos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [animatingDirection, setAnimatingDirection] = useState<'right' | 'left' | 'up' | null>(null);

  // Session decisions history for completion summary
  const [sessionDecisions, setSessionDecisions] = useState<TriageSessionDecision[]>([]);
  const initialQueueLengthRef = useRef<number>(triageCandidates.length);

  // Track initial queue length for progress calculation
  useEffect(() => {
    if (initialQueueLengthRef.current === 0 && triageCandidates.length > 0) {
      initialQueueLengthRef.current = triageCandidates.length;
    }
  }, [triageCandidates.length]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= triageCandidates.length && triageCandidates.length > 0) {
      setCurrentIndex(Math.max(0, triageCandidates.length - 1));
    }
  }, [triageCandidates.length, currentIndex]);

  const currentRepo: Repository | undefined = triageCandidates[currentIndex];

  // Mobile Swipe Gesture State
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Navigation handlers
  const handleSkip = useCallback(() => {
    if (currentIndex < triageCandidates.length - 1) {
      setAnimatingDirection('left');
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setAnimatingDirection(null);
      }, 150);
    } else {
      toast.info('Reached the end of the triage queue');
    }
  }, [currentIndex, triageCandidates.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Core Decision Committer
  const commitDecision = useCallback(
    async (decision: 'keep' | 'pause' | 'retire') => {
      if (!currentRepo || isSubmitting) return;
      setIsSubmitting(true);
      const targetRepo = currentRepo;

      try {
        const pausedUntil =
          decision === 'pause'
            ? new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
            : null;

        await onDecision(targetRepo.id, decision, { paused_until: pausedUntil });

        // Record in session decisions for completion screen
        setSessionDecisions((prev) => [
          ...prev,
          {
            repoId: targetRepo.id,
            repoName: targetRepo.full_name,
            decision,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        const actionWord =
          decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused (30d)' : 'Retired';
        toast.info(`${actionWord} ${targetRepo.full_name}`);
      } finally {
        setIsSubmitting(false);
        setTouchOffset({ x: 0, y: 0 });
        setIsDragging(false);
      }
    },
    [currentRepo, isSubmitting, onDecision]
  );

  const handleUndo = async () => {
    if (!hasUndoableAction) return;
    await onUndoLastDecision();
    setSessionDecisions((prev) => prev.slice(0, -1));
  };

  // Keyboard Navigation: K, P, R, S, Z/U, Left/Right Arrow, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );
      if (isInput) return;

      if (e.key === 'Enter' && currentRepo?.suggested_verdict?.verdict) {
        e.preventDefault();
        commitDecision(currentRepo.suggested_verdict.verdict);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        commitDecision('keep');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        commitDecision('pause');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        commitDecision('retire');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSkip();
      } else if ((e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') && hasUndoableAction) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape' && onExitTriage) {
        e.preventDefault();
        onExitTriage();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commitDecision, handleSkip, handlePrev, hasUndoableAction, onExitTriage]);

  // Touch Handlers for Mobile Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !isDragging) return;
    const threshold = 75;

    // Detect primary swipe direction
    if (touchOffset.x > threshold) {
      // Swipe Right -> Keep going
      commitDecision('keep');
    } else if (touchOffset.x < -threshold) {
      // Swipe Left -> Retire
      commitDecision('retire');
    } else if (touchOffset.y < -threshold && Math.abs(touchOffset.y) > Math.abs(touchOffset.x)) {
      // Swipe Up -> Pause
      commitDecision('pause');
    }

    setTouchStart(null);
    setTouchOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // 1. Calm Completion Screen
  if (triageCandidates.length === 0 || !currentRepo) {
    const keptList = sessionDecisions.filter((d) => d.decision === 'keep');
    const pausedList = sessionDecisions.filter((d) => d.decision === 'pause');
    const retiredList = sessionDecisions.filter((d) => d.decision === 'retire');

    return (
      <div className="max-w-xl mx-auto py-16 px-4 space-y-8 text-center animate-in fade-in duration-normal font-sans">
        {/* Completion Icon & Heading */}
        <div className="space-y-3">
          <div className="size-12 mx-auto rounded-full bg-verdict-keep-bg border border-verdict-keep-border flex items-center justify-center text-verdict-keep-text">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-12 font-sans">
            All repos triaged
          </h1>
          <p className="text-xs text-neutral-9 max-w-md mx-auto leading-relaxed">
            Zero cooling or stale repositories require a decision. Your repository ledger is calibrated and up to date.
          </p>
        </div>

        {/* Summary of Session Decisions */}
        {wipLimitEnabled && typeof wipLimit === 'number' && wipLimit > 0 && activeKeepCount !== undefined && activeKeepCount > wipLimit && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xs text-xs text-amber-800 dark:text-amber-200">
            You have <strong>{activeKeepCount} active projects</strong> in Keep going (limit: {wipLimit}). You are in a busy phase—take your time, or pause projects whenever you are ready.
          </div>
        )}

        {sessionDecisions.length > 0 && (
          <div className="border border-neutral-4 bg-neutral-2/50 rounded-xs p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-neutral-4 pb-2 text-xs">
              <span className="font-semibold text-neutral-12">Session Summary</span>
              <span className="font-mono text-neutral-8">{sessionDecisions.length} decided</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 border border-verdict-keep-border/50 bg-verdict-keep-bg/40 rounded-xs">
                <span className="font-mono text-base font-bold text-verdict-keep-text block">
                  {keptList.length}
                </span>
                <span className="text-2xs font-mono text-neutral-10">Kept</span>
              </div>

              <div className="p-2.5 border border-verdict-pause-border/50 bg-verdict-pause-bg/40 rounded-xs">
                <span className="font-mono text-base font-bold text-verdict-pause-text block">
                  {pausedList.length}
                </span>
                <span className="text-2xs font-mono text-neutral-10">Paused</span>
              </div>

              <div className="p-2.5 border border-verdict-retire-border/50 bg-verdict-retire-bg/40 rounded-xs">
                <span className="font-mono text-base font-bold text-verdict-retire-text block">
                  {retiredList.length}
                </span>
                <span className="text-2xs font-mono text-neutral-10">Retired</span>
              </div>
            </div>

            {/* List of Decided Repos */}
            <div className="divide-y divide-neutral-4 pt-1 max-h-48 overflow-y-auto">
              {sessionDecisions.map((d) => (
                <div key={d.repoId} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-12 truncate max-w-xs">{d.repoName}</span>
                  <span
                    className={`font-mono text-2xs uppercase px-1.5 py-0.2 rounded-xs border ${
                      d.decision === 'keep'
                        ? 'border-verdict-keep-border text-verdict-keep-text bg-verdict-keep-bg'
                        : d.decision === 'pause'
                        ? 'border-verdict-pause-border text-verdict-pause-text bg-verdict-pause-bg'
                        : 'border-verdict-retire-border text-verdict-retire-text bg-verdict-retire-bg'
                    }`}
                  >
                    {d.decision}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onExitTriage && (
            <Button variant="primary" size="sm" onClick={onExitTriage} className="gap-2">
              <Layers size={13} />
              <span>Return to Ledger</span>
            </Button>
          )}

          {hasUndoableAction && (
            <Button variant="secondary" size="sm" onClick={handleUndo} className="gap-2">
              <RotateCcw size={13} />
              <span>Undo Last Decision (Z)</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 2. Active Triage Queue
  const score = calculateRepoScore(currentRepo);
  const totalQueue = Math.max(initialQueueLengthRef.current, triageCandidates.length + sessionDecisions.length);
  const completedCount = sessionDecisions.length;
  const progressPercent = Math.min(100, Math.round((completedCount / (totalQueue || 1)) * 100));

  const daysSinceCommit = currentRepo.explanation?.days;
  const lastCommitText =
    daysSinceCommit === null
      ? 'No commit activity on record'
      : daysSinceCommit === 0
      ? 'Last commit today'
      : `Last commit ${daysSinceCommit} day${daysSinceCommit === 1 ? '' : 's'} ago`;

  const description =
    (currentRepo as any).description ||
    currentRepo.explanation?.message ||
    'Repository in queue for cadence triage.';

  // Score reasons for current repo
  const scoreReasons = [
    { label: lastCommitText, pts: daysSinceCommit && daysSinceCommit <= 7 ? '+30' : '-20' },
    {
      label: `${(currentRepo.activity || []).slice(-30).reduce((s, a: any) => s + (a.commits_mine ?? a.commits ?? 0), 0)} commits in 30d`,
      pts: '+15',
    },
    { label: `Status evaluated: ${currentRepo.status}`, pts: currentRepo.status === 'cooling' ? '-10' : '-25' },
  ];

  // Drag visual styles
  const dragStyle = isDragging
    ? {
        transform: `translate(${touchOffset.x}px, ${touchOffset.y}px) rotate(${touchOffset.x * 0.04}deg)`,
        transition: 'none',
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto flex flex-col justify-between min-h-[calc(100vh-140px)] py-4 font-sans select-none">
      {/* Top Bar: Queue Progress & Slim Progress Bar */}
      <div className="space-y-2 mb-6">
        {/* Screen Reader Live Region for Triage Focus */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {currentRepo
            ? `Repository ${currentIndex + 1} of ${triageCandidates.length}: ${currentRepo.full_name}, score ${score}, status ${currentRepo.status}. Press K to keep, P to pause, R to retire.`
            : ''}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-9 font-sans">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium text-neutral-12">
              {currentIndex + 1} of {triageCandidates.length}
            </span>
            <span className="text-neutral-5">·</span>
            <span>{triageCandidates.length} remaining</span>
            <span className="text-neutral-5 hidden sm:inline">·</span>
            <div
              className="hidden sm:inline-flex items-center gap-1 text-2xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-xs"
              title="Queue is sorted by model confidence so straightforward decisions can be made first"
            >
              <Sparkles size={10} />
              <span>Highest confidence first</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUndoableAction && (
              <button
                type="button"
                onClick={handleUndo}
                aria-label="Undo last triage decision (Z)"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 text-xs text-neutral-9 hover:text-neutral-12 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs touch-manipulation"
              >
                <RotateCcw size={13} />
                <span>Undo (Z)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowShortcutsHelp(true)}
              className="text-neutral-8 hover:text-neutral-12 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts help"
            >
              <HelpCircle size={15} />
            </button>
          </div>
        </div>

        {/* Slim 2px Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Triage queue progress"
          className="h-[2px] w-full bg-neutral-4 overflow-hidden rounded-full"
        >
          <div
            className="h-full bg-neutral-12 transition-all duration-normal"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Centered Large Repo Card with Swipe Gesture Support */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={dragStyle}
        className={`relative flex-1 flex flex-col justify-between border border-neutral-4 bg-neutral-1 rounded-xs p-6 sm:p-8 shadow-elevation-2 space-y-6 transition-all duration-fast ${
          animatingDirection === 'left' ? 'opacity-50 -translate-x-4' : ''
        }`}
      >
        {/* Swipe Visual Feedback Indicators (Mobile) */}
        {touchOffset.x > 40 && (
          <div className="absolute top-4 right-4 bg-verdict-keep-bg border border-verdict-keep-border text-verdict-keep-text font-mono text-xs font-bold px-3 py-1 rounded-xs uppercase tracking-wider animate-in fade-in">
            Keep &rarr;
          </div>
        )}
        {touchOffset.x < -40 && (
          <div className="absolute top-4 left-4 bg-verdict-retire-bg border border-verdict-retire-border text-verdict-retire-text font-mono text-xs font-bold px-3 py-1 rounded-xs uppercase tracking-wider animate-in fade-in">
            &larr; Retire
          </div>
        )}
        {touchOffset.y < -40 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-verdict-pause-bg border border-verdict-pause-border text-verdict-pause-text font-mono text-xs font-bold px-3 py-1 rounded-xs uppercase tracking-wider animate-in fade-in">
            &uarr; Pause
          </div>
        )}

        {/* Card Header: Repo Name & Score Ring */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-neutral-12 break-all select-all">
                  {currentRepo.full_name}
                </h2>
                {currentRepo.is_private && <Lock size={14} className="text-neutral-8 shrink-0" />}
                {currentRepo.is_collaborative && <Users size={14} className="text-neutral-8 shrink-0" />}
              </div>

              <div className="flex items-center gap-2.5 text-xs text-neutral-9 font-sans flex-wrap">
                <span
                  className={`size-2 rounded-[1px] ${
                    currentRepo.status === 'cooling' ? 'bg-heat-cooling' : 'bg-heat-stale'
                  }`}
                />
                <span className="capitalize font-medium text-neutral-12">{currentRepo.status}</span>
                <span className="text-neutral-5">·</span>
                <span>{lastCommitText}</span>
                {currentRepo.language && (
                  <>
                    <span className="text-neutral-5">·</span>
                    <LanguageDot language={currentRepo.language} />
                  </>
                )}
              </div>
            </div>

            <ScoreRing repo={currentRepo} size={42} strokeWidth={3} />
          </div>

          <p className="text-xs sm:text-sm text-neutral-10 leading-relaxed font-sans pt-1">
            {description}
          </p>
        </div>

        {/* Suggested Verdict Banner with Why? Popover */}
        {currentRepo.suggested_verdict && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xs border border-neutral-4 bg-neutral-2/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-10 font-sans font-medium">Suggestion:</span>
              <VerdictSuggestionChip
                suggestion={currentRepo.suggested_verdict}
                onApplyVerdict={commitDecision}
              />
            </div>
            <button
              type="button"
              onClick={() => commitDecision(currentRepo.suggested_verdict!.verdict)}
              className="text-2xs font-mono text-neutral-10 hover:text-neutral-12 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Accept suggestion [ Enter ]</span>
            </button>
          </div>
        )}

        {/* Score Breakdown with Reasons */}
        <div className="border border-neutral-4 bg-neutral-2/50 rounded-xs p-3 space-y-2">
          <div className="flex items-center justify-between text-2xs font-mono text-neutral-8 uppercase">
            <span>Score Factors ({score}/100)</span>
            <span>Impact</span>
          </div>
          <div className="space-y-1.5 text-xs font-sans">
            {scoreReasons.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between text-neutral-11">
                <span>{r.label}</span>
                <span className="font-mono text-2xs font-medium text-neutral-9">{r.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 90-Day Mini Activity Timeline */}
        <div className="space-y-1.5 border border-neutral-4 bg-neutral-2/30 p-3 rounded-xs">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-8">
            <span>90-DAY CADENCE STRIP</span>
            <span>TODAY</span>
          </div>
          <CommitStripV4
            activity={currentRepo.activity}
            status={currentRepo.status}
            daysCount={90}
            className="max-w-none w-full h-8"
          />
        </div>

        {/* README & Context Code Snippet */}
        <div className="border border-neutral-4 bg-neutral-2/70 rounded-xs p-3 font-mono text-2xs text-neutral-10 space-y-1.5">
          <div className="flex items-center justify-between text-neutral-8 pb-1 border-b border-neutral-4">
            <span className="flex items-center gap-1.5">
              <Terminal size={11} />
              <span>README context snippet</span>
            </span>
            <a
              href={`https://github.com/${currentRepo.full_name}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-12 inline-flex items-center gap-1"
            >
              <span>View repo</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <p className="font-sans text-xs text-neutral-11 pt-0.5">
            {currentRepo.full_name} is currently branch &apos;{currentRepo.default_branch || 'main'}&apos;.{' '}
            {currentRepo.meta?.note ? `Note: ${currentRepo.meta.note}` : 'No custom notes logged.'}
          </p>
        </div>

        {/* Mobile Swipe Guidance */}
        <div className="sm:hidden text-center text-[10px] font-mono text-neutral-8">
          Swipe right (Keep) · Swipe left (Retire) · Swipe up (Pause)
        </div>
      </div>

      {/* Three Large Verdict Buttons with Keyboard Hints + Skip & Undo */}
      <div className="space-y-3 pt-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Keep Going Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => commitDecision('keep')}
            className="group flex flex-col items-center justify-center min-h-[56px] p-3.5 sm:p-4 border border-neutral-5 hover:border-verdict-keep-border hover:bg-verdict-keep-bg/40 rounded-xs transition-all duration-fast cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-neutral-12 group-hover:text-verdict-keep-text transition-colors">
              <Check size={18} />
              <span>Keep</span>
            </div>
            <span className="text-2xs font-mono text-neutral-9 group-hover:text-neutral-11 mt-1">
              [ K ]
            </span>
          </button>

          {/* Pause Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => commitDecision('pause')}
            className="group flex flex-col items-center justify-center min-h-[56px] p-3.5 sm:p-4 border border-neutral-5 hover:border-verdict-pause-border hover:bg-verdict-pause-bg/40 rounded-xs transition-all duration-fast cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-neutral-12 group-hover:text-verdict-pause-text transition-colors">
              <Clock size={18} />
              <span>Pause</span>
            </div>
            <span className="text-2xs font-mono text-neutral-9 group-hover:text-neutral-11 mt-1">
              [ P ]
            </span>
          </button>

          {/* Retire Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => commitDecision('retire')}
            className="group flex flex-col items-center justify-center min-h-[56px] p-3.5 sm:p-4 border border-neutral-5 hover:border-verdict-retire-border hover:bg-verdict-retire-bg/40 rounded-xs transition-all duration-fast cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-neutral-12 group-hover:text-verdict-retire-text transition-colors">
              <Archive size={18} />
              <span>Retire</span>
            </div>
            <span className="text-2xs font-mono text-neutral-9 group-hover:text-neutral-11 mt-1">
              [ R ]
            </span>
          </button>
        </div>

        {/* Bottom Secondary Controls: Skip and Prev */}
        <div className="flex items-center justify-between text-xs text-neutral-8 font-sans px-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-2 hover:text-neutral-12 disabled:opacity-30 disabled:pointer-events-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs touch-manipulation"
          >
            <ArrowLeft size={13} />
            <span>Previous</span>
          </button>

          {onExitTriage && (
            <button
              type="button"
              onClick={onExitTriage}
              className="hover:text-neutral-12 underline text-2xs min-h-[44px] px-2.5 py-2 flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs touch-manipulation"
            >
              Exit triage (Esc)
            </button>
          )}

          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-2 hover:text-neutral-12 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs touch-manipulation"
          >
            <span>Skip [ S ]</span>
            <SkipForward size={13} />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Triage Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-2">
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Accept suggested verdict</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">Enter</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Keep repository in active ledger</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">K</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Pause / Snooze for 30 days</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">P</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Retire repository to archive</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">R</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Skip without deciding</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">S or &rarr;</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Undo last decision</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">Z or U</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Exit triage mode</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">Esc</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Toggle keyboard hints</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">?</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
