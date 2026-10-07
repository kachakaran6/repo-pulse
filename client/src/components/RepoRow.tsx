import React from 'react';
import type { Repository } from '../types.js';
import { CommitStrip } from './CommitStrip.js';

interface RepoRowProps {
  repo: Repository;
  currentUsername?: string;
  onOpenDetails: (repo: Repository) => void;
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

export const RepoRow: React.FC<RepoRowProps> = ({ repo, currentUsername, onOpenDetails }) => {
  const meta = repo.meta || {};

  // Strip username prefix if repository is owned by the current user
  let displayName = repo.full_name;
  if (currentUsername && displayName.startsWith(`${currentUsername}/`)) {
    displayName = displayName.substring(currentUsername.length + 1);
  }

  return (
    <div
      className="ledger-row"
      onClick={() => onOpenDetails(repo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails(repo);
        }
      }}
      title={`Open details for ${repo.full_name}`}
    >
      <div className="repo-info-cell">
        <div className="repo-name-line">
          <span>{displayName}</span>
          {repo.is_private && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Private repository"
              style={{ color: 'var(--ink-2)', flexShrink: 0 }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </div>

        <div className="repo-meta-line">
          <span>{formatRelativeTime(repo.last_commit_at)}</span>
          {repo.language && <span>{repo.language}</span>}
          {meta.label && <span className="repo-label-text">{meta.label}</span>}
          {meta.goal_date && (
            <span style={{ color: 'var(--heat-active)', fontWeight: 500 }}>
              Goal: {meta.goal_date}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CommitStrip activity={repo.activity} status={repo.status} daysCount={90} />
      </div>
    </div>
  );
};
