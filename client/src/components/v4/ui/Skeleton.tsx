import React from 'react';
import { cn } from '@/lib/utils';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xs bg-neutral-4 select-none',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonRow: React.FC = () => {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 border-b border-neutral-6 bg-neutral-3">
      <div className="flex items-center gap-3 w-1/3">
        <Skeleton className="size-3.5 rounded-xs" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex items-center gap-2 w-1/4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="w-1/3 flex justify-end">
        <Skeleton className="h-7 w-48 rounded-xs" />
      </div>
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-5 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="size-6 rounded-full" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-10 w-full rounded-sm" />
    </div>
  );
};
