import React, { useMemo } from 'react';
import type { CommitDay, RepoStatus } from '../../../types.js';

interface ActivitySparklineProps {
  activity?: CommitDay[];
  aggregatedActivities?: CommitDay[][];
  daysCount?: number;
  width?: number | string;
  height?: number;
  status?: RepoStatus;
  className?: string;
  color?: string;
}

export const ActivitySparkline: React.FC<ActivitySparklineProps> = ({
  activity,
  aggregatedActivities,
  daysCount = 60,
  width = 120,
  height = 16,
  status = 'active',
  className = '',
  color,
}) => {
  const bars = useMemo(() => {
    const dayMap = new Map<string, number>();
    const now = new Date();
    const dayMs = 864e5;

    if (aggregatedActivities && aggregatedActivities.length > 0) {
      for (const list of aggregatedActivities) {
        for (const act of list || []) {
          const current = dayMap.get(act.day) || 0;
          dayMap.set(act.day, current + (act.commits_mine ?? act.commits ?? 0));
        }
      }
    } else if (activity) {
      for (const act of activity) {
        dayMap.set(act.day, act.commits_mine ?? act.commits ?? 0);
      }
    }

    const result: number[] = [];
    let max = 1;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const dayStr = d.toISOString().split('T')[0];
      const count = dayMap.get(dayStr) || 0;
      if (count > max) max = count;
      result.push(count);
    }

    return { counts: result, max };
  }, [activity, aggregatedActivities, daysCount]);

  const defaultColor =
    color ||
    (status === 'active'
      ? 'var(--heat-active)'
      : status === 'cooling'
      ? 'var(--heat-cooling)'
      : status === 'stale'
      ? 'var(--heat-stale)'
      : 'var(--heat-dead)');

  const totalPoints = bars.counts.length;
  if (totalPoints === 0) return null;

  return (
    <div
      className={`inline-flex items-end gap-[1px] select-none ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
      }}
      title="Recent activity sparkline"
      aria-hidden="true"
    >
      {bars.counts.map((count, idx) => {
        const heightPct = count === 0 ? 12 : Math.min(100, Math.max(20, (count / bars.max) * 100));
        const hasCommits = count > 0;

        return (
          <div
            key={idx}
            className="flex-1 rounded-[0.5px] transition-all"
            style={{
              height: `${heightPct}%`,
              backgroundColor: hasCommits ? defaultColor : 'var(--neutral-4)',
              opacity: hasCommits ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
};
