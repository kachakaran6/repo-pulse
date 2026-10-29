import React from 'react';
import type { RepoStatus } from '../types.js';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  RepoStatus,
  { label: string; colorClass: string; cssVar: string }
> = {
  active: { label: 'Active', colorClass: 'bg-heat-active', cssVar: 'var(--heat-active)' },
  cooling: { label: 'Cooling', colorClass: 'bg-heat-cooling', cssVar: 'var(--heat-cooling)' },
  stale: { label: 'Stale', colorClass: 'bg-heat-stale', cssVar: 'var(--heat-stale)' },
  dead: { label: 'Dead', colorClass: 'bg-heat-dead', cssVar: 'var(--heat-dead)' },
};

export interface HeatSegment {
  status: RepoStatus;
  count: number;
}

interface HeatBarProps {
  segments: HeatSegment[];
  total: number;
  selected: 'all' | RepoStatus;
  onSelect: (status: 'all' | RepoStatus) => void;
  className?: string;
}

export const HeatBar: React.FC<HeatBarProps> = ({
  segments,
  total,
  selected,
  onSelect,
  className,
}) => {
  const safeTotal = total > 0 ? total : 1;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className="flex h-3 overflow-hidden rounded-sm bg-muted"
        role="group"
        aria-label="Filter repositories by activity status"
      >
        {segments.map(({ status, count }) => {
          if (count <= 0) return null;
          const meta = STATUS_META[status];
          const isOn = selected === 'all' || selected === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected === status}
              title={`${meta.label}: ${count} repos`}
              className={cn(
                'h-full min-w-[4px] border-0 p-0 transition-opacity',
                meta.colorClass,
                !isOn && 'opacity-35'
              )}
              style={{ width: `${(count / safeTotal) * 100}%` }}
              onClick={() => onSelect(selected === status ? 'all' : status)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {segments.map(({ status, count }) => {
          const meta = STATUS_META[status];
          return (
            <button
              key={`label-${status}`}
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 border-0 bg-transparent p-0',
                selected === status ? 'font-semibold text-foreground' : 'font-normal'
              )}
              onClick={() => onSelect(selected === status ? 'all' : status)}
            >
              <span
                className={cn('size-2 shrink-0 rounded-[1px]', meta.colorClass)}
                aria-hidden
              />
              {meta.label}{' '}
              <span className="tabular font-semibold text-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StatusSwatch: React.FC<{ status: RepoStatus; label?: string }> = ({
  status,
  label,
}) => {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className={cn('size-2.5 shrink-0 rounded-[1px]', meta.colorClass)} aria-hidden />
      {label ?? meta.label}
    </span>
  );
};

export { STATUS_META };
