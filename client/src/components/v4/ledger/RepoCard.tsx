import React from 'react';
import type { Repository } from '../../../types.js';
import { motion, useReducedMotion } from 'framer-motion';
import { ScoreRing } from './ScoreRing.js';
import { ActivitySparkline } from './ActivitySparkline.js';
import { VerdictControl } from './VerdictControl.js';
import { LanguageDot } from './LanguageDot.js';
import { Lock, Users, ExternalLink, Clock, Tag } from 'lucide-react';
import { SimpleTooltip } from '../ui/Tooltip.js';

interface RepoCardProps {
  repo: Repository;
  currentUsername?: string;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenDetails: (repo: Repository) => void;
  onDecision: (repoId: number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
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

export const RepoCard: React.FC<RepoCardProps> = ({
  repo,
  currentUsername,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onDecision,
}) => {
  const meta = repo.meta || {};

  let displayName = repo.full_name;
  if (
    currentUsername &&
    displayName.toLowerCase().startsWith(`${currentUsername.toLowerCase()}/`)
  ) {
    displayName = displayName.substring(currentUsername.length + 1);
  }

  const description =
    (repo as any).description ||
    repo.explanation?.message ||
    (meta.note ? `Note: ${meta.note}` : 'GitHub repository ledger item');

  const shouldReduceMotion = useReducedMotion();
  const verdict = meta.decision;
  const verdictStyle =
    verdict === 'keep'
      ? 'border-verdict-keep-border/60 hover:border-verdict-keep-border bg-verdict-keep-bg/5'
      : verdict === 'pause'
      ? 'border-verdict-pause-border/60 hover:border-verdict-pause-border bg-verdict-pause-bg/5'
      : verdict === 'retire'
      ? 'border-verdict-retire-border/60 hover:border-verdict-retire-border bg-verdict-retire-bg/5'
      : 'border-neutral-4 bg-neutral-1 hover:border-neutral-6 hover:bg-neutral-2/50';

  return (
    <motion.div
      layout={!shouldReduceMotion}
      transition={{ layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
      role="article"
      tabIndex={0}
      onClick={() => onOpenDetails(repo)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails(repo);
        }
      }}
      style={{
        padding: 'var(--card-p, 16px)',
      }}
      className={`group relative flex flex-col justify-between border rounded-xs cursor-pointer transition-all duration-fast outline-none select-none ${
        isSelected
          ? 'border-neutral-12 bg-neutral-2 shadow-xs'
          : verdictStyle
      }`}
      data-selected={isSelected}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
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
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-neutral-12 truncate">
                {displayName}
              </span>
              {repo.is_private && <Lock size={11} className="text-neutral-8 shrink-0" />}
              {repo.is_collaborative && <Users size={11} className="text-neutral-8 shrink-0" />}
            </div>
            {meta.label && (
              <span className="inline-block mt-0.5 text-2xs font-mono text-neutral-10 bg-neutral-3 px-1.5 py-0.2 rounded-xs">
                {meta.label}
              </span>
            )}
          </div>
        </div>

        {/* Score Ring */}
        <ScoreRing repo={repo} size={28} strokeWidth={2.5} />
      </div>

      {/* Description & Meta Details */}
      <div className="py-2.5 space-y-1.5">
        <p className="text-xs text-neutral-9 font-sans line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center gap-2 text-xs text-neutral-8 font-sans">
          {repo.language && (
            <>
              <LanguageDot language={repo.language} />
              <span className="text-neutral-5">·</span>
            </>
          )}
          <span>{formatRelativeDays(repo.last_commit_at)}</span>
        </div>
      </div>

      {/* Mini Sparkline Full Card Width */}
      <div className="py-1">
        <ActivitySparkline
          activity={repo.activity}
          status={repo.status}
          width="100%"
          height={18}
        />
      </div>

      {/* Bottom Footer Row: Verdict Control and Quick Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-neutral-4 pt-3 mt-1">
        <VerdictControl
          currentVerdict={meta.decision}
          repoName={displayName}
          onDecision={(decision) => onDecision(repo.id, decision)}
          size="xs"
        />

        {/* Secondary Actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <SimpleTooltip content="Snooze for 30 days">
            <button
              type="button"
              onClick={() => onDecision(repo.id, 'pause')}
              className="p-1 rounded-xs text-neutral-8 hover:text-neutral-12 hover:bg-neutral-3 transition-colors"
            >
              <Clock size={13} />
            </button>
          </SimpleTooltip>

          <SimpleTooltip content="Open repository on GitHub">
            <a
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-xs text-neutral-8 hover:text-neutral-12 hover:bg-neutral-3 transition-colors inline-flex items-center"
            >
              <ExternalLink size={13} />
            </a>
          </SimpleTooltip>
        </div>
      </div>
    </motion.div>
  );
};
