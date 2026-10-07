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
  const todayStr = new Date().toISOString().split('T')[0];

  const triageCandidates = useMemo(() => {
    return repos.filter((r) => {
      if (r.is_retired) return false;
      if (r.is_paused) return false;
      return r.status === 'cooling' || r.status === 'stale';
    });
  }, [repos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [goalDate, setGoalDate] = useState('');
  const [pauseDate, setPauseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Keyboard shortcut listener (K, P, R, Z, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setShowGoalInput(true);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
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
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>All repos triaged</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
          No cooling or stale repositories currently need a decision. Check Overview to see active work or visit Archive for retired projects.
        </p>
        {hasUndoableAction && (
          <button
            type="button"
            className="btn-outline"
            onClick={onUndoLastDecision}
          >
            Undo last decision (Z)
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
    <div className="triage-wrap">
      {/* Progress & Navigation Line */}
      <div className="triage-progress-line">
        <span>
          Repository <strong className="num">{currentIndex + 1}</strong> of{' '}
          <strong className="num">{triageCandidates.length}</strong> in triage queue
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasUndoableAction && (
            <button
              type="button"
              className="btn-quiet"
              onClick={onUndoLastDecision}
            >
              Undo (Z)
            </button>
          )}
          <button
            type="button"
            className="btn-quiet"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            &larr; Prev
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={handleNext}
            disabled={currentIndex === triageCandidates.length - 1}
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* 40px Repo Monospace Title & Meta */}
      <div>
        <h1 className="triage-title-40">{currentRepo.full_name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '15px', color: 'var(--ink-2)', marginTop: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className={`swatch-square ${currentRepo.status}`} />
            <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{currentRepo.status}</strong>
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
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{currentRepo.meta.label}</span>
            </>
          )}
        </div>
      </div>

      {/* Full-width 90-Day Commit Strip */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>90-day commit activity</span>
          <span>Today</span>
        </div>
        <div className="triage-strip-full">
          {ninetyDays.map((day, idx) => {
            const heightPx = day.commits === 0 ? 4 : Math.min(44, 8 + day.commits * 5);
            const barClass = day.commits > 0 ? currentRepo.status : 'dead';
            return (
              <div
                key={idx}
                className={`triage-strip-day-full ${barClass}`}
                style={{ height: `${heightPx}px` }}
                title={`${day.dateStr}: ${day.commits} commit${day.commits === 1 ? '' : 's'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Three Outline Buttons with shortcuts K / P / R underneath */}
      <div className="triage-button-row">
        <button
          type="button"
          className="btn-triage-outline"
          onClick={() => {
            setShowGoalInput(true);
            setShowPauseInput(false);
          }}
        >
          <span className="btn-triage-text">Keep going</span>
          <span className="btn-triage-shortcut">Shortcut: K</span>
        </button>

        <button
          type="button"
          className="btn-triage-outline"
          onClick={() => {
            const defaultPause = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
            setPauseDate(defaultPause);
            setShowPauseInput(true);
            setShowGoalInput(false);
          }}
        >
          <span className="btn-triage-text">Pause</span>
          <span className="btn-triage-shortcut">Shortcut: P</span>
        </button>

        <button
          type="button"
          className="btn-triage-outline"
          onClick={handleRetire}
        >
          <span className="btn-triage-text">Retire</span>
          <span className="btn-triage-shortcut">Shortcut: R</span>
        </button>
      </div>

      {/* Keep Going Target Date Prompt */}
      {showGoalInput && (
        <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <label htmlFor="keep-goal-input" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Target milestone or review date:
            </label>
            <input
              id="keep-goal-input"
              type="date"
              className="clean-input"
              style={{ width: '200px' }}
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-ink"
              onClick={() => handleKeep(goalDate || undefined)}
            >
              Confirm Keep
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowGoalInput(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pause Resurface Date Prompt */}
      {showPauseInput && (
        <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <label htmlFor="pause-resurface-input" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Resurfaces on date (hidden until then):
            </label>
            <input
              id="pause-resurface-input"
              type="date"
              className="clean-input"
              style={{ width: '200px' }}
              value={pauseDate}
              min={todayStr}
              onChange={(e) => setPauseDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-ink"
              onClick={() => handlePause(pauseDate)}
            >
              Confirm Pause
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowPauseInput(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
