import React from 'react';
import type { CommitDay, RepoStatus } from '../types.js';

interface CommitStripProps {
  activity: CommitDay[];
  status: RepoStatus;
  daysCount?: number; // 30 or 90
}

export const CommitStrip: React.FC<CommitStripProps> = ({
  activity,
  status,
  daysCount = 30,
}) => {
  const now = new Date();
  const dayMs = 864e5;

  // Build full day bucket array for the requested range (e.g. 30 days)
  const activityMap = new Map<string, number>();
  for (const act of activity) {
    activityMap.set(act.day, act.commits);
  }

  const days: { dateStr: string; commits: number; isRecent: boolean }[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const dateStr = d.toISOString().split('T')[0];
    const commits = activityMap.get(dateStr) || 0;
    days.push({
      dateStr,
      commits,
      isRecent: i <= 7,
    });
  }

  return (
    <div className="strip-container" title={`${daysCount}-day commit activity`}>
      {days.map((day, idx) => {
        let barStatus = 'dead';
        if (day.commits > 0) {
          barStatus = status;
        }

        // Height scales with commit count (min 3px, max 20px)
        const heightPx = day.commits === 0 ? 3 : Math.min(20, 4 + day.commits * 3);

        return (
          <div
            key={idx}
            className={`strip-bar ${day.commits > 0 ? barStatus : ''}`}
            style={{ height: `${heightPx}px` }}
            title={`${day.dateStr}: ${day.commits} commit${day.commits === 1 ? '' : 's'}`}
          />
        );
      })}
    </div>
  );
};
