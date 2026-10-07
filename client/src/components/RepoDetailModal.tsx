import React, { useState } from 'react';
import type { Repository } from '../types.js';

interface RepoDetailModalProps {
  repo: Repository;
  onClose: () => void;
  onSave: (repoId: number, updates: { label?: string | null; goal_date?: string | null; note?: string | null }) => Promise<void>;
}

const PREDEFINED_LABELS = [
  'SaaS',
  'Web app',
  'API/service',
  'Full ERP',
  'Mobile app',
  'Library',
  'CLI/tool',
  'Infrastructure',
  'Learning/experiment',
  'Client project',
  'Legacy',
  'Other',
];

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({ repo, onClose, onSave }) => {
  const [label, setLabel] = useState(repo.meta?.label || '');
  const [customLabel, setCustomLabel] = useState('');
  const [goalDate, setGoalDate] = useState(repo.meta?.goal_date || '');
  const [note, setNote] = useState(repo.meta?.note || '');
  const [isSaving, setIsSaving] = useState(false);

  // 90-day activity calculation
  const activityMap = new Map<string, number>();
  for (const act of repo.activity) {
    activityMap.set(act.day, act.commits);
  }
  const dayMs = 864e5;
  const now = new Date();
  const ninetyDays: { dateStr: string; commits: number }[] = [];
  let total90DayCommits = 0;
  let activeDaysCount = 0;

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = d.toISOString().split('T')[0];
    const commits = activityMap.get(dateStr) || 0;
    if (commits > 0) {
      total90DayCommits += commits;
      activeDaysCount++;
    }
    ninetyDays.push({ dateStr, commits });
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const finalLabel = customLabel.trim() || label.trim() || null;
    try {
      await onSave(repo.id, {
        label: finalLabel,
        goal_date: goalDate || null,
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 700 }}>
              {repo.full_name}
            </h2>
            <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              <span className={`status-dot ${repo.status}`} />
              <strong style={{ textTransform: 'capitalize' }}>{repo.status}</strong>
              <span>&bull;</span>
              <span>{repo.explanation.message}</span>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            &times; Close
          </button>
        </div>

        {/* 90-Day Commit Ledger Strip */}
        <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'var(--chalk)', borderRadius: 'var(--r-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
            <span>90-day activity: <strong className="num">{total90DayCommits}</strong> commits across <strong className="num">{activeDaysCount}</strong> days</span>
            <span>Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '36px' }}>
            {ninetyDays.map((day, idx) => {
              const heightPx = day.commits === 0 ? 3 : Math.min(32, 6 + day.commits * 4);
              const barClass = day.commits > 0 ? repo.status : 'dead';
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

        {/* Metadata Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Label selector */}
          <div className="form-field">
            <label className="form-label">Classification label</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {PREDEFINED_LABELS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`label-chip ${label === preset ? 'active' : ''}`}
                  style={{
                    backgroundColor: label === preset ? 'var(--ink)' : undefined,
                    color: label === preset ? 'var(--chalk)' : undefined,
                  }}
                  onClick={() => {
                    setLabel(preset);
                    setCustomLabel('');
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Or type a custom label..."
              value={customLabel}
              onChange={(e) => {
                setCustomLabel(e.target.value);
                setLabel('');
              }}
            />
          </div>

          {/* Goal Date */}
          <div className="form-field">
            <label className="form-label" htmlFor="goal-date-input">Target milestone / ship date</label>
            <input
              id="goal-date-input"
              type="date"
              className="form-input"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="form-field">
            <label className="form-label" htmlFor="repo-note-textarea">Personal notes & context</label>
            <textarea
              id="repo-note-textarea"
              rows={3}
              className="form-input"
              placeholder="Why this repo matters, current blocker, or next planned step..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
