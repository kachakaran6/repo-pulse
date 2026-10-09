import React, { useState, useEffect } from 'react';
import type { Repository } from '../types.js';
import { ExternalLink, Lock, Users, Calendar, Tag, FileText, Check, Clock, Archive, X } from 'lucide-react';

interface RepoDetailModalProps {
  repo: Repository;
  onClose: () => void;
  onSave: (repoId: string | number, updates: { label?: string | null; goal_date?: string | null; note?: string | null }) => Promise<void>;
  onDecision?: (repoId: string | number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
}

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({
  repo,
  onClose,
  onSave,
  onDecision,
}) => {
  const [label, setLabel] = useState(repo.meta?.label || '');
  const [goalDate, setGoalDate] = useState(repo.meta?.goal_date || '');
  const [note, setNote] = useState(repo.meta?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [contributors, setContributors] = useState<{ login: string; avatar_url?: string; commits_30d: number }[]>([]);

  // Fetch contributors if collaborative
  useEffect(() => {
    fetch(`/api/contributors/${repo.id}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setContributors(data))
      .catch(() => {});
  }, [repo.id]);

  // 90-day activity breakdown
  const activityMap = new Map<string, number>();
  for (const act of repo.activity || []) {
    activityMap.set(act.day, act.commits_mine ?? act.commits ?? 0);
  }
  const dayMs = 864e5;
  const now = new Date();
  const ninetyDays: { dateStr: string; commits: number; isWeekTick: boolean }[] = [];
  let total90DayCommits = 0;

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = d.toISOString().split('T')[0];
    const commits = activityMap.get(dateStr) || 0;
    total90DayCommits += commits;
    ninetyDays.push({ dateStr, commits, isWeekTick: i % 7 === 0 });
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(repo.id, {
        label: label.trim() || null,
        goal_date: goalDate || null,
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 500,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '560px',
          maxWidth: '100%',
          height: '100%',
          backgroundColor: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          padding: '32px',
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                {repo.full_name}
              </h2>
              {repo.is_private && <Lock size={14} strokeWidth={1.75} style={{ color: 'var(--ink-2)' }} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink-2)' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: `var(--heat-${repo.status})`, display: 'inline-block' }} />
              <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{repo.status}</strong>
              <span>·</span>
              <span>{repo.explanation.message}</span>
            </div>
          </div>

          <button type="button" className="btn-quiet" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* 90-Day Strip */}
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--paper)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-2)', marginBottom: '8px' }}>
            <span>90-day activity: <strong style={{ color: 'var(--ink)' }}>{total90DayCommits}</strong> commits</span>
            <span>Today</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '36px' }}>
            {ninetyDays.map((day, idx) => {
              const heightPx = day.commits === 0 ? 3 : Math.min(32, 6 + day.commits * 4);
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: `${heightPx}px`,
                    backgroundColor: day.commits > 0 ? `var(--heat-${repo.status})` : 'var(--line)',
                    borderLeft: day.isWeekTick ? '1px solid var(--surface-2)' : 'none',
                  }}
                  title={`${day.dateStr}: ${day.commits} commit${day.commits === 1 ? '' : 's'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Actions & Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <a
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', textDecoration: 'none' }}
          >
            Open on GitHub
            <ExternalLink size={13} strokeWidth={1.75} />
          </a>

          {onDecision && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => onDecision(repo.id, 'keep')}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={13} />
                Keep
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => onDecision(repo.id, 'pause')}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Clock size={13} />
                Pause
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => onDecision(repo.id, 'retire')}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--heat-active)' }}
              >
                <Archive size={13} />
                Retire
              </button>
            </div>
          )}
        </div>

        {/* Contributors List (W5) */}
        {contributors.length > 0 && (
          <div style={{ marginBottom: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '8px' }}>
              Top contributors (last 30 days)
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {contributors.map((c) => (
                <div key={c.login} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.login} style={{ width: '20px', height: '20px', borderRadius: 'var(--r-pill)' }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: 'var(--r-pill)', backgroundColor: 'var(--surface-2)' }} />
                    )}
                    <span style={{ color: 'var(--ink)' }}>{c.login}</span>
                  </div>
                  <span style={{ color: 'var(--ink-2)' }}>{c.commits_30d} commits</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Editing Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. SaaS, Core Infrastructure, Legacy Tool"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
              Goal date
            </label>
            <input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
              Notes & roadmap thoughts
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Private notes about this repository..."
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
