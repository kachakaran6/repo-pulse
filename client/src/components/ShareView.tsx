import React, { useState, useEffect, useMemo } from 'react';
import type { Repository, UserProfile, SummaryStats } from '../types.js';
import * as api from '../api.js';
import {
  Share2,
  Copy,
  Download,
  Trash2,
  ExternalLink,
  Lock,
  Check,
  RotateCcw,
  Sparkles,
  Flame,
  GitCommit,
  Layers,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
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
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load saved snapshots
  useEffect(() => {
    api.fetchSnapshots().then(setSnapshots).catch(() => {});
  }, []);

  // Update default subtitle when summarySentence or period changes
  useEffect(() => {
    if (summarySentence && !subtitle) {
      setSubtitle(summarySentence);
    }
  }, [summarySentence]);

  // Compute robust derived statistics from repository array as guaranteed fallback
  const computedStats = useMemo(() => {
    const totalRepos = stats?.totalRepos ?? repos.length;
    const activeCount = stats?.activeCount ?? repos.filter((r) => r.status === 'active').length;
    const coolingCount = stats?.coolingCount ?? repos.filter((r) => r.status === 'cooling').length;
    const staleCount = stats?.staleCount ?? repos.filter((r) => r.status === 'stale').length;
    const deadCount = stats?.deadCount ?? repos.filter((r) => r.status === 'dead').length;

    // Sum commits across repositories
    let totalCommits7d = stats?.totalCommits7d ?? 0;
    let totalCommits30d = stats?.totalCommits30d ?? 0;
    let totalCommits90d = stats?.totalCommits90d ?? 0;

    if (!stats?.totalCommits30d && repos.length > 0) {
      for (const r of repos) {
        const acts = r.activity || [];
        totalCommits7d += acts.slice(-7).reduce((s, a) => s + (a.commits_mine ?? a.commits ?? 0), 0);
        totalCommits30d += acts.slice(-30).reduce((s, a) => s + (a.commits_mine ?? a.commits ?? 0), 0);
        totalCommits90d += acts.slice(-90).reduce((s, a) => s + (a.commits_mine ?? a.commits ?? 0), 0);
      }
    }

    // Longest streak calculation
    let longestStreak = stats?.longestStreak ?? 0;
    let currentStreak = stats?.currentStreak ?? 0;
    if (longestStreak === 0 && repos.length > 0) {
      const dailyMap: Record<string, number> = {};
      for (const r of repos) {
        for (const a of r.activity || []) {
          dailyMap[a.day] = (dailyMap[a.day] || 0) + (a.commits_mine ?? a.commits ?? 0);
        }
      }
      const days = Object.keys(dailyMap).sort();
      let cur = 0;
      let maxS = 0;
      for (const d of days) {
        if (dailyMap[d] > 0) {
          cur++;
          if (cur > maxS) maxS = cur;
        } else {
          cur = 0;
        }
      }
      longestStreak = maxS || 1;
      currentStreak = cur;
    }

    // Language mix
    let languages = stats?.languages || [];
    if (languages.length === 0 && repos.length > 0) {
      const langMap: Record<string, number> = {};
      for (const r of repos) {
        if (r.language) {
          langMap[r.language] = (langMap[r.language] || 0) + 1;
        }
      }
      const totalNamed = Object.values(langMap).reduce((a, b) => a + b, 0) || 1;
      languages = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalNamed) * 100),
        }));
    }

    // Period commits
    let periodCommits = totalCommits30d || stats?.weeklyCommits || 0;
    let periodLabel = 'Commits (30d)';
    if (period === '7d') {
      periodCommits = totalCommits7d || stats?.weeklyCommits || 0;
      periodLabel = 'Commits (7d)';
    } else if (period === '90d') {
      periodCommits = totalCommits90d || totalCommits30d || 0;
      periodLabel = 'Commits (90d)';
    } else if (period === 'year') {
      periodCommits = Math.round((totalCommits90d || totalCommits30d || 0) * (365 / 90));
      periodLabel = 'Estimated commits (year)';
    }

    return {
      totalRepos,
      activeCount,
      coolingCount,
      staleCount,
      deadCount,
      totalCommits7d,
      totalCommits30d,
      totalCommits90d,
      periodCommits,
      periodLabel,
      longestStreak,
      currentStreak,
      mostActiveWeekday: stats?.mostActiveWeekday || 'Monday',
      languages,
      summarySentence: subtitle || summarySentence || 'Active repository health and velocity',
    };
  }, [repos, stats, period, subtitle, summarySentence]);

  // Sanitized repositories for display
  const sanitizedRepos = useMemo(() => {
    return repos.slice(0, 8).map((r) => {
      let displayName = r.full_name;
      if (hideAllRepoNames) {
        displayName = 'Repository';
      } else if (hidePrivateNames && r.is_private) {
        displayName = 'Private repo';
      }

      const commits30d = (r.activity || [])
        .slice(-30)
        .reduce((sum, a) => sum + (a.commits_mine ?? a.commits ?? 0), 0);

      return {
        id: r.id,
        name: displayName,
        rawName: r.full_name,
        is_private: r.is_private,
        status: r.status || 'active',
        language: r.language || 'Plain Text',
        commits: commits30d,
      };
    });
  }, [repos, hideAllRepoNames, hidePrivateNames]);

  const handleTogglePrivateNames = () => {
    if (hidePrivateNames) {
      setShowPrivacyConfirm(true);
    } else {
      setHidePrivateNames(true);
    }
  };

  const handleConfirmUnhide = () => {
    setHidePrivateNames(false);
    setShowPrivacyConfirm(false);
  };

  const handleResetDefaults = () => {
    setTitle(`${user.login}'s RepoPulse`);
    setSubtitle(summarySentence || 'Active repository health and velocity');
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
      setActionFeedback('Share card snapshot created!');
      setTimeout(() => setActionFeedback(null), 4000);
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
    const text = encodeURIComponent(`Tracked my active repository momentum with RepoPulse:\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToLinkedIn = (slug: string) => {
    const url = encodeURIComponent(`${window.location.origin}/s/${slug}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  // XML string escaper helper
  const escapeXml = (unsafe: string): string => {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Direct vector SVG generator for local client downloads
  const generateClientSvg = () => {
    const [wStr, hStr] = size.split('x');
    const width = parseInt(wStr, 10) || 1200;
    const height = parseInt(hStr, 10) || 630;

    const isDark = theme === 'dark' || theme === 'heat-accent';
    const isHeatAccent = theme === 'heat-accent';
    const bgColor = isDark ? '#131413' : '#F2F3F1';
    const surfaceColor = isDark ? '#1C1D1B' : '#FFFFFF';
    const textColor = isDark ? '#EDEEEA' : '#14181B';
    const subtextColor = isDark ? '#A2A8A4' : '#4B545B';
    const borderColor = isHeatAccent ? '#F2664F' : (isDark ? '#2E302D' : '#DADDDA');
    const accentColor = isHeatAccent ? '#F2664F' : '#D2382A';

    const pad = 40;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const contentX = pad + 44;
    const contentW = innerW - 88;

    const safeTitle = escapeXml(title);
    const safeSubtitle = escapeXml(subtitle);

    let bodySvg = '';

    if (template === 'summary') {
      const colCount = contentW > 800 ? 4 : 2;
      const colGap = 16;
      const colW = (contentW - (colCount - 1) * colGap) / colCount;

      const items = [
        { val: `${computedStats.periodCommits}`, label: computedStats.periodLabel },
        { val: `${computedStats.activeCount}`, label: 'Active Repositories' },
        { val: `${computedStats.longestStreak}d`, label: 'Longest Streak' },
        { val: `${computedStats.totalRepos}`, label: 'Total Repositories' },
      ];

      const boxes = items.map((item, idx) => {
        const col = idx % colCount;
        const row = Math.floor(idx / colCount);
        const x = col * (colW + colGap);
        const y = row * 120;
        return `
          <rect x="${x}" y="${y}" width="${colW}" height="100" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="${x + 20}" y="${y + 48}" class="stat-val">${escapeXml(item.val)}</text>
          <text x="${x + 20}" y="${y + 78}" class="stat-label">${escapeXml(item.label)}</text>
        `;
      }).join('');

      const barY = Math.ceil(items.length / colCount) * 120 + 24;

      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          ${boxes}
          <g transform="translate(0, ${barY})">
            <text x="0" y="-12" class="section-label">LIVELINESS DISTRIBUTION</text>
            <rect x="0" y="0" width="${contentW}" height="16" rx="4" fill="${borderColor}" />
            <rect x="0" y="0" width="${Math.max(4, (computedStats.activeCount / Math.max(1, computedStats.totalRepos)) * contentW)}" height="16" rx="4" fill="#D2382A" />
          </g>
          <g transform="translate(0, ${barY + 45})">
            <rect x="0" y="0" width="12" height="12" rx="2" fill="#D2382A" />
            <text x="20" y="10" class="legend-text">Active (${computedStats.activeCount})</text>
            <rect x="140" y="0" width="12" height="12" rx="2" fill="#E88C38" />
            <text x="160" y="10" class="legend-text">Cooling (${computedStats.coolingCount})</text>
            <rect x="280" y="0" width="12" height="12" rx="2" fill="#86AED0" />
            <text x="300" y="10" class="legend-text">Stale (${computedStats.staleCount})</text>
            <rect x="420" y="0" width="12" height="12" rx="2" fill="#757D84" />
            <text x="440" y="10" class="legend-text">Dead (${computedStats.deadCount})</text>
          </g>
        </g>
      `;
    } else if (template === 'streak') {
      const colCount = contentW > 800 ? 3 : 2;
      const colGap = 20;
      const colW = (contentW - (colCount - 1) * colGap) / colCount;

      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          <rect x="0" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="24" y="65" class="hero-val">${computedStats.longestStreak}</text>
          <text x="24" y="100" class="hero-unit">DAYS</text>
          <text x="24" y="135" class="stat-label">Longest Streak</text>
          <text x="24" y="165" class="stat-sub">Current: ${computedStats.currentStreak} consecutive days</text>

          <rect x="${colW + colGap}" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="${colW + colGap + 24}" y="65" class="hero-val">${computedStats.periodCommits}</text>
          <text x="${colW + colGap + 24}" y="100" class="hero-unit">COMMITS</text>
          <text x="${colW + colGap + 24}" y="135" class="stat-label">${escapeXml(computedStats.periodLabel)}</text>
          <text x="${colW + colGap + 24}" y="165" class="stat-sub">Peak day: ${escapeXml(computedStats.mostActiveWeekday)}</text>

          ${colCount > 2 ? `
            <rect x="${(colW + colGap) * 2}" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
            <text x="${(colW + colGap) * 2 + 24}" y="65" class="hero-val">${computedStats.activeCount}</text>
            <text x="${(colW + colGap) * 2 + 24}" y="100" class="hero-unit">ACTIVE</text>
            <text x="${(colW + colGap) * 2 + 24}" y="135" class="stat-label">Active Repositories</text>
            <text x="${(colW + colGap) * 2 + 24}" y="165" class="stat-sub">In active motion</text>
          ` : ''}
        </g>
      `;
    } else if (template === 'heat_strip') {
      const rows = sanitizedRepos.slice(0, 7).map((r, idx) => {
        const y = idx * 44;
        const statusColor = r.status === 'active' ? '#D2382A' : r.status === 'cooling' ? '#E88C38' : r.status === 'stale' ? '#86AED0' : '#757D84';
        const barStart = Math.min(contentW * 0.55, 450);
        const barW = Math.max(100, contentW - barStart - 120);
        return `
          <g transform="translate(0, ${y})">
            <circle cx="8" cy="14" r="4" fill="${statusColor}" />
            <text x="24" y="18" class="repo-name">${escapeXml(r.name)}</text>
            <text x="${barStart - 90}" y="18" class="repo-meta">${escapeXml(r.language)}</text>
            <rect x="${barStart}" y="6" width="${barW}" height="16" rx="2" fill="${borderColor}" />
            <rect x="${barStart}" y="6" width="${Math.min(barW, Math.max(8, (r.commits || 1) * 12))}" height="16" rx="2" fill="${statusColor}" />
            <text x="${barStart + barW + 16}" y="18" class="repo-meta">${r.commits} commits</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          <text x="0" y="-12" class="section-label">ACTIVE REPOSITORY LEDGER</text>
          ${rows || `<text x="0" y="30" class="subtext">No repositories to display.</text>`}
        </g>
      `;
    } else if (template === 'language_mix') {
      const rows = computedStats.languages.map((l, idx) => {
        const y = idx * 42;
        const nameW = 160;
        const barW = Math.max(120, contentW - nameW - 140);
        return `
          <g transform="translate(0, ${y})">
            <text x="0" y="18" class="repo-name">${escapeXml(l.name)}</text>
            <rect x="${nameW}" y="6" width="${barW}" height="14" rx="2" fill="${borderColor}" />
            <rect x="${nameW}" y="6" width="${Math.max(4, (l.percentage / 100) * barW)}" height="14" rx="2" fill="${accentColor}" />
            <text x="${nameW + barW + 20}" y="18" class="repo-meta">${l.percentage}% (${l.count} repos)</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          <text x="0" y="-12" class="section-label">LANGUAGE DISTRIBUTION</text>
          ${rows || `<text x="0" y="30" class="subtext">No language data recorded yet.</text>`}
        </g>
      `;
    } else if (template === 'achievements') {
      const badges = [
        { name: '7-Day Momentum', description: 'Maintained 7 consecutive commit days' },
        { name: 'Century Velocity', description: 'Authored 100+ commits across repositories' },
        { name: 'Inbox Zero', description: 'Decided on every cooling and stale repository' },
      ];
      const badgeCols = contentW > 700 ? 2 : 1;
      const badgeW = (contentW - (badgeCols - 1) * 20) / badgeCols;

      const badgeSvg = badges.map((b, idx) => {
        const col = idx % badgeCols;
        const row = Math.floor(idx / badgeCols);
        const x = col * (badgeW + 20);
        const y = row * 105;
        return `
          <g transform="translate(${x}, ${y})">
            <rect x="0" y="0" width="${badgeW}" height="90" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
            <circle cx="36" cy="45" r="18" fill="${accentColor}" fill-opacity="0.15" />
            <path d="M29 45 L34 50 L43 41" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <text x="68" y="38" class="badge-title">${escapeXml(b.name)}</text>
            <text x="68" y="58" class="badge-desc">${escapeXml(b.description)}</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          <text x="0" y="-12" class="section-label">EARNED MILESTONES & ACHIEVEMENTS</text>
          ${badgeSvg}
        </g>
      `;
    } else if (template === 'triage_progress') {
      const boxW = (contentW - 20) / 2;
      bodySvg = `
        <g transform="translate(${contentX}, ${pad + 140})">
          <rect x="0" y="0" width="${boxW}" height="190" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="28" y="45" class="stat-label">REPOSITORIES IN ACTIVE RETENTION</text>
          <text x="28" y="105" class="hero-val">${computedStats.activeCount}</text>
          <text x="28" y="150" class="stat-sub">Healthy momentum within active threshold</text>

          <rect x="${boxW + 20}" y="0" width="${boxW}" height="190" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="${boxW + 48}" y="45" class="stat-label">TRIAGE DECISION STATUS</text>
          <text x="${boxW + 48}" y="105" class="hero-val">${computedStats.coolingCount + computedStats.staleCount}</text>
          <text x="${boxW + 48}" y="150" class="stat-sub">${computedStats.coolingCount + computedStats.staleCount === 0 ? 'Triage inbox clean' : 'Repositories awaiting decision'}</text>
        </g>
      `;
    }

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; fill: ${textColor}; }
          .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; fill: ${subtextColor}; }
          .section-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; fill: ${subtextColor}; }
          .stat-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; fill: ${textColor}; }
          .stat-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; fill: ${subtextColor}; }
          .stat-sub { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: ${subtextColor}; }
          .hero-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 52px; font-weight: 700; fill: ${textColor}; }
          .hero-unit { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; fill: ${subtextColor}; }
          .legend-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 500; fill: ${textColor}; }
          .repo-name { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600; fill: ${textColor}; }
          .repo-meta { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; fill: ${subtextColor}; }
          .badge-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; fill: ${textColor}; }
          .badge-desc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: ${subtextColor}; }
        </style>
        <rect width="${width}" height="${height}" fill="${bgColor}" />
        <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="8" fill="${surfaceColor}" stroke="${borderColor}" stroke-width="1" />
        <g transform="translate(${contentX}, ${pad + 44})">
          <text x="0" y="32" class="title">${safeTitle}</text>
          <text x="0" y="66" class="subtext">${safeSubtitle}</text>
        </g>
        ${bodySvg}
        ${watermark ? `<text x="${width - pad - 44}" y="${height - pad - 28}" text-anchor="end" class="subtext" style="font-size: 13px; font-weight: 500;">Made with RepoPulse</text>` : ''}
      </svg>
    `;
  };

  const handleDownloadSvg = () => {
    const svgCode = generateClientSvg();
    const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repopulse-${user.login}-${template}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActionFeedback('SVG card downloaded');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleDownloadPng = () => {
    try {
      const svgCode = generateClientSvg();
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10) || 1200;
      const height = parseInt(hStr, 10) || 630;

      const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                const pngUrl = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = `repopulse-${user.login}-${template}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
                setActionFeedback('PNG card downloaded');
                setTimeout(() => setActionFeedback(null), 3000);
              } else {
                handleDownloadSvg();
              }
            }, 'image/png');
          } else {
            handleDownloadSvg();
          }
        } catch {
          handleDownloadSvg();
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        handleDownloadSvg();
      };

      img.src = url;
    } catch {
      handleDownloadSvg();
    }
  };

  const handleCopyImage = () => {
    try {
      const svgCode = generateClientSvg();
      const [wStr, hStr] = size.split('x');
      const width = parseInt(wStr, 10) || 1200;
      const height = parseInt(hStr, 10) || 630;

      const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(async (pngBlob) => {
              if (pngBlob && navigator.clipboard?.write) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': pngBlob }),
                  ]);
                  setActionFeedback('Image copied to clipboard!');
                  setTimeout(() => setActionFeedback(null), 3000);
                } catch {
                  handleDownloadPng();
                }
              } else {
                handleDownloadPng();
              }
            }, 'image/png');
          } else {
            handleDownloadPng();
          }
        } catch {
          handleDownloadPng();
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        handleDownloadPng();
      };

      img.src = url;
    } catch {
      handleDownloadPng();
    }
  };

  const isDark = theme === 'dark' || theme === 'heat-accent';
  const isHeatAccent = theme === 'heat-accent';
  const previewBgColor = isDark ? '#131413' : '#F2F3F1';
  const previewSurfaceColor = isDark ? '#1C1D1B' : '#FFFFFF';
  const previewTextColor = isDark ? '#EDEEEA' : '#14181B';
  const previewSubtextColor = isDark ? '#A2A8A4' : '#4B545B';
  const previewBorderColor = isHeatAccent ? '#F2664F' : (isDark ? '#2E302D' : '#DADDDA');

  return (
    <div className="share-view space-y-6 sm:space-y-8 w-full max-w-full font-sans">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-12 m-0 tracking-tight">
            Share Cards & Public Links
          </h1>
          <p className="text-xs sm:text-sm text-neutral-9 m-0 mt-1">
            Generate high-resolution momentum cards, save public snapshots, and share your verified streak link with others.
          </p>
        </div>

        {actionFeedback && (
          <div className="px-3.5 py-1.5 bg-neutral-12 text-neutral-1 rounded-xs text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto shadow-subtle animate-in fade-in">
            <CheckCircle2 size={14} className="text-verdict-keep-text" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* Active snapshot live banner (if just created) */}
      {createdSlug && (
        <div className="p-4 bg-verdict-keep-bg/30 border border-verdict-keep-border/70 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-subtle animate-in fade-in">
          <div className="min-w-0">
            <div className="font-semibold text-neutral-12 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-verdict-keep-text shrink-0" />
              <span>Card snapshot live! Ready to share your link.</span>
            </div>
            <a
              href={`/s/${createdSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-2xs text-neutral-11 hover:text-neutral-12 underline mt-1 inline-flex items-center gap-1 truncate max-w-full"
            >
              <span>{window.location.origin}/s/{createdSlug}</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-neutral-12 text-neutral-1 hover:bg-neutral-11 font-medium transition-colors text-xs cursor-pointer shadow-xs"
              onClick={() => copyPublicLink(createdSlug)}
            >
              <Copy size={13} />
              <span>{copyStatus || 'Copy Link'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-neutral-5 hover:border-neutral-12 bg-neutral-1 text-neutral-12 font-medium transition-colors text-xs cursor-pointer"
              onClick={() => shareToX(createdSlug)}
            >
              <span>Share to X</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-neutral-5 hover:border-neutral-12 bg-neutral-1 text-neutral-12 font-medium transition-colors text-xs cursor-pointer"
              onClick={() => shareToLinkedIn(createdSlug)}
            >
              <span>LinkedIn</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Main Grid (Responsive 1-col on mobile, 2-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-8 items-start w-full">
        {/* Controls Column */}
        <div className="w-full bg-neutral-2 border border-neutral-4 rounded-xs p-4 sm:p-6 flex flex-col gap-5 box-border">
          {/* Template Picker */}
          <div>
            <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-2 font-mono">
              Card Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              className="w-full h-9 px-3 text-xs bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none font-sans"
            >
              <option value="summary">Summary stats</option>
              <option value="streak">Streak & velocity</option>
              <option value="heat_strip">Repository heat ledger</option>
              <option value="language_mix">Language distribution</option>
              <option value="achievements">Milestones & achievements</option>
              <option value="triage_progress">Triage progress</option>
            </select>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-2 font-mono">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                  className={`p-2 sm:p-2.5 text-xs rounded-xs border text-left transition-all cursor-pointer touch-manipulation ${
                    size === s.val
                      ? 'border-neutral-12 bg-neutral-3 text-neutral-12 font-semibold shadow-xs'
                      : 'border-neutral-4 bg-neutral-1 text-neutral-10 hover:border-neutral-7 hover:text-neutral-12'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-2 font-mono">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none font-sans"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="heat-accent">Heat accent</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-2 font-mono">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none font-sans"
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="year">Past year</option>
              </select>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-2xs font-semibold text-neutral-9 uppercase tracking-wider font-mono">
                Headline
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-2xs text-neutral-8 hover:text-neutral-12 cursor-pointer font-sans"
                title="Reset text to defaults"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none font-sans"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-2 font-mono">
              Subtitle text
            </label>
            <input
              type="text"
              value={subtitle}
              maxLength={120}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 outline-none font-sans"
            />
          </div>

          {/* Privacy & Attribution */}
          <div className="border-t border-neutral-4 pt-4">
            <label className="block text-2xs font-semibold text-neutral-9 uppercase tracking-wider mb-3 font-mono">
              Privacy & attribution
            </label>

            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-xs text-neutral-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePrivateNames}
                  onChange={handleTogglePrivateNames}
                  className="rounded-[2px] border-neutral-6 text-neutral-12 focus:ring-1 focus:ring-neutral-12 cursor-pointer"
                />
                <span>Hide private repository names</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideAllRepoNames}
                  onChange={(e) => setHideAllRepoNames(e.target.checked)}
                  className="rounded-[2px] border-neutral-6 text-neutral-12 focus:ring-1 focus:ring-neutral-12 cursor-pointer"
                />
                <span>Anonymize all repository names</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="rounded-[2px] border-neutral-6 text-neutral-12 focus:ring-1 focus:ring-neutral-12 cursor-pointer"
                />
                <span>Include RepoPulse watermark</span>
              </label>
            </div>
          </div>

          {/* Direct Export Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              className="h-9 px-3 rounded-xs border border-neutral-5 hover:border-neutral-12 bg-neutral-1 text-neutral-11 hover:text-neutral-12 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleDownloadSvg}
              title="Download vector SVG file"
            >
              <Download size={13} />
              <span>Save SVG</span>
            </button>
            <button
              type="button"
              className="h-9 px-3 rounded-xs border border-neutral-5 hover:border-neutral-12 bg-neutral-1 text-neutral-11 hover:text-neutral-12 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleDownloadPng}
              title="Download high-res PNG image"
            >
              <ImageIcon size={13} />
              <span>Save PNG</span>
            </button>
          </div>

          {/* Generate Public Card Action */}
          <button
            id="create-card-btn"
            type="button"
            className="w-full h-10 px-4 bg-neutral-12 text-neutral-1 hover:bg-neutral-11 transition-colors rounded-xs text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer touch-manipulation disabled:opacity-50"
            onClick={handleCreateSnapshot}
            disabled={isSaving}
          >
            <Share2 size={14} />
            <span>{isSaving ? 'Saving Card Snapshot...' : 'Save Card & Create Public Link'}</span>
          </button>
        </div>

        {/* Live Preview Column */}
        <div className="flex flex-col gap-4 min-w-0 w-full overflow-hidden">
          {/* Card Preview Container */}
          <div
            className="w-full rounded-xs p-3 sm:p-6 overflow-hidden border border-neutral-4"
            style={{ backgroundColor: previewBgColor }}
          >
            <div
              className="w-full rounded-sm p-4 sm:p-8 min-h-[340px] flex flex-col justify-between overflow-x-auto shadow-elevation-1 transition-all"
              style={{
                backgroundColor: previewSurfaceColor,
                border: `1px solid ${previewBorderColor}`,
              }}
            >
              {/* Card Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: previewTextColor, margin: 0 }}>
                    {title}
                  </h2>
                  {showAvatar && (
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      style={{ width: '40px', height: '40px', borderRadius: '4px', border: `1px solid ${previewBorderColor}` }}
                    />
                  )}
                </div>
                <p style={{ fontSize: '14px', color: previewSubtextColor, margin: 0 }}>
                  {subtitle}
                </p>
              </div>

              {/* Template Body */}
              <div style={{ margin: '28px 0' }}>
                {template === 'summary' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                          {computedStats.periodCommits}
                        </div>
                        <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>{computedStats.periodLabel}</div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                          {computedStats.activeCount}
                        </div>
                        <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Active repos</div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                          {computedStats.longestStreak}d
                        </div>
                        <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Longest streak</div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                          {computedStats.totalRepos}
                        </div>
                        <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Total repos</div>
                      </div>
                    </div>

                    {/* Liveliness Distribution */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: previewSubtextColor, marginBottom: '6px', letterSpacing: '0.5px' }}>
                        LIVELINESS DISTRIBUTION
                      </div>
                      <div style={{ height: '14px', width: '100%', backgroundColor: previewBorderColor, borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '12px' }}>
                        <div style={{ width: `${(computedStats.activeCount / Math.max(1, computedStats.totalRepos)) * 100}%`, height: '100%', backgroundColor: 'var(--heat-active)' }} />
                        <div style={{ width: `${(computedStats.coolingCount / Math.max(1, computedStats.totalRepos)) * 100}%`, height: '100%', backgroundColor: 'var(--heat-cooling)' }} />
                        <div style={{ width: `${(computedStats.staleCount / Math.max(1, computedStats.totalRepos)) * 100}%`, height: '100%', backgroundColor: 'var(--heat-stale)' }} />
                        <div style={{ width: `${(computedStats.deadCount / Math.max(1, computedStats.totalRepos)) * 100}%`, height: '100%', backgroundColor: 'var(--heat-dead)' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: previewTextColor, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--heat-active)' }} />
                          Active ({computedStats.activeCount})
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--heat-cooling)' }} />
                          Cooling ({computedStats.coolingCount})
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--heat-stale)' }} />
                          Stale ({computedStats.staleCount})
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--heat-dead)' }} />
                          Dead ({computedStats.deadCount})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {template === 'streak' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '24px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                      <div style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                        {computedStats.longestStreak}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: previewSubtextColor, marginTop: '4px', letterSpacing: '0.5px' }}>DAYS CONTINUOUS STREAK</div>
                      <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Current: {computedStats.currentStreak} consecutive days</div>
                    </div>

                    <div style={{ padding: '24px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                      <div style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>
                        {computedStats.periodCommits}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: previewSubtextColor, marginTop: '4px', letterSpacing: '0.5px' }}>{computedStats.periodLabel.toUpperCase()}</div>
                      <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Peak day: {computedStats.mostActiveWeekday}</div>
                    </div>
                  </div>
                )}

                {template === 'heat_strip' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: previewSubtextColor, marginBottom: '4px', letterSpacing: '0.5px' }}>
                      ACTIVE REPOSITORY LEDGER
                    </div>
                    {sanitizedRepos.map((r) => {
                      const statusColor = r.status === 'active' ? 'var(--heat-active)' : r.status === 'cooling' ? 'var(--heat-cooling)' : r.status === 'stale' ? 'var(--heat-stale)' : 'var(--heat-dead)';
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: previewBgColor, borderRadius: 'var(--r)', border: `1px solid ${previewBorderColor}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: previewTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '12px', color: previewSubtextColor }}>{r.language}</span>
                            <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: previewTextColor, fontWeight: 500 }}>{r.commits} commits</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {template === 'language_mix' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: previewSubtextColor, marginBottom: '4px', letterSpacing: '0.5px' }}>
                      LANGUAGE DISTRIBUTION
                    </div>
                    {computedStats.languages.map((l) => (
                      <div key={l.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ color: previewTextColor, fontWeight: 500 }}>{l.name}</span>
                          <span style={{ color: previewSubtextColor }}>{l.percentage}% ({l.count} repos)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: previewBorderColor, borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${l.percentage}%`, height: '100%', backgroundColor: 'var(--heat-active)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {template === 'achievements' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: previewSubtextColor, marginBottom: '8px', letterSpacing: '0.5px' }}>
                      EARNED MILESTONES & ACHIEVEMENTS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Flame size={24} color="var(--heat-active)" strokeWidth={1.75} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: previewTextColor }}>7-Day Momentum</div>
                          <div style={{ fontSize: '12px', color: previewSubtextColor }}>7 consecutive commit days</div>
                        </div>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <GitCommit size={24} color="var(--heat-active)" strokeWidth={1.75} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: previewTextColor }}>Century Velocity</div>
                          <div style={{ fontSize: '12px', color: previewSubtextColor }}>100+ commits across repos</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {template === 'triage_progress' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '24px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: previewSubtextColor, marginBottom: '8px' }}>ACTIVE RETENTION</div>
                      <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>{computedStats.activeCount}</div>
                      <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Active repositories kept alive</div>
                    </div>
                    <div style={{ padding: '24px', backgroundColor: previewBgColor, border: `1px solid ${previewBorderColor}`, borderRadius: 'var(--r)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: previewSubtextColor, marginBottom: '8px' }}>TRIAGE INBOX</div>
                      <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--mono)', color: previewTextColor }}>{computedStats.coolingCount + computedStats.staleCount}</div>
                      <div style={{ fontSize: '12px', color: previewSubtextColor, marginTop: '4px' }}>Decisions pending</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${previewBorderColor}`, paddingTop: '16px' }}>
                <span style={{ fontSize: '12px', color: previewSubtextColor }}>
                  Verified GitHub commit timestamps
                </span>
                {watermark && (
                  <span style={{ fontSize: '12px', color: previewSubtextColor, fontWeight: 500 }}>
                    Made with RepoPulse
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Ribbon: Quick export and copy */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyImage}
              title="Copy image to clipboard"
            >
              <Copy size={14} />
              Copy image
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadSvg}
            >
              <Download size={14} />
              Download SVG
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadPng}
            >
              <ImageIcon size={14} />
              Download PNG
            </button>
          </div>

        </div>
      </div>

      {/* Existing Snapshots & Shared Links Ledger */}
      <div className="mt-8 pt-6 border-t border-neutral-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-neutral-12 m-0 tracking-tight">
              My Cards & Public Links ({snapshots.length})
            </h2>
            <p className="text-xs text-neutral-9 m-0 mt-0.5">
              Live snapshots you've generated. Anyone with the link can view your verified stats.
            </p>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-6 border border-neutral-4 rounded-xs bg-neutral-2/50 text-center space-y-2">
            <p className="text-xs text-neutral-10 m-0">
              You haven't generated any public share cards yet.
            </p>
            <p className="text-2xs text-neutral-8 m-0">
              Click <strong>"Save Card & Create Public Link"</strong> above to publish your first verified snapshot!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {snapshots.map((s) => (
              <div
                key={s.id || s.slug}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-neutral-2 border border-neutral-4 rounded-xs text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-neutral-12 truncate">
                    {s.title || 'RepoPulse Card'}
                  </div>
                  <div className="text-2xs text-neutral-8 mt-0.5">
                    Template: {s.template} · Created {new Date(s.created_at).toLocaleDateString()}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-2xs font-mono text-neutral-10">
                    <span className="text-neutral-7">Link:</span>
                    <a
                      href={`/s/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-11 hover:text-neutral-12 underline truncate"
                    >
                      /s/{s.slug}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-4 flex-wrap">
                  <a
                    href={`/s/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xs border border-neutral-5 hover:border-neutral-12 text-neutral-11 hover:text-neutral-12 bg-neutral-1 font-medium transition-colors text-xs"
                  >
                    <ExternalLink size={12} />
                    <span>View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyPublicLink(s.slug)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xs border border-neutral-5 hover:border-neutral-12 text-neutral-11 hover:text-neutral-12 bg-neutral-1 font-medium transition-colors text-xs cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{copyStatus === s.slug ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToX(s.slug)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xs border border-neutral-5 hover:border-neutral-12 text-neutral-11 hover:text-neutral-12 bg-neutral-1 font-medium transition-colors text-xs cursor-pointer"
                  >
                    <span>Share on X</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeSnapshot(s.slug)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xs text-heat-active hover:bg-heat-active/10 transition-colors text-xs cursor-pointer"
                    title="Revoke public card link"
                  >
                    <Trash2 size={12} />
                    <span>Revoke</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
