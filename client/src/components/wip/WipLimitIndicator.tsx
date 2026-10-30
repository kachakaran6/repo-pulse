import React from 'react';
import { Layers } from 'lucide-react';

export interface WipLimitIndicatorProps {
  currentCount: number;
  wipLimit?: number | null;
  className?: string;
  onClick?: () => void;
}

/**
 * Small indicator in the ledger header showing "4 of 5 active".
 * Turns amber at the limit, and NEVER red, in keeping with RepoPulse's
 * calm, decision-focused, guilt-free philosophy.
 */
export const WipLimitIndicator: React.FC<WipLimitIndicatorProps> = ({
  currentCount,
  wipLimit,
  className = '',
  onClick,
}) => {
  const isLimitActive = typeof wipLimit === 'number' && wipLimit > 0;
  const isAtOrOverLimit = isLimitActive && currentCount >= wipLimit;

  // Never red! Turning amber at the limit.
  const colorClasses = isAtOrOverLimit
    ? 'border-amber-400/60 bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:border-amber-500/40'
    : 'border-neutral-5 bg-neutral-2/80 text-neutral-10 hover:text-neutral-12 dark:border-neutral-7 dark:bg-neutral-8/30';

  const label = isLimitActive
    ? `${currentCount} of ${wipLimit} active`
    : `${currentCount} active`;

  const ariaDescription = isAtOrOverLimit
    ? `Work in progress limit reached: ${label}. Consider pausing a project before adding more.`
    : `Work in progress: ${label}.`;

  const content = (
    <div
      role="status"
      aria-label={ariaDescription}
      title={isLimitActive ? `WIP Limit: ${currentCount} of ${wipLimit} active projects` : `${currentCount} active projects`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-2xs font-mono font-medium transition-colors select-none ${colorClasses} ${className}`}
    >
      <Layers
        size={11}
        className={`shrink-0 ${isAtOrOverLimit ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-8'}`}
        aria-hidden="true"
      />
      <span className="tabular-nums">{label}</span>
      {isAtOrOverLimit && (
        <span
          className="size-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${ariaDescription} Click to manage settings.`}
        className="outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 rounded-xs cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return content;
};
