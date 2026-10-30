import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 border border-neutral-6 rounded-md bg-neutral-3 select-none',
        className
      )}
    >
      {icon && (
        <div className="mb-4 size-10 rounded-full border border-neutral-6 bg-neutral-2 flex items-center justify-center text-neutral-9 shadow-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold tracking-tight text-neutral-12 mb-1.5 font-sans">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-neutral-10 max-w-sm mb-6 leading-relaxed font-sans">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
