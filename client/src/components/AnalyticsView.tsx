import React, { useEffect, useState } from 'react';
import type { SummaryStats } from '../types.js';
import * as api from '../api.js';
import { Share2, Flame, Calendar, RotateCcw, GitCommit } from 'lucide-react';

interface AnalyticsViewProps {
  onNavigateShare?: (template?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateShare }) => {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.fetchAnalytics()
      .then((res) => {
        setStats(res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load repository analytics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ width: '240px', height: '28px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ height: '100px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '100px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '100px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '100px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
        </div>
        <div style={{ height: '240px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--heat-cooling)', borderRadius: 'var(--r)', color: 'var(--ink)' }}>
        {error || 'No analytics data available.'}
      </div>
    );
  }

  const weeklyData = stats.weeklyVelocity || [];
  const maxWeeklyCommits = Math.max(...weeklyData.map((w) => w.commits), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
            Portfolio analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
            Unified momentum metrics, 26-week commit output, and repository liveliness.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => onNavigateShare?.('summary')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Share2 size={14} strokeWidth={1.75} />
          Create share card
        </button>
      </div>

      {/* Primary KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Metric 1: Longest Streak */}
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Longest streak
            </span>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onNavigateShare?.('streak')}
              style={{ padding: '2px 6px', fontSize: '11px' }}
            >
              Share
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {stats.longestStreak || 0}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>days</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Current: {stats.currentStreak || 0} continuous days
          </div>
        </div>

        {/* Metric 2: Weekly Output (7d) */}
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Past 7 days
            </span>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onNavigateShare?.('summary')}
              style={{ padding: '2px 6px', fontSize: '11px' }}
            >
              Share
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {stats.totalCommits7d || stats.weeklyCommits || 0}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>commits</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Across {stats.committedReposThisWeek || 0} repositories
          </div>
        </div>

        {/* Metric 3: Most Active Weekday */}
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Peak weekday
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', margin: '4px 0 2px 0' }}>
            {stats.mostActiveWeekday || 'Weekday'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Highest commit frequency
          </div>
        </div>

        {/* Metric 4: Revived Repositories */}
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revived repos
            </span>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onNavigateShare?.('achievements')}
              style={{ padding: '2px 6px', fontSize: '11px' }}
            >
              Share
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {stats.revivedReposCount || 0}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>restored</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Brought back from cooling or stale
          </div>
        </div>
      </div>

      {/* 26-Week Commit Volume Chart (Plain neutral ink bars) */}
      <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
              Weekly commit output (26 weeks)
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              Total commits per 7-day calendar window across all repositories
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigateShare?.('summary')}
            style={{ fontSize: '12px' }}
          >
            <Share2 size={13} strokeWidth={1.75} />
            Share chart
          </button>
        </div>

        {/* Bar Chart Container */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
          {weeklyData.map((w, idx) => {
            const heightPercent = w.commits > 0 ? Math.max(8, (w.commits / maxWeeklyCommits) * 100) : 2;
            const isLast = idx === weeklyData.length - 1;
            return (
              <div
                key={w.weekStart || idx}
                title={`${w.weekLabel}: ${w.commits} commits`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    backgroundColor: isLast ? 'var(--heat-active)' : 'var(--ink)',
                    borderRadius: '2px',
                    opacity: w.commits > 0 ? 0.9 : 0.2,
                    transition: 'height 0.15s ease',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-2)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
          <span>26 weeks ago</span>
          <span>13 weeks ago</span>
          <span>This week</span>
        </div>
      </div>

      {/* Two Columns: Liveliness Breakdown & Language Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Status Distribution */}
        <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Status distribution
            </h2>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onNavigateShare?.('heat_strip')}
              style={{ fontSize: '12px' }}
            >
              Share
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--heat-active)', marginBottom: '4px' }}>
                Active (0-7d)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {stats.activeCount || 0}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--heat-cooling)', marginBottom: '4px' }}>
                Cooling (8-14d)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {stats.coolingCount || 0}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--heat-stale)', marginBottom: '4px' }}>
                Stale (15-30d)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {stats.staleCount || 0}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--heat-dead)', marginBottom: '4px' }}>
                Dead (&gt;30d)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {stats.deadCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Language Distribution */}
        <div style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Language distribution
            </h2>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => onNavigateShare?.('language_mix')}
              style={{ fontSize: '12px' }}
            >
              Share
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(stats.languages || []).slice(0, 5).map((l) => (
              <div key={l.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{l.name}</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {l.percentage}% ({l.count} repos)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(4, l.percentage)}%`, height: '100%', backgroundColor: 'var(--heat-active)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
