import React, { useState } from 'react';
import type { Repository } from '../../../types.js';
import { motion, useReducedMotion } from 'framer-motion';
import { ScoreRing } from './ScoreRing.js';
import { ActivitySparkline } from './ActivitySparkline.js';
import { VerdictControl } from './VerdictControl.js';
import { LanguageDot } from './LanguageDot.js';
import { Lock, Users, Tag, FileText, Clock, ExternalLink } from 'lucide-react';
import { SimpleTooltip } from '../ui/Tooltip.js';

interface RepoRowDenseProps {
  repo: Repository;
  currentUsername?: string;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenDetails: (repo: Repository) => void;
  onDecision: (repoId: number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
  onUpdateLabel?: (repoId: number, label: string) => Promise<void>;
}

function formatRelativeDays(dateStr: string | null): string {
  if (!dateStr) return 'No commits';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'No commits';

  const days = Math.floor((Date.now() - time) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return `1 month ago`;
  if (days < 365) return `${Math.floor(days / 30)} mos ago`;
  return `>1 year ago`;
}

export const RepoRowDense: React.FC<RepoRowDenseProps> = ({
  repo,
  currentUsername,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onDecision,
  onUpdateLabel,
}) => {
  const meta = repo.meta || {};
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState(meta.label || '');

  // Strip user prefix if repo owner is current user
  let displayName = repo.full_name;
  if (
    currentUsername &&
    displayName.toLowerCase().startsWith(`${currentUsername.toLowerCase()}/`)
  ) {
    displayName = displayName.substring(currentUsername.length + 1);
  }

  const handleTagSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    setIsEditingTag(false);
    if (onUpdateLabel && tagInput !== (meta.label || '')) {
      onUpdateLabel(repo.id, tagInput.trim());
    }
  };

  const description =
    (repo as any).description ||
    repo.explanation?.message ||
    (meta.note ? `Note: ${meta.note}` : 'GitHub repository ledger item');

  const shouldReduceMotion = useReducedMotion();
  const verdict = meta.decision;
  const verdictBg =
    verdict === 'keep'
      ? 'bg-verdict-keep-bg/5 hover:bg-verdict-keep-bg/10'
      : verdict === 'pause'
      ? 'bg-verdict-pause-bg/5 hover:bg-verdict-pause-bg/10'
      : verdict === 'retire'
      ? 'bg-verdict-retire-bg/5 hover:bg-verdict-retire-bg/10'
      : 'bg-neutral-1 hover:bg-neutral-2/70';

  return (
    <motion.div
      layout={!shouldReduceMotion}
      transition={{ layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
      role="article"
      tabIndex={0}
      onClick={() => onOpenDetails(repo)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isEditingTag) {
          e.preventDefault();
          onOpenDetails(repo);
        }
      }}
      style={{
        paddingTop: 'var(--row-py, 10px)',
        paddingBottom: 'var(--row-py, 10px)',
        paddingLeft: 'var(--row-px, 12px)',
        paddingRight: 'var(--row-px, 12px)',
      }}
      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-4 cursor-pointer transition-all duration-fast outline-none select-none ${
        isSelected
          ? 'bg-neutral-3/70'
          : `${verdictBg} focus-within:bg-neutral-2/70 focus-visible:ring-1 focus-visible:ring-neutral-12 focus-visible:ring-inset`
      }`}
      data-selected={isSelected}
      aria-label={`Repository ${repo.full_name}`}
    >
      {/* Left Column: Multi-select Checkbox, Score Ring, Repo Name, Description, Metadata */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(repo.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="size-3.5 rounded-[2px] border-neutral-6 text-neutral-12 focus:ring-1 focus:ring-neutral-12 cursor-pointer shrink-0"
          title="Select repository"
          aria-label={`Select ${displayName}`}
        />

        {/* Score Ring */}
        <ScoreRing repo={repo} size={26} strokeWidth={2.5} />

        {/* Name and One-line Description */}
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-neutral-12 tracking-tight truncate">
              {displayName}
            </span>

            {repo.is_private && (
              <span title="Private repository" className="text-neutral-8 shrink-0">
                <Lock size={11} strokeWidth={2} />
              </span>
            )}

            {repo.is_collaborative && (
              <span title="Collaborative repository" className="text-neutral-8 shrink-0">
                <Users size={11} />
              </span>
            )}

            {meta.label && (
              <span className="text-2xs font-mono text-neutral-11 bg-neutral-3 px-1.5 py-0.5 rounded-xs shrink-0">
                {meta.label}
              </span>
            )}
          </div>

          {/* Description line & Language / Recency */}
          <div className="flex items-center gap-2.5 text-xs text-neutral-9 font-sans truncate mt-0.5">
            <span className="truncate max-w-[200px] sm:max-w-xs text-neutral-8">
              {description}
            </span>

            {repo.language && (
              <>
                <span className="text-neutral-5" aria-hidden>·</span>
                <LanguageDot language={repo.language} />
              </>
            )}

            <span className="text-neutral-5" aria-hidden>·</span>
            <span className="shrink-0">{formatRelativeDays(repo.last_commit_at)}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Mini Sparkline, Inline Verdict Control, Secondary Actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-1 md:pt-0">
        {/* Mini Activity Sparkline */}
        <div className="w-24 sm:w-28 flex justify-end">
          <ActivitySparkline
            activity={repo.activity}
            status={repo.status}
            width={110}
            height={16}
          />
        </div>

        {/* Compact 1-Click Inline Verdict Control */}
        <VerdictControl
          currentVerdict={meta.decision}
          repoName={displayName}
          onDecision={(decision) => onDecision(repo.id, decision)}
        />

        {/* Hover/Focus Revealed Secondary Actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Tag Button / Inline Edit */}
          {isEditingTag ? (
            <form onSubmit={handleTagSubmit} className="inline-flex">
              <input
                type="text"
                autoFocus
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onBlur={handleTagSubmit}
                placeholder="tag..."
                className="w-16 h-6 px-1 text-2xs font-mono bg-neutral-1 border border-neutral-12 rounded-xs text-neutral-12 outline-none"
              />
            </form>
          ) : (
            <SimpleTooltip content="Edit tag / focus area">
              <button
                type="button"
                onClick={() => setIsEditingTag(true)}
                className="p-1 rounded-xs text-neutral-8 hover:text-neutral-12 hover:bg-neutral-3 transition-colors cursor-pointer"
                aria-label="Add or edit tag"
              >
                <Tag size={13} />
              </button>
            </SimpleTooltip>
          )}

          {/* Quick Snooze (Pause for 30d) */}
          <SimpleTooltip content="Snooze for 30 days">
            <button
              type="button"
              onClick={() => onDecision(repo.id, 'pause')}
              className="p-1 rounded-xs text-neutral-8 hover:text-verdict-pause-text hover:bg-neutral-3 transition-colors cursor-pointer"
              aria-label="Snooze"
            >
              <Clock size={13} />
            </button>
          </SimpleTooltip>

          {/* Open on GitHub */}
          <SimpleTooltip content="Open repository on GitHub">
            <a
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-xs text-neutral-8 hover:text-neutral-12 hover:bg-neutral-3 transition-colors inline-flex items-center"
              aria-label="Open on GitHub"
            >
              <ExternalLink size={13} />
            </a>
          </SimpleTooltip>
        </div>
      </div>
    </motion.div>
  );
};
