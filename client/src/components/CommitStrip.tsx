import React from 'react';
import type { CommitDay, RepoStatus } from '../types.js';

interface CommitStripProps {
  activity: CommitDay[];
  status: RepoStatus;
  daysCount?: number; // default 90
}

export const CommitStrip: React.FC<CommitStripProps> = ({
  activity,
  status,
  daysCount = 90,
}) => {
  const now = new Date();
  const dayMs = 864e5;

  const activityMap = new Map<string, number>();
  for (const act of activity) {
    activityMap.set(act.day, act.commits);
  }

  const days: { dateStr: string; commits: number; isWeekTick: boolean }[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = d.toISOString().split('T')[0];
    const commits = activityMap.get(dateStr) || 0;
    days.push({
      dateStr,
      commits,
      isWeekTick: i % 7 === 0,
    });
  }

  const statusColorMap: Record<RepoStatus, string> = {
    active: 'var(--heat-active)',
    cooling: 'var(--heat-cooling)',
    stale: 'var(--heat-stale)',
    dead: 'var(--heat-dead)',
  };

  const statusColor = statusColorMap[status] || 'var(--heat-active)';

  return (
    <div
      className="strip-90"
      title={`${daysCount}-day commit activity`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '1px',
        width: '100%',
        height: '28px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {days.map((day, idx) => {
        const heightPx = day.commits === 0 ? 3 : Math.min(28, 4 + day.commits * 4);
        const bg = day.commits > 0 ? statusColor : 'var(--line)';

        return (
          <div
            key={idx}
            className={`strip-bar-90 ${day.commits > 0 ? status : ''} ${day.isWeekTick ? 'week-tick' : ''}`}
            style={{
              flex: '1 1 0px',
              minWidth: '1px',
              height: `${heightPx}px`,
              backgroundColor: bg,
              borderRadius: '1px',
              opacity: day.commits === 0 ? 0.6 : 1,
              boxSizing: 'border-box',
            }}
            title={`${day.dateStr}: ${day.commits} commit${day.commits === 1 ? '' : 's'}`}
          />
        );
      })}
    </div>
  );
};

