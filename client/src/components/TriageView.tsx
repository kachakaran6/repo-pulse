import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Repository } from '../types.js';

interface TriageViewProps {
  repos: Repository[];
  onDecision: (
    repoId: number,
    decision: 'keep' | 'pause' | 'retire',
    options?: { goal_date?: string | null; paused_until?: string | null }
  ) => Promise<void>;
  onUndoLastDecision: () => Promise<void>;
  hasUndoableAction: boolean;
}

export const TriageView: React.FC<TriageViewProps> = ({
  repos,
  onDecision,
  onUndoLastDecision,
  hasUndoableAction,
}) => {
  // Cooling and Stale repositories that are not retired and not currently paused
  const todayStr = new Date().toISOString().split('T')[0];

  const triageCandidates = useMemo(() => {
    return repos.filter((r) => {
      if (r.is_retired) return false;
      if (r.is_paused) return false;
      // Focus triage on cooling and stale repos, or undecorated dead repos
      return r.status === 'cooling' || r.status === 'stale';
    });
  }, [repos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [goalDate, setGoalDate] = useState('');
  const [pauseDate, setPauseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep index within bounds
  const currentRepo: Repository | undefined = triageCandidates[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < triageCandidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowGoalInput(false);
      setShowPauseInput(false);
    }
  }, [currentIndex, triageCandidates.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowGoalInput(false);
      setShowPauseInput(false);
    }
  }, [currentIndex]);

  const handleKeep = async (dateVal?: string) => {
    if (!currentRepo || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDecision(currentRepo.id, 'keep', { goal_date: dateVal || null });
      setShowGoalInput(false);
      setGoalDate('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async (dateVal: string) => {
    if (!currentRepo || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDecision(currentRepo.id, 'pause', { paused_until: dateVal });
      setShowPauseInput(false);
      setPauseDate('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetire = async () => {
    if (!currentRepo || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDecision(currentRepo.id, 'retire');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut handler (K, P, R, Z, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setShowGoalInput(true);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        // Default pause date: 30 days from now
        const defaultPause = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
        setPauseDate(defaultPause);
        setShowPauseInput(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRetire();
      } else if (e.key === 'z' || e.key === 'Z') {
        if (hasUndoableAction) {
          e.preventDefault();
          onUndoLastDecision();
        }
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRepo, hasUndoableAction, handleNext, handlePrev]);

  if (triageCandidates.length === 0 || !currentRepo) {
    return (
      <div className="empty-state">
        <h2 className="empty-state-title">All repos triaged</h2>
        <p className="empty-state-desc">
          There are no cooling or stale repositories currently awaiting decision.
          You can check the Overview to see active repositories or visit Archive to view retired ones.
        </p>
        {hasUndoableAction && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onUndoLastDecision}
            style={{ marginTop: '16px' }}
          >
            Undo last decision
          </button>
        )}
      </div>
    );
  }

  // 90-day activity map
  const activityMap = new Map<string, number>();
  for (const act of currentRepo.activity) {
    activityMap.set(act.day, act.commits);
  }
  const dayMs = 864e5;
  const now = new Date();
  const ninetyDays: { dateStr: string; commits: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = d.toISOString().split('T')[0];
    ninetyDays.push({
      dateStr,
      commits: activityMap.get(dateStr) || 0,
    });
  }

  const daysSinceCommit = currentRepo.explanation.days;
  const lastCommitText =
    daysSinceCommit === null
      ? 'No commit activity on record'
      : daysSinceCommit === 0
      ? 'Committed today'
      : `Last commit ${daysSinceCommit} day${daysSinceCommit === 1 ? '' : 's'} ago`;

  return (
    <div className="triage-container">
      {/* Progress & Navigation Header */}
      <div className="triage-progress-bar">
        <span>
          Repository <strong className="num">{currentIndex + 1}</strong> of{' '}
          <strong className="num">{triageCandidates.length}</strong> in triage queue
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasUndoableAction && (
            <button
              type="button"
              className="icon-btn"
              onClick={onUndoLastDecision}
              title="Undo last decision (Shortcut: Z)"
            >
              Undo (Z)
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Previous (Left arrow)"
          >
            &larr; Prev
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={handleNext}
            disabled={currentIndex === triageCandidates.length - 1}
            title="Next (Right arrow)"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Main Triage Focus Card */}
      <div className="triage-card">
        <div>
          <h1 className="triage-repo-name">{currentRepo.full_name}</h1>
          <div className="triage-status-line">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${currentRepo.status}`} />
              <strong style={{ textTransform: 'capitalize' }}>{currentRepo.status}</strong>
            </span>
            <span>&bull;</span>
            <span>{lastCommitText}</span>
            {currentRepo.language && (
              <>
                <span>&bull;</span>
                <span>{currentRepo.language}</span>
              </>
            )}
            {currentRepo.meta?.label && (
              <>
                <span>&bull;</span>
                <span className="label-chip">{currentRepo.meta.label}</span>
              </>
            )}
          </div>
        </div>

        {/* 90-Day Commit Strip */}
        <div className="triage-strip-wrap">
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>90-day commit ledger</span>
            <span>Today</span>
          </div>
          <div className="triage-strip">
            {ninetyDays.map((day, idx) => {
              const heightPx = day.commits === 0 ? 4 : Math.min(44, 8 + day.commits * 6);
              const barClass = day.commits > 0 ? currentRepo.status : 'dead';
              return (
                <div
                  key={idx}
                  className={`triage-strip-day ${barClass}`}
                  style={{ height: `${heightPx}px` }}
                  title={`${day.dateStr}: ${day.commits} commit${day.commits === 1 ? '' : 's'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Decision Actions Grid */}
        <div className="triage-actions-grid">
          <button
            type="button"
            className="triage-btn keep"
            onClick={() => {
              setShowGoalInput(true);
              setShowPauseInput(false);
            }}
          >
            <div className="triage-btn-title">
              <span>Keep going</span>
              <span className="key-badge">K</span>
            </div>
            <p className="triage-btn-desc">Active project. Optional target goal date.</p>
          </button>

          <button
            type="button"
            className="triage-btn pause"
            onClick={() => {
              const defaultPause = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
              setPauseDate(defaultPause);
              setShowPauseInput(true);
              setShowGoalInput(false);
            }}
          >
            <div className="triage-btn-title">
              <span>Pause</span>
              <span className="key-badge">P</span>
            </div>
            <p className="triage-btn-desc">Temporarily shelve until a return date.</p>
          </button>

          <button
            type="button"
            className="triage-btn retire"
            onClick={handleRetire}
          >
            <div className="triage-btn-title">
              <span>Retire</span>
              <span className="key-badge">R</span>
            </div>
            <p className="triage-btn-desc">Move to archive ledger. Can bring back anytime.</p>
          </button>
        </div>

        {/* Keep Going Target Date Prompt */}
        {showGoalInput && (
          <div className="triage-date-prompt">
            <div>
              <label htmlFor="keep-goal-input" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Optional target ship / review date:
              </label>
              <input
                id="keep-goal-input"
                type="date"
                className="native-date-input"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleKeep(goalDate || undefined)}
              >
                Confirm Keep
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowGoalInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pause Resurface Date Prompt */}
        {showPauseInput && (
          <div className="triage-date-prompt">
            <div>
              <label htmlFor="pause-resurface-input" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Resurfaces on date (hidden until then):
              </label>
              <input
                id="pause-resurface-input"
                type="date"
                className="native-date-input"
                value={pauseDate}
                min={todayStr}
                onChange={(e) => setPauseDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handlePause(pauseDate)}
              >
                Confirm Pause
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPauseInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
