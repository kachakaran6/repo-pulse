import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'neutral'
  | 'outline'
  | 'keep'
  | 'pause'
  | 'retire'
  | 'active'
  | 'cooling'
  | 'stale'
  | 'dead';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  showDot = false,
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, { container: string; dot: string }> = {
    neutral: {
      container: 'bg-neutral-4 text-neutral-11 border-neutral-6',
      dot: 'bg-neutral-9',
    },
    outline: {
      container: 'bg-transparent text-neutral-10 border-neutral-6',
      dot: 'bg-neutral-8',
    },
    keep: {
      container: 'bg-verdict-keep-bg text-verdict-keep-text border-verdict-keep-border font-semibold',
      dot: 'bg-verdict-keep-base',
    },
    pause: {
      container: 'bg-verdict-pause-bg text-verdict-pause-text border-verdict-pause-border font-semibold',
      dot: 'bg-verdict-pause-base',
    },
    retire: {
      container: 'bg-verdict-retire-bg text-verdict-retire-text border-verdict-retire-border font-semibold',
      dot: 'bg-verdict-retire-base',
    },
    active: {
      container: 'bg-neutral-3 text-neutral-12 border-neutral-6',
      dot: 'bg-activity-5',
    },
    cooling: {
      container: 'bg-neutral-3 text-neutral-12 border-neutral-6',
      dot: 'bg-activity-3',
    },
    stale: {
      container: 'bg-neutral-3 text-neutral-12 border-neutral-6',
      dot: 'bg-activity-2',
    },
    dead: {
      container: 'bg-neutral-3 text-neutral-10 border-neutral-6',
      dot: 'bg-activity-1',
    },
  };

  const style = variants[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-mono rounded-xs border select-none tracking-tight',
        style.container,
        className
      )}
      {...props}
    >
      {showDot && <span className={cn('size-1.5 rounded-full shrink-0', style.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
};
