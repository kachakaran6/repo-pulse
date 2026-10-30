import React from 'react';
import { Skeleton } from './ui/Skeleton.js';

export const AnalyticsSkeletonV4: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-normal" aria-busy="true" aria-live="polite">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-neutral-4 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Date Range Selector Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-7 w-12" />
      </div>

      {/* 4-Chart Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-neutral-4 rounded-xs p-5 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-32 w-full rounded-xs" />
          </div>
        ))}
      </div>
    </div>
  );
};
