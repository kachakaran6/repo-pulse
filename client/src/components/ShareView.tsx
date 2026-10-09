import React, { useState, useEffect } from 'react';
import type { Repository, UserProfile, SummaryStats } from '../types.js';
import * as api from '../api.js';
import {
  Share2,
  Copy,
  Download,
  Trash2,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Sparkles,
  Calendar,
  Flame,
  GitCommit,
  CheckCircle2,
  GitFork,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface ShareViewProps {
  user: UserProfile;
  repos: Repository[];
  stats: SummaryStats | null;
  summarySentence: string;
}

export const ShareView: React.FC<ShareViewProps> = ({
  user,
  repos,
  stats,
  summarySentence,
}) => {
  // Config state
  const [template, setTemplate] = useState<
    'summary' | 'streak' | 'heat_strip' | 'language_mix' | 'achievements' | 'triage_progress'
  >('summary');
  const [size, setSize] = useState<'1200x630' | '1080x1080' | '1080x1350' | '1080x1920'>('1200x630');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [theme, setTheme] = useState<'light' | 'dark' | 'heat-accent'>('dark');
  const [title, setTitle] = useState(`${user.login}'s RepoPulse`);
  const [subtitle, setSubtitle] = useState(summarySentence || 'Active repository health and velocity');
  const [showAvatar, setShowAvatar] = useState(true);
  const [showHandle, setShowHandle] = useState(true);
  const [watermark, setWatermark] = useState(true);
  const [hidePrivateNames, setHidePrivateNames] = useState(true);
  const [hideAllRepoNames, setHideAllRepoNames] = useState(false);

  // Safety confirm dialog for private name reveal
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false);

  // Snapshots list & active snapshot
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Load saved snapshots
  useEffect(() => {
    api.fetchSnapshots().then(setSnapshots).catch(() => {});
  }, []);

  const handleTogglePrivateNames = () => {
    if (hidePrivateNames) {
      // Trying to unhide private names: show confirmation modal
      setShowPrivacyConfirm(true);
    } else {
      setHidePrivateNames(true);
    }
  };

  const handleConfirmUnhide = () => {
    setHidePrivateNames(false);
    setShowPrivacyConfirm(false);
  };

  const handleCreateSnapshot = async () => {
    setIsSaving(true);
    try {
      const res = await api.createSnapshot({
        template,
        size,
        period,
        theme,
        title,
        subtitle,
        showAvatar,
        showHandle,
        watermark,
        hidePrivateNames,
        hideAllRepoNames,
      });
      setCreatedSlug(res.slug);
      const updated = await api.fetchSnapshots();
      setSnapshots(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to generate card snapshot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSnapshot = async (slug: string) => {
    if (!confirm('Are you sure you want to revoke this share card? Any public links will immediately 404.')) {
      return;
    }
    try {
      await api.revokeSnapshot(slug);
      setSnapshots(snapshots.filter((s) => s.slug !== slug));
      if (createdSlug === slug) setCreatedSlug(null);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke card');
    }
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopyStatus('Link copied');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const shareToX = (slug: string) => {
    const url = encodeURIComponent(`${window.location.origin}/s/${slug}`);
    const text = encodeURIComponent(`Tracked my active repository health with RepoPulse:\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToLinkedIn = (slug: string) => {
    const url = encodeURIComponent(`${window.location.origin}/s/${slug}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  // Compute live SVG markup for preview
  const previewSnapshot = {
    config: {
      template,
      size,
      theme,
      title,
      subtitle,
      watermark,
    },
    data: {
      user: {
        login: showHandle ? user.login : undefined,
        avatar_url: showAvatar ? user.avatar_url : undefined,
      },
      stats: {
        totalRepos: stats?.totalRepos || repos.length,
        activeCount: stats?.activeCount || 0,
        coolingCount: stats?.coolingCount || 0,
        staleCount: stats?.staleCount || 0,
        deadCount: stats?.deadCount || 0,
        weeklyCommits: stats?.weeklyCommits || 0,
        totalCommits7d: stats?.totalCommits7d || 0,
        totalCommits30d: stats?.totalCommits30d || 0,
        totalCommits90d: stats?.totalCommits90d || 0,
        longestStreak: stats?.longestStreak || 0,
        currentStreak: stats?.currentStreak || 0,
        mostActiveWeekday: stats?.mostActiveWeekday || 'Monday',
        summarySentence: subtitle,
        languages: stats?.languages || [],
      },
      achievements: [
        { name: '7-Day Momentum', description: 'Maintained a 7-day daily commit streak', earned: true },
        { name: 'Century Velocity', description: 'Authored 100+ commits in the last 30 days', earned: true },
        { name: 'Inbox Zero', description: 'Decided on every cooling and stale repository', earned: true },
      ],
      repos: repos.slice(0, 6).map((r) => ({
        name: hideAllRepoNames ? 'Repository' : (hidePrivateNames && r.is_private ? 'Private repo' : r.full_name),
        status: r.status || 'active',
        language: r.language,
        commits_30d: (r.activity || []).slice(-30).reduce((s, a) => s + (a.commits_mine || a.commits || 0), 0),
      })),
    },
  };

  const isDark = theme === 'dark' || theme === 'heat-accent';
  const bgColor = isDark ? 'var(--bg)' : '#F2F3F1';
  const surfaceColor = isDark ? 'var(--surface)' : '#FFFFFF';
  const textColor = isDark ? 'var(--ink)' : '#14181B';
  const subtextColor = isDark ? 'var(--ink-2)' : '#4B545B';
  const borderColor = isDark ? 'var(--line)' : '#DADDDA';

  return (
    <div className="share-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
            Share cards
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
            Generate high-resolution SVG and PNG momentum cards for your repositories and streaks.
          </p>
        </div>
      </div>

      {/* Editor Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Controls Column */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Template Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="summary">Summary stats</option>
              <option value="streak">Streak & velocity</option>
              <option value="heat_strip">Repository heat ledger</option>
              <option value="language_mix">Language distribution</option>
              <option value="achievements">Milestones & achievements</option>
              <option value="triage_progress">Triage progress</option>
            </select>
          </div>

          {/* Sizing */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aspect ratio
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: '1200 × 630 (Link)', val: '1200x630' },
                { label: '1080 × 1080 (Square)', val: '1080x1080' },
                { label: '1080 × 1350 (Portrait)', val: '1080x1350' },
                { label: '1080 × 1920 (Story)', val: '1080x1920' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setSize(s.val as any)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: 'var(--r)',
                    border: '1px solid',
                    borderColor: size === s.val ? 'var(--ink)' : 'var(--line)',
                    backgroundColor: size === s.val ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme & Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="filter-select"
                style={{ width: '100%' }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="heat-accent">Heat accent</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="filter-select"
                style={{ width: '100%' }}
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="year">Past year</option>
              </select>
            </div>
          </div>

          {/* Custom Titles */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Headline
            </label>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Subtitle text
            </label>
            <input
              type="text"
              value={subtitle}
              maxLength={80}
              onChange={(e) => setSubtitle(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Privacy & Visibility Options */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Privacy & attribution
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hidePrivateNames}
                  onChange={handleTogglePrivateNames}
                />
                Hide private repository names
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hideAllRepoNames}
                  onChange={(e) => setHideAllRepoNames(e.target.checked)}
                />
                Anonymize all repository names
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                />
                Include watermark
              </label>
            </div>
          </div>

          {/* Save & Generate Action */}
          <button
            id="create-card-btn"
            type="button"
            className="btn-primary"
            onClick={handleCreateSnapshot}
            disabled={isSaving}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
          >
            {isSaving ? 'Creating snapshot...' : 'Generate public share card'}
          </button>
        </div>

        {/* Live Preview Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: surfaceColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--r)',
              padding: '32px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: textColor, margin: 0 }}>
                  {title}
                </h2>
                {showAvatar && (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    style={{ width: '40px', height: '40px', borderRadius: 'var(--r)', border: `1px solid ${borderColor}` }}
                  />
                )}
              </div>
              <p style={{ fontSize: '14px', color: subtextColor, margin: 0 }}>
                {subtitle}
              </p>
            </div>

            {/* Template-specific Body */}
            <div style={{ margin: '32px 0' }}>
              {template === 'summary' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.totalCommits30d || stats?.weeklyCommits || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Commits (30d)</div>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.activeCount || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Active repos</div>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.longestStreak || 0}d
                    </div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Longest streak</div>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.totalRepos || repos.length}
                    </div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Total repos</div>
                  </div>
                </div>
              )}

              {template === 'streak' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.longestStreak || 0}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: subtextColor, marginTop: '4px' }}>DAYS CONTINUOUS STREAK</div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Current: {stats?.currentStreak || 0} consecutive days</div>
                  </div>

                  <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>
                      {stats?.totalCommits30d || 0}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: subtextColor, marginTop: '4px' }}>30-DAY COMMIT VELOCITY</div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Peak day: {stats?.mostActiveWeekday || 'Monday'}</div>
                  </div>
                </div>
              )}

              {template === 'heat_strip' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {repos.slice(0, 5).map((r) => {
                    const displayName = hideAllRepoNames ? 'Repository' : (hidePrivateNames && r.is_private ? 'Private repo' : r.full_name);
                    const statusColor = r.status === 'active' ? 'var(--heat-active)' : r.status === 'cooling' ? 'var(--heat-cooling)' : r.status === 'stale' ? 'var(--heat-stale)' : 'var(--heat-dead)';
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: bgColor, borderRadius: 'var(--r)', border: `1px solid ${borderColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: textColor }}>{displayName}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: subtextColor }}>{r.language || 'Plain Text'}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {template === 'language_mix' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(stats?.languages || []).slice(0, 4).map((l) => (
                    <div key={l.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: textColor }}>{l.name}</span>
                        <span style={{ color: subtextColor }}>{l.percentage}% ({l.count} repos)</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: borderColor, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${l.percentage}%`, height: '100%', backgroundColor: 'var(--heat-active)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {template === 'achievements' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Flame size={24} color="var(--heat-active)" strokeWidth={1.75} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>7-Day Momentum</div>
                      <div style={{ fontSize: '12px', color: subtextColor }}>Maintained 7 consecutive commit days</div>
                    </div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <GitCommit size={24} color="var(--heat-active)" strokeWidth={1.75} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>Century Velocity</div>
                      <div style={{ fontSize: '12px', color: subtextColor }}>Authored 100+ commits in 30 days</div>
                    </div>
                  </div>
                </div>
              )}

              {template === 'triage_progress' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: subtextColor, marginBottom: '8px' }}>ACTIVE RETENTION</div>
                    <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>{stats?.activeCount || 0}</div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Active repositories kept alive</div>
                  </div>
                  <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: subtextColor, marginBottom: '8px' }}>TRIAGE INBOX</div>
                    <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: textColor }}>{(stats?.coolingCount || 0) + (stats?.staleCount || 0)}</div>
                    <div style={{ fontSize: '12px', color: subtextColor, marginTop: '4px' }}>Decisions pending</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '16px' }}>
              <span style={{ fontSize: '12px', color: subtextColor }}>
                Generated from verified GitHub commit timestamps
              </span>
              {watermark && (
                <span style={{ fontSize: '12px', color: subtextColor, fontWeight: 500 }}>
                  Made with RepoPulse
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions for active snapshot */}
          {createdSlug && (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Snapshot live: </span>
                <a
                  href={`/s/${createdSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: 'var(--heat-stale)', textDecoration: 'none' }}
                >
                  /s/{createdSlug}
                </a>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copyPublicLink(createdSlug)}
                >
                  <Copy size={14} strokeWidth={1.75} />
                  {copyStatus || 'Copy link'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => shareToX(createdSlug)}
                >
                  Share to X
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => shareToLinkedIn(createdSlug)}
                >
                  LinkedIn
                </button>
                <a
                  href={`/s/${createdSlug}/og.png`}
                  download={`repopulse-${createdSlug}.svg`}
                  className="btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} strokeWidth={1.75} />
                  SVG
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing Snapshots Ledger */}
      {snapshots.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            My cards
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {snapshots.map((s) => (
              <div
                key={s.id || s.slug}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {s.title || 'RepoPulse Card'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                    Template: {s.template} · Created: {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={`/s/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-quiet"
                    style={{ fontSize: '12px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} strokeWidth={1.75} />
                    View
                  </a>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => copyPublicLink(s.slug)}
                    style={{ fontSize: '12px' }}
                  >
                    <Copy size={14} strokeWidth={1.75} />
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => handleRevokeSnapshot(s.slug)}
                    style={{ fontSize: '12px', color: 'var(--heat-active)' }}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Confirmation Modal */}
      {showPrivacyConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--heat-cooling)" strokeWidth={1.75} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Reveal private repository names?
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
              Share cards are publicly accessible to anyone who has the link. Revealing private repository names will include them on the card image and public web page.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPrivacyConfirm(false)}
              >
                Keep private
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmUnhide}
              >
                Reveal names
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
