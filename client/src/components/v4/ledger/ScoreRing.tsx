import React from 'react';
import type { Repository } from '../../../types.js';

interface ScoreRingProps {
  score?: number;
  repo?: Repository;
  size?: number; // default 28
  strokeWidth?: number; // default 2.5
  className?: string;
  showValue?: boolean;
}

export function calculateRepoScore(repo: Repository): number {
  if (!repo.last_commit_at) return 5;
  const time = new Date(repo.last_commit_at).getTime();
  if (isNaN(time)) return 5;

  const days = Math.floor((Date.now() - time) / 864e5);
  let base = 5;

  if (days <= 0) base = 95;
  else if (days <= 7) base = 90 - days * 2;
  else if (days <= 14) base = 76 - (days - 7) * 2.5;
  else if (days <= 30) base = 58 - (days - 14) * 1.5;
  else if (days <= 90) base = 34 - (days - 30) * 0.35;
  else base = Math.max(5, 12 - Math.floor((days - 90) / 30));

  // 30-day commits volume bonus
  const commits30d = (repo.activity || [])
    .slice(-30)
    .reduce((sum, a: any) => sum + (a.commits_mine ?? a.commits ?? 0), 0);
  const bonus = Math.min(8, Math.floor(commits30d / 3));

  return Math.min(100, Math.max(5, Math.round(base + bonus)));
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score: explicitScore,
  repo,
  size = 28,
  strokeWidth = 2.5,
  className = '',
  showValue = true,
}) => {
  const score = explicitScore !== undefined ? explicitScore : repo ? calculateRepoScore(repo) : 50;

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Semantic heat scale for score rings
  const ringColor =
    score >= 75
      ? 'var(--heat-active)'
      : score >= 50
      ? 'var(--heat-cooling)'
      : score >= 25
      ? 'var(--heat-stale)'
      : 'var(--heat-dead)';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title={`Activity Velocity Score: ${score}/100`}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--neutral-4)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-normal"
        />
      </svg>
      {showValue && (
        <span
          className="absolute font-mono text-[9px] font-semibold tabular text-neutral-11"
          style={{ letterSpacing: '-0.05em' }}
        >
          {score}
        </span>
      )}
    </div>
  );
};
