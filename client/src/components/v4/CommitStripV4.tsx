import React, { useMemo } from 'react';
import type { CommitDay, RepoStatus } from '../../types.js';

interface CommitStripV4Props {
  activity: CommitDay[];
  status: RepoStatus;
  daysCount?: number;
  className?: string;
}

export const CommitStripV4: React.FC<CommitStripV4Props> = ({
  activity,
  status,
  daysCount = 90,
  className = '',
}) => {
  const days = useMemo(() => {
    const now = new Date();
    const dayMs = 864e5;
    const activityMap = new Map<string, number>();

    for (const act of activity || []) {
      activityMap.set(act.day, act.commits_mine ?? act.commits ?? 0);
    }

    const result: { dateStr: string; commits: number; isWeekTick: boolean }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const dateStr = d.toISOString().split('T')[0];
      const commits = activityMap.get(dateStr) || 0;
      result.push({
        dateStr,
        commits,
        isWeekTick: i % 7 === 0,
      });
    }
    return result;
  }, [activity, daysCount]);

  const statusColorMap: Record<RepoStatus, string> = {
    active: 'bg-heat-active',
    cooling: 'bg-heat-cooling',
    stale: 'bg-heat-stale',
    dead: 'bg-heat-dead',
  };

  const statusBg = statusColorMap[status] || 'bg-heat-active';

  return (
    <div
      className={`flex items-end gap-[1px] h-8 w-full max-w-[360px] overflow-hidden select-none ${className}`}
      role="img"
      aria-label={`${daysCount}-day commit activity strip (${status})`}
    >
      {days.map((day, idx) => {
        // Bar height: min 3px, scales up to 32px based on commit count
        const heightPx =
          day.commits === 0 ? 3 : Math.min(32, Math.max(4, 3 + day.commits * 4));
        const hasCommits = day.commits > 0;

        return (
          <div
            key={idx}
            title={`${day.dateStr} · ${day.commits} ${
              day.commits === 1 ? 'commit' : 'commits'
            }`}
            className={`flex-1 min-w-[1px] md:min-w-[3px] rounded-[0.5px] transition-all duration-fast ${
              hasCommits
                ? `${statusBg} hover:brightness-110 cursor-pointer`
                : day.isWeekTick
                ? 'bg-neutral-6/80'
                : 'bg-neutral-5/50'
            }`}
            style={{
              height: `${heightPx}px`,
            }}
          />
        );
      })}
    </div>
  );
};
