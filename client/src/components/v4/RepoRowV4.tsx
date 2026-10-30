import React, { useState } from 'react';
import type { Repository } from '../../types.js';
import { CommitStripV4 } from './CommitStripV4.js';
import { Lock, Users, Check, Clock, Archive, Tag } from 'lucide-react';

interface RepoRowV4Props {
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
  if (days < 30) return `Last commit ${days}d ago`;
  if (days < 60) return `Last commit 1mo ago`;
  if (days < 365) return `Last commit ${Math.floor(days / 30)}mo ago`;
  return `Last commit >1y ago`;
}

export const RepoRowV4: React.FC<RepoRowV4Props> = ({
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

  // Strip username prefix when owner is the current user
  let displayName = repo.full_name;
  if (
    currentUsername &&
    displayName.toLowerCase().startsWith(`${currentUsername.toLowerCase()}/`)
  ) {
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
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(repo)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isEditingLabel) {
          e.preventDefault();
          onOpenDetails(repo);
        }
      }}
      className={`group relative flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-3 px-4 py-3 border-b border-neutral-4 cursor-pointer transition-colors duration-fast outline-none select-none ${
        isSelected
          ? 'bg-neutral-3'
          : 'bg-neutral-1 hover:bg-neutral-2 focus-visible:bg-neutral-2 focus-visible:ring-1 focus-visible:ring-neutral-12 focus-visible:ring-inset'
      }`}
      aria-label={`Repository ${repo.full_name}, status ${repo.status}`}
    >
      {/* Left Info Column */}
      <div className="flex-1 min-w-0 pr-2">
        {/* Repo Name Line */}
        <div className="flex items-center gap-2 mb-1">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(repo.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="size-3.5 rounded-[2px] border-neutral-6 text-neutral-12 focus:ring-1 focus:ring-neutral-12 cursor-pointer mr-1"
              title="Select row"
              aria-label={`Select ${displayName}`}
            />
          )}

          <span className="font-mono text-sm font-medium text-neutral-12 truncate tracking-tight">
            {displayName}
          </span>

          {repo.is_private && (
            <span title="Private repository" className="inline-flex items-center text-neutral-9">
              <Lock size={12} strokeWidth={2} aria-label="Private" />
            </span>
          )}

          {repo.is_collaborative && (
            <span
              title="Collaborative / Team repository"
              className="inline-flex items-center gap-1 text-2xs text-neutral-9 font-sans"
            >
              <Users size={12} strokeWidth={1.75} />
              <span className="hidden sm:inline">Team</span>
            </span>
          )}

          {meta.decision && (
            <span
              className={`text-2xs font-mono uppercase px-1.5 py-0.2 rounded-xs border ${
                meta.decision === 'keep'
                  ? 'border-verdict-keep-border text-verdict-keep-text bg-verdict-keep-bg'
                  : meta.decision === 'pause'
                  ? 'border-verdict-pause-border text-verdict-pause-text bg-verdict-pause-bg'
                  : 'border-verdict-retire-border text-verdict-retire-text bg-verdict-retire-bg'
              }`}
            >
              {meta.decision}
            </span>
          )}
        </div>

        {/* Metadata Line: plain text separated by spacing, not pill boxes */}
        <div className="flex items-center gap-3 text-xs text-neutral-9 flex-wrap font-sans">
          <span>{formatRelativeTime(repo.last_commit_at)}</span>

          {repo.language && (
            <>
              <span className="text-neutral-6" aria-hidden>·</span>
              <span>{repo.language}</span>
            </>
          )}

          <span className="text-neutral-6" aria-hidden>·</span>
          <span className="font-mono tabular">
            {commits30d} {commits30d === 1 ? 'commit' : 'commits'} in 30d
          </span>

          {/* Inline Label Editing */}
          {isEditingLabel ? (
            <form onSubmit={handleLabelSubmit} onClick={(e) => e.stopPropagation()} className="inline-flex items-center">
              <input
                type="text"
                autoFocus
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={handleLabelSubmit}
                placeholder="tag name..."
                className="h-5 px-1.5 text-2xs border border-neutral-12 rounded-xs bg-neutral-1 text-neutral-12 font-mono outline-none"
              />
            </form>
          ) : (
            <>
              <span className="text-neutral-6" aria-hidden>·</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLabel(true);
                }}
                className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
                  meta.label
                    ? 'text-neutral-12 font-medium hover:underline'
                    : 'text-neutral-8 hover:text-neutral-11'
                }`}
                title="Click to edit label"
              >
                <Tag size={10} className="shrink-0" />
                <span>{meta.label || 'tag'}</span>
              </span>
            </>
          )}

          {meta.goal_date && (
            <>
              <span className="text-neutral-6" aria-hidden>·</span>
              <span className="text-heat-active font-medium font-mono text-2xs">
                Goal: {meta.goal_date}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Column: 90-Day Strip & Subtle Hover Quick Actions */}
      <div className="flex items-center gap-4 shrink-0 max-[480px]:w-full">
        {/* Quick Triage Buttons (Quiet, visible on desktop hover/focus) */}
        {onDecision && (
          <div
            className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onDecision(repo.id, 'keep')}
              title="Keep going [K]"
              className="p-1 rounded-xs text-neutral-9 hover:text-verdict-keep-text hover:bg-neutral-3 transition-colors"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDecision(repo.id, 'pause')}
              title="Pause [P]"
              className="p-1 rounded-xs text-neutral-9 hover:text-verdict-pause-text hover:bg-neutral-3 transition-colors"
            >
              <Clock size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDecision(repo.id, 'retire')}
              title="Retire to Archive [R]"
              className="p-1 rounded-xs text-neutral-9 hover:text-verdict-retire-text hover:bg-neutral-3 transition-colors"
            >
              <Archive size={14} />
            </button>
          </div>
        )}

        {/* 90-Day Commit Strip */}
        <div className="w-full max-[480px]:w-full min-[480px]:w-[360px] flex justify-end">
          <CommitStripV4 activity={repo.activity} status={repo.status} daysCount={90} />
        </div>
      </div>
    </div>
  );
};
