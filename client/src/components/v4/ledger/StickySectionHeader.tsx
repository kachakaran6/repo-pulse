import React from 'react';
import type { Repository, RepoStatus } from '../../../types.js';
import { ActivitySparkline } from './ActivitySparkline.js';
import { AnimatedNumber } from '../motion/AnimatedNumber.js';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StickySectionHeaderProps {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  repos: Repository[];
  statusColor?: string;
  subtitle?: string;
}

export const StickySectionHeader: React.FC<StickySectionHeaderProps> = ({
  title,
  count,
  isCollapsed,
  onToggleCollapse,
  repos,
  statusColor,
  subtitle,
}) => {
  const aggregatedActivities = repos.map((r) => r.activity);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleCollapse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleCollapse();
        }
      }}
      aria-expanded={!isCollapsed}
      className="sticky top-0 z-10 flex items-center justify-between gap-3 min-h-[44px] px-3 py-2.5 bg-neutral-1/95 backdrop-blur-md border-b border-neutral-4 cursor-pointer select-none hover:bg-neutral-2/60 transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 focus-visible:ring-inset touch-manipulation"
    >
      {/* Left: Chevron, Title, Count, Subtitle */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-neutral-9 transition-transform">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>

        <div className="flex items-center gap-2">
          {statusColor && (
            <span
              className="size-2 rounded-[1px] shrink-0"
              style={{ backgroundColor: statusColor }}
            />
          )}
          <span className="text-xs font-semibold text-neutral-12 font-sans tracking-tight">
            {title}
          </span>
          <span className="font-mono text-xs text-neutral-9 tabular">
            (<AnimatedNumber value={count} />)
          </span>
        </div>

        {subtitle && (
          <span className="text-2xs text-neutral-9 hidden sm:inline font-sans truncate">
            · {subtitle}
          </span>
        )}
      </div>

      {/* Right: Aggregated Activity Sparkline for this section */}
      <div className="flex items-center gap-3 shrink-0">
        <ActivitySparkline
          aggregatedActivities={aggregatedActivities}
          width={100}
          height={14}
          color={statusColor}
        />
      </div>
    </div>
  );
};
