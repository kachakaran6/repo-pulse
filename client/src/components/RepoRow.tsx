import React, { useState } from 'react';
import type { Repository } from '../types.js';
import { CommitStrip } from './CommitStrip.js';
import { Lock, Users, Check, Clock, Archive } from 'lucide-react';

interface RepoRowProps {
  repo: Repository;
  currentUsername?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string | number) => void;
  onOpenDetails: (repo: Repository) => void;
  onDecision?: (repoId: string | number, decision: 'keep' | 'pause' | 'retire') => void;
  onUpdateLabel?: (repoId: string | number, label: string) => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'No commits';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'No commits';

  const days = Math.floor((Date.now() - time) / 864e5);
  if (days <= 0) return 'Last commit today';
  if (days === 1) return 'Last commit yesterday';
  if (days < 30) return `Last commit ${days} days ago`;
  if (days < 60) return `Last commit 1 month ago`;
  if (days < 365) return `Last commit ${Math.floor(days / 30)} months ago`;
  return `Last commit over a year ago`;
}

export const RepoRow: React.FC<RepoRowProps> = ({
  repo,
  currentUsername,
  isSelected = false,
  onToggleSelect,
  onOpenDetails,
  onDecision,
  onUpdateLabel,
}) => {
  const meta = repo.meta || {};
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(meta.label || '');

  // Strip username prefix only if repository owner is current user
  let displayName = repo.full_name;
  if (currentUsername && displayName.toLowerCase().startsWith(`${currentUsername.toLowerCase()}/`)) {
    displayName = displayName.substring(currentUsername.length + 1);
  }

  // 30-day commits
  const commits30d = (repo.activity || [])
    .slice(-30)
    .reduce((sum, a: any) => sum + (a.commits_mine ?? a.commits ?? 0), 0);

  const handleLabelSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    setIsEditingLabel(false);
    if (onUpdateLabel && labelText !== (meta.label || '')) {
      onUpdateLabel(repo.id, labelText.trim());
    }
  };

  return (
    <div
      className={`ledger-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onOpenDetails(repo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isEditingLabel) {
          e.preventDefault();
          onOpenDetails(repo);
        }
      }}
      title={`Open details for ${repo.full_name}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1fr) auto minmax(280px, 440px)',
        alignItems: 'center',
        padding: '10px 16px',
        gap: '16px',
        borderBottom: '1px solid var(--line)',
        backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        transition: 'var(--transition)',
        position: 'relative',
      }}
    >
      {/* Left Column: Name & Metadata */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(repo.id);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ margin: 0, cursor: 'pointer' }}
              title="Select row"
            />
          )}

          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </span>

          {repo.is_private && (
            <span title="Private" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Lock size={12} strokeWidth={1.75} style={{ color: 'var(--ink-2)' }} aria-label="Private" />
            </span>
          )}

          {repo.is_collaborative && (
            <span
              title="Collaborative repository"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--ink-2)',
              }}
            >
              <Users size={12} strokeWidth={1.75} />
              <span>Team</span>
            </span>
          )}
        </div>

        {/* Second Line Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--ink-2)',
            flexWrap: 'wrap',
          }}
        >
          <span>{formatRelativeTime(repo.last_commit_at)}</span>
          {repo.language && <span>{repo.language}</span>}
          <span>{commits30d} {commits30d === 1 ? 'commit' : 'commits'} in 30d</span>

          {/* Inline Label Editing */}
          {isEditingLabel ? (
            <form onSubmit={handleLabelSubmit} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={handleLabelSubmit}
                placeholder="Add label..."
                style={{
                  padding: '1px 6px',
                  fontSize: '11px',
                  border: '1px solid var(--ink)',
                  borderRadius: 'var(--r)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              />
            </form>
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingLabel(true);
              }}
              style={{
                cursor: 'pointer',
                color: meta.label ? 'var(--ink)' : 'var(--ink-2)',
                fontWeight: meta.label ? 500 : 400,
                borderBottom: '1px dotted var(--line)',
              }}
              title="Click to edit label"
            >
              {meta.label || '+ label'}
            </span>
          )}

          {meta.goal_date && (
            <span style={{ color: 'var(--heat-active)', fontWeight: 500 }}>
              Goal: {meta.goal_date}
            </span>
          )}
        </div>
      </div>

      {/* Middle Column: Inline Quick Actions (Hover & Focus) */}
      <div
        className="row-quick-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onDecision && (
          <>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onDecision(repo.id, 'keep')}
              title="Keep going [K]"
              style={{ padding: '4px', color: 'var(--ink-2)' }}
            >
              <Check size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onDecision(repo.id, 'pause')}
              title="Pause [P]"
              style={{ padding: '4px', color: 'var(--ink-2)' }}
            >
              <Clock size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onDecision(repo.id, 'retire')}
              title="Retire to Archive [R]"
              style={{ padding: '4px', color: 'var(--ink-2)' }}
            >
              <Archive size={14} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {/* Right Column: 90-Day Strip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '440px' }}>
        <CommitStrip activity={repo.activity} status={repo.status} daysCount={90} />
      </div>
    </div>
  );
};
