import React, { useEffect, useState } from 'react';
import type { AnalyticsData } from '../types.js';
import * as api from '../api.js';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.fetchAnalytics()
      .then((res) => {
        setData(res);
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
      <div>
        <div style={{ width: '100%', height: '36px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ height: '90px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '90px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '90px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
          <div style={{ height: '90px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)', color: 'var(--heat-active)' }}>
        {error || 'No analytics data available.'}
      </div>
    );
  }

  const maxDaily = Math.max(...data.daily_trend.map((d) => d.commits), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Portfolio Analytics & Pulse
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          Aggregated commit velocity, portfolio temperature distribution, and language metrics across all {data.total_repos} repositories.
        </p>
      </div>

      {/* Hero Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Health Score */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Pulse Health Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--mono)', color: data.health_score > 70 ? 'var(--heat-active)' : 'var(--heat-cooling)' }}>
              {data.health_score}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--ink-2)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            {data.health_score >= 80 ? 'High momentum' : data.health_score >= 50 ? 'Balanced maintenance' : 'Many cold projects'}
          </div>
        </div>

        {/* Card 2: 7-Day Velocity */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Weekly Velocity (7 Days)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--mono)' }}>
              {data.commits.past_7_days}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--ink-2)' }}>commits</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            ~{data.commits.weekly_average} commits/week 90d avg
          </div>
        </div>

        {/* Card 3: 30-Day Velocity */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Monthly Output (30 Days)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--mono)' }}>
              {data.commits.past_30_days}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--ink-2)' }}>commits</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Across {data.heat_distribution.active + data.heat_distribution.cooling} active repositories
          </div>
        </div>

        {/* Card 4: Total Repositories */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Total Repositories
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--mono)' }}>
              {data.total_repos}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              ({data.public_count} public, {data.private_count} private)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            {data.archived_count} archived on GitHub
          </div>
        </div>
      </div>

      {/* Global 90-Day Commit Timeline Bar */}
      <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>90-Day Global Activity Timeline</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              Total of {data.commits.past_90_days} commits across all repositories combined
            </div>
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
            Daily Commits
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
          {data.daily_trend.map((d, i) => {
            const heightPercent = d.commits > 0 ? Math.max(8, (d.commits / maxDaily) * 100) : 4;
            const isToday = i === data.daily_trend.length - 1;
            return (
              <div
                key={d.day}
                title={`${d.day}: ${d.commits} commits`}
                style={{
                  flex: 1,
                  height: `${heightPercent}%`,
                  backgroundColor: d.commits > 0 ? (isToday ? 'var(--heat-active)' : 'var(--ink)') : 'var(--surface-2)',
                  borderRadius: '1px',
                  opacity: d.commits > 0 ? 1 : 0.4,
                  transition: 'height 0.2s ease',
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-2)', marginTop: '8px', fontFamily: 'var(--mono)' }}>
          <span>90 days ago</span>
          <span>45 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Two-Column Analytics: Languages & Movers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left: Languages Breakdown */}
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Languages Distribution</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '16px' }}>
            Primary programming language by repository count
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.languages.slice(0, 8).map((l) => (
              <div key={l.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{l.name}</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    {l.count} {l.count === 1 ? 'repo' : 'repos'} ({l.percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(4, l.percentage)}%`, height: '100%', backgroundColor: 'var(--heat-active)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Portfolio Temperature & Key Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Temperature distribution */}
          <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Temperature Distribution</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '16px' }}>
              How repos map across your activity thresholds
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '12px', color: 'var(--heat-active)', fontWeight: 600 }}>Active (0-7d)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{data.heat_distribution.active}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '12px', color: 'var(--heat-cooling)', fontWeight: 600 }}>Cooling (8-14d)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{data.heat_distribution.cooling}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '12px', color: 'var(--heat-stale)', fontWeight: 600 }}>Stale (15-30d)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{data.heat_distribution.stale}</div>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '12px', color: 'var(--heat-dead)', fontWeight: 600 }}>Dead (&gt;30d)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{data.heat_distribution.dead}</div>
              </div>
            </div>
          </div>

          {/* Key Repository Highlights */}
          <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Project Highlights</div>

            {data.most_active_repo && (
              <div style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', color: 'var(--heat-active)', fontWeight: 600 }}>
                  Most active project
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--mono)', marginTop: '2px' }}>
                  {data.most_active_repo.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                  {data.most_active_repo.commits_90d} commits in past 90 days, {data.most_active_repo.language || 'Code'}
                </div>
              </div>
            )}

            {data.oldest_dormant_repo && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--heat-dead)', fontWeight: 600 }}>
                  Longest neglected project
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--mono)', marginTop: '2px' }}>
                  {data.oldest_dormant_repo.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                  Last committed {data.oldest_dormant_repo.days_inactive} days ago
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
