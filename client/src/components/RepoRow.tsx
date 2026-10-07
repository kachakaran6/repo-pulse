import React from 'react';
import type { Repository } from '../types.js';
import { CommitStrip } from './CommitStrip.js';

interface RepoRowProps {
  repo: Repository;
  onOpenDetails: (repo: Repository) => void;
  onQuickLabel: (repo: Repository, label: string) => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'No commits recorded';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'No commits recorded';

  const days = Math.floor((Date.now() - time) / 864e5);
  if (days <= 0) return 'Last commit today';
  if (days === 1) return 'Last commit yesterday';
  if (days < 30) return `Last commit ${days} days ago`;
  if (days < 60) return `Last commit 1 month ago`;
  if (days < 365) return `Last commit ${Math.floor(days / 30)} months ago`;
  return `Last commit over a year ago`;
}

export const RepoRow: React.FC<RepoRowProps> = ({ repo, onOpenDetails }) => {
  const meta = repo.meta || {};
  const hasGoal = Boolean(meta.goal_date);
  const hasNote = Boolean(meta.note);

  return (
    <div className="repo-row">
      <div className="repo-title-block">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noreferrer"
            className="repo-name-link"
          >
            {repo.full_name}
          </a>
          {repo.is_private && <span className="private-tag">Private</span>}
          {repo.language && (
            <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
              {repo.language}
            </span>
          )}
        </div>
        <div className="repo-meta-row">
          <span>{formatRelativeTime(repo.last_commit_at)}</span>
          {hasGoal && (
            <span style={{ color: 'var(--active)', fontWeight: 500 }}>
              Goal: {meta.goal_date}
            </span>
          )}
          {hasNote && (
            <span style={{ color: 'var(--ink-soft)' }}>Note attached</span>
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          className={`label-chip ${!meta.label ? 'empty' : ''}`}
          onClick={() => onOpenDetails(repo)}
          title="Edit label and repository goals"
        >
          {meta.label || '+ Add label'}
        </button>
      </div>

      <div>
        <CommitStrip activity={repo.activity} status={repo.status} daysCount={30} />
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onOpenDetails(repo)}
          title="View 90-day history and details"
        >
          Details
        </button>
      </div>
    </div>
  );
};
