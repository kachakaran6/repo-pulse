import React, { useState, useEffect, useMemo, useRef } from 'react';
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
      periodCommits = (totalCommits90d || totalCommits30d || 0) * 4;
      periodLabel = 'Commits (Past Year)';
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
    const contentW = innerW - 80;

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
          <text x="${x + 20}" y="${y + 48}" class="stat-val">${item.val}</text>
          <text x="${x + 20}" y="${y + 78}" class="stat-label">${item.label}</text>
        `;
      }).join('');

      const barY = Math.ceil(items.length / colCount) * 120 + 20;

      bodySvg = `
        <g transform="translate(80, 160)">
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
        <g transform="translate(80, 160)">
          <rect x="0" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="24" y="65" class="hero-val">${computedStats.longestStreak}</text>
          <text x="24" y="100" class="hero-unit">DAYS</text>
          <text x="24" y="135" class="stat-label">Longest Continuous Streak</text>
          <text x="24" y="165" class="stat-sub">Current: ${computedStats.currentStreak} consecutive days</text>

          <rect x="${colW + colGap}" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
          <text x="${colW + colGap + 24}" y="65" class="hero-val">${computedStats.periodCommits}</text>
          <text x="${colW + colGap + 24}" y="100" class="hero-unit">COMMITS</text>
          <text x="${colW + colGap + 24}" y="135" class="stat-label">${computedStats.periodLabel}</text>
          <text x="${colW + colGap + 24}" y="165" class="stat-sub">Peak day: ${computedStats.mostActiveWeekday}</text>

          ${colCount > 2 ? `
            <rect x="${(colW + colGap) * 2}" y="0" width="${colW}" height="200" rx="4" fill="${bgColor}" stroke="${borderColor}" stroke-width="1" />
            <text x="${(colW + colGap) * 2 + 24}" y="65" class="hero-val">${computedStats.activeCount}</text>
            <text x="${(colW + colGap) * 2 + 24}" y="100" class="hero-unit">ACTIVE</text>
            <text x="${(colW + colGap) * 2 + 24}" y="135" class="stat-label">Active Repositories</text>
            <text x="${(colW + colGap) * 2 + 24}" y="165" class="stat-sub">In motion</text>
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
            <text x="24" y="18" class="repo-name">${r.name}</text>
            <text x="${barStart - 90}" y="18" class="repo-meta">${r.language}</text>
            <rect x="${barStart}" y="6" width="${barW}" height="16" rx="2" fill="${borderColor}" />
            <rect x="${barStart}" y="6" width="${Math.min(barW, Math.max(8, (r.commits || 1) * 12))}" height="16" rx="2" fill="${statusColor}" />
            <text x="${barStart + barW + 16}" y="18" class="repo-meta">${r.commits} commits</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(80, 160)">
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
            <text x="0" y="18" class="repo-name">${l.name}</text>
            <rect x="${nameW}" y="6" width="${barW}" height="14" rx="2" fill="${borderColor}" />
            <rect x="${nameW}" y="6" width="${Math.max(4, (l.percentage / 100) * barW)}" height="14" rx="2" fill="${accentColor}" />
            <text x="${nameW + barW + 20}" y="18" class="repo-meta">${l.percentage}% (${l.count} repos)</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(80, 160)">
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
            <text x="36" y="51" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${accentColor}">✓</text>
            <text x="68" y="38" class="badge-title">${b.name}</text>
            <text x="68" y="58" class="badge-desc">${b.description}</text>
          </g>
        `;
      }).join('');

      bodySvg = `
        <g transform="translate(80, 160)">
          <text x="0" y="-12" class="section-label">EARNED MILESTONES & ACHIEVEMENTS</text>
          ${badgeSvg}
        </g>
      `;
    } else if (template === 'triage_progress') {
      const boxW = (contentW - 20) / 2;
      bodySvg = `
        <g transform="translate(80, 160)">
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
          .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; fill: ${textColor}; }
          .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; fill: ${subtextColor}; }
          .section-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; fill: ${subtextColor}; }
          .stat-val { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 32px; font-weight: 700; fill: ${textColor}; }
          .stat-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 500; fill: ${subtextColor}; }
          .stat-sub { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${subtextColor}; }
          .hero-val { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 52px; font-weight: 700; fill: ${textColor}; }
          .hero-unit { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; fill: ${subtextColor}; }
          .legend-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${textColor}; }
          .repo-name { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; font-weight: 600; fill: ${textColor}; }
          .repo-meta { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; fill: ${subtextColor}; }
          .badge-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; fill: ${textColor}; }
          .badge-desc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: ${subtextColor}; }
        </style>
        <rect width="${width}" height="${height}" fill="${bgColor}" />
        <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="8" fill="${surfaceColor}" stroke="${borderColor}" stroke-width="1" />
        <g transform="translate(80, 85)">
          <text x="0" y="0" class="title">${title}</text>
          <text x="0" y="26" class="subtext">${subtitle}</text>
        </g>
        ${bodySvg}
        ${watermark ? `<text x="${width - pad - 30}" y="${height - pad - 24}" text-anchor="end" class="subtext" style="font-size: 12px;">Made with RepoPulse</text>` : ''}
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
    const svgCode = generateClientSvg();
    const [wStr, hStr] = size.split('x');
    const width = parseInt(wStr, 10) || 1200;
    const height = parseInt(hStr, 10) || 630;

    const img = new Image();
    const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `repopulse-${user.login}-${template}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
            setActionFeedback('PNG card downloaded');
            setTimeout(() => setActionFeedback(null), 3000);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleCopyImage = () => {
    const svgCode = generateClientSvg();
    const [wStr, hStr] = size.split('x');
    const width = parseInt(wStr, 10) || 1200;
    const height = parseInt(hStr, 10) || 630;

    const img = new Image();
    const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard?.write) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
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
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const isDark = theme === 'dark' || theme === 'heat-accent';
  const isHeatAccent = theme === 'heat-accent';
  const previewBgColor = isDark ? '#131413' : '#F2F3F1';
  const previewSurfaceColor = isDark ? '#1C1D1B' : '#FFFFFF';
  const previewTextColor = isDark ? '#EDEEEA' : '#14181B';
  const previewSubtextColor = isDark ? '#A2A8A4' : '#4B545B';
  const previewBorderColor = isHeatAccent ? '#F2664F' : (isDark ? '#2E302D' : '#DADDDA');

  return (
    <div className="share-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
            Share cards
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
            Generate high-resolution SVG and PNG momentum cards for your repositories and streaks.
          </p>
        </div>

        {actionFeedback && (
          <div
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: 'var(--r)',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            {actionFeedback}
          </div>
        )}
      </div>

      {/* Editor Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
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
            boxSizing: 'border-box',
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
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: 'var(--r)',
                    border: '1px solid',
                    borderColor: size === s.val ? 'var(--ink)' : 'var(--line)',
                    backgroundColor: size === s.val ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--ink)',
                    fontWeight: size === s.val ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Headline
              </label>
              <button
                type="button"
                className="btn-quiet"
                onClick={handleResetDefaults}
                style={{ fontSize: '11px', padding: 0 }}
                title="Reset text to defaults"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              className="search-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Subtitle text
            </label>
            <input
              type="text"
              value={subtitle}
              maxLength={120}
              onChange={(e) => setSubtitle(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Privacy & Attribution */}
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

          {/* Direct Export Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadSvg}
              title="Download vector SVG file"
            >
              <Download size={14} />
              Save SVG
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadPng}
              title="Download high-res PNG image"
            >
              <ImageIcon size={14} />
              Save PNG
            </button>
          </div>

          {/* Generate Public Card Action */}
          <button
            id="create-card-btn"
            type="button"
            className="btn-primary"
            onClick={handleCreateSnapshot}
            disabled={isSaving}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSaving ? 'Creating snapshot...' : 'Generate public share card'}
          </button>
        </div>

        {/* Live Preview Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Card Preview Container */}
          <div
            style={{
              backgroundColor: previewBgColor,
              border: `1px solid var(--line)`,
              borderRadius: 'var(--r)',
              padding: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                backgroundColor: previewSurfaceColor,
                border: `1px solid ${previewBorderColor}`,
                borderRadius: '8px',
                padding: '32px',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)',
                transition: 'all var(--transition)',
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

          {/* Quick Actions for active snapshot */}
          {createdSlug && (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Snapshot live: </span>
                <a
                  href={`/s/${createdSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: 'var(--heat-stale)', textDecoration: 'underline' }}
                >
                  /s/{createdSlug}
                </a>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copyPublicLink(createdSlug)}
                >
                  <Copy size={14} />
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
                  flexWrap: 'wrap',
                  gap: '12px',
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
                    <ExternalLink size={14} />
                    View
                  </a>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => copyPublicLink(s.slug)}
                    style={{ fontSize: '12px' }}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => handleRevokeSnapshot(s.slug)}
                    style={{ fontSize: '12px', color: 'var(--heat-active)' }}
                  >
                    <Trash2 size={14} />
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
