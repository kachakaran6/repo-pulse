import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';

export interface WipLoweredBannerProps {
  currentCount: number;
  wipLimit: number;
  onOpenSettings?: () => void;
  className?: string;
}

/**
 * A gentle, non-judgmental banner shown when the user's limit is lowered
 * below their current number of active repositories.
 * Does not auto-change anything.
 */
export const WipLoweredBanner: React.FC<WipLoweredBannerProps> = ({
  currentCount,
  wipLimit,
  onOpenSettings,
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || currentCount <= wipLimit) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs text-neutral-11 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-6 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
          <Layers size={13} aria-hidden="true" />
        </div>
        <div className="min-w-0 leading-relaxed">
          <span className="text-neutral-12 font-medium">
            You have {currentCount} active projects, above your limit of {wipLimit}.
          </span>{' '}
          <span className="text-neutral-9">
            Take your time—no changes will be made automatically. Pause projects whenever you are ready.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs text-neutral-11 hover:text-neutral-12 font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            Adjust limit
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="p-1 text-neutral-8 hover:text-neutral-12 rounded-xs transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
