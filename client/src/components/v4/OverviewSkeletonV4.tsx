import React from 'react';
import { Skeleton } from './ui/Skeleton.js';

interface OverviewSkeletonV4Props {
  message?: string;
}

export const OverviewSkeletonV4: React.FC<OverviewSkeletonV4Props> = ({
  message = 'Synchronizing repository history from GitHub...',
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-normal" aria-busy="true" aria-live="polite">
      {/* Top Headline & Sync Banner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-9">
          <span className="size-2 rounded-full bg-heat-cooling animate-pulse" />
          <span>{message}</span>
        </div>
        <Skeleton className="h-9 w-3/4 max-w-xl" />
      </div>

      {/* Segmented Heat Bar Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-full rounded-xs" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Search & Filter Header Skeleton */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-9 w-32 hidden sm:block" />
      </div>

      {/* Hairline-Separated Ledger Groups Skeleton */}
      <div className="space-y-8">
        {[1, 2, 3].map((g) => (
          <div key={g} className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-neutral-4">
              <div className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-xs" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-36 hidden md:block" />
            </div>

            <div className="divide-y divide-neutral-4">
              {[1, 2, 3, 4].map((r) => (
                <div key={r} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-full sm:w-[360px] rounded-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
