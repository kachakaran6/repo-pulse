import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Repository, RepoStatus } from '../types.js';
import { RepoRow } from './RepoRow.js';
import { OverviewSkeleton } from './FeedbackComponents.js';
import {
  Search,
  Filter,
  ArrowUpDown,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  Check,
  Keyboard,
  Lock,
  Building2,
  Users,
  Clock,
  Archive,
  AlertCircle,
} from 'lucide-react';

interface OverviewViewProps {
  repos: Repository[];
  summarySentence: string;
  currentUsername?: string;
  onOpenDetails: (repo: Repository) => void;
  thresholds: { active: number; cooling: number; stale: number };
  isSyncing?: boolean;
  isLoading?: boolean;
  onSync?: () => Promise<void>;
  onStartTriage?: () => void;
  onDecision?: (repoId: string | number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
  onUpdateLabel?: (repoId: string | number, label: string) => Promise<void>;
  installations?: any[];
}

type ViewFilter = 'all' | 'mine' | 'shared' | 'organizations';
type GroupBy = 'status' | 'owner' | 'language' | 'none';
type SortOption = 'status_newest' | 'last_commit_newest' | 'last_commit_oldest' | 'commits_30d' | 'commits_90d' | 'name' | 'created';

export const OverviewView: React.FC<OverviewViewProps> = ({
  repos,
  summarySentence,
  currentUsername,
  onOpenDetails,
  thresholds,
  isSyncing = false,
  isLoading = false,
  onSync,
  onStartTriage,
  onDecision,
  onUpdateLabel,
  installations = [],
}) => {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewFilter>('all');
  const [selectedHeatFilter, setSelectedHeatFilter] = useState<'all' | RepoStatus>('all');

  // Filter Dropdowns
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<string>('all');

  // Sort & Group
  const [sortBy, setSortBy] = useState<SortOption>('status_newest');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [isCompact, setIsCompact] = useState(false);

  // Group Collapsed State (Dead collapsed by default per W4 spec)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    dead: true,
  });

  // Group Pagination State
  const [groupRowLimits, setGroupRowLimits] = useState<Record<string, number>>({});

  // Bulk Selection
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string | number>>(new Set());

  // Keyboard Navigation Index
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [copiedInstallLink, setCopiedInstallLink] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Exclude retired repos from standard overview pool
  const activePool = useMemo(() => {
    return (repos || []).filter((r) => !r.is_retired);
  }, [repos]);

  // Check if any installation is 'selected' (partial access)
  const selectedInstallation = installations.find((i) => i.selection === 'selected');

  // Triage count (cooling + stale without decision)
  const needsTriageCount = useMemo(() => {
    return activePool.filter((r) => (r.status === 'cooling' || r.status === 'stale') && !r.meta?.decision).length;
  }, [activePool]);

  // Facet extraction for filters
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const r of activePool) {
      if (r.language) langs.add(r.language);
    }
    return Array.from(langs).sort();
  }, [activePool]);

  // Filter and Sort Repositories
  const filteredAndSortedRepos = useMemo(() => {
    let result = [...activePool];

    // 1. View filter
    if (activeView === 'mine') {
      result = result.filter((r) => !r.is_collaborative);
    } else if (activeView === 'shared') {
      result = result.filter((r) => r.relationship === 'collaborator');
    } else if (activeView === 'organizations') {
      result = result.filter((r) => r.owner_type === 'Organization' || r.relationship === 'organization');
    }

    // 2. Heat bar filter
    if (selectedHeatFilter !== 'all') {
      result = result.filter((r) => r.status === selectedHeatFilter);
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          (r.meta?.label && r.meta.label.toLowerCase().includes(q)) ||
          (r.language && r.language.toLowerCase().includes(q))
      );
    }

    // 4. Secondary filters
    if (selectedRelationship !== 'all') {
      result = result.filter((r) => r.relationship === selectedRelationship);
    }
    if (selectedVisibility === 'private') {
      result = result.filter((r) => r.is_private);
    } else if (selectedVisibility === 'public') {
      result = result.filter((r) => !r.is_private);
    }
    if (selectedLanguage !== 'all') {
      result = result.filter((r) => r.language === selectedLanguage);
    }
    if (selectedDecision === 'undecided') {
      result = result.filter((r) => !r.meta?.decision);
    } else if (selectedDecision !== 'all') {
      result = result.filter((r) => r.meta?.decision === selectedDecision);
    }

    // 5. Sorting
    if (sortBy === 'last_commit_newest') {
      result.sort((a, b) => {
        if (!a.last_commit_at) return 1;
        if (!b.last_commit_at) return -1;
        return new Date(b.last_commit_at).getTime() - new Date(a.last_commit_at).getTime();
      });
    } else if (sortBy === 'last_commit_oldest') {
      result.sort((a, b) => {
        if (!a.last_commit_at) return 1;
        if (!b.last_commit_at) return -1;
        return new Date(a.last_commit_at).getTime() - new Date(b.last_commit_at).getTime();
      });
    } else if (sortBy === 'commits_30d') {
      result.sort((a, b) => {
        const aCommits = (a.activity || []).slice(-30).reduce((s, x) => s + (x.commits_mine ?? x.commits ?? 0), 0);
        const bCommits = (b.activity || []).slice(-30).reduce((s, x) => s + (x.commits_mine ?? x.commits ?? 0), 0);
        return bCommits - aCommits;
      });
    } else if (sortBy === 'commits_90d') {
      result.sort((a, b) => {
        const aCommits = (a.activity || []).reduce((s, x) => s + (x.commits_mine ?? x.commits ?? 0), 0);
        const bCommits = (b.activity || []).reduce((s, x) => s + (x.commits_mine ?? x.commits ?? 0), 0);
        return bCommits - aCommits;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else {
      // Default: status then recency
      const statusOrder: Record<string, number> = { active: 1, cooling: 2, stale: 3, dead: 4 };
      result.sort((a, b) => {
        const sA = statusOrder[a.status] || 5;
        const sB = statusOrder[b.status] || 5;
        if (sA !== sB) return sA - sB;
        if (!a.last_commit_at) return 1;
        if (!b.last_commit_at) return -1;
        return new Date(b.last_commit_at).getTime() - new Date(a.last_commit_at).getTime();
      });
    }

    return result;
  }, [
    activePool,
    activeView,
    selectedHeatFilter,
    searchQuery,
    selectedRelationship,
    selectedVisibility,
    selectedLanguage,
    selectedDecision,
    sortBy,
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsDialog((prev) => !prev);
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(prev + 1, filteredAndSortedRepos.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (focusedRowIndex >= 0 && focusedRowIndex < filteredAndSortedRepos.length) {
          e.preventDefault();
          onOpenDetails(filteredAndSortedRepos[focusedRowIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredAndSortedRepos, focusedRowIndex, onOpenDetails]);

  // Toggle selection for bulk actions
  const handleToggleSelect = (id: string | number) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRepoIds.size === filteredAndSortedRepos.length) {
      setSelectedRepoIds(new Set());
    } else {
      setSelectedRepoIds(new Set(filteredAndSortedRepos.map((r) => r.id)));
    }
  };

  const handleBulkDecision = async (decision: 'keep' | 'pause' | 'retire') => {
    if (!onDecision) return;
    for (const id of selectedRepoIds) {
      await onDecision(id, decision);
    }
    setSelectedRepoIds(new Set());
  };

  const handleCopyInstallLink = () => {
    navigator.clipboard.writeText('https://github.com/apps/repopulse');
    setCopiedInstallLink(true);
    setTimeout(() => setCopiedInstallLink(false), 3000);
  };

  const hasActiveFilters =
    selectedHeatFilter !== 'all' ||
    searchQuery.trim().length > 0 ||
    selectedRelationship !== 'all' ||
    selectedVisibility !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedDecision !== 'all';

  const handleClearAllFilters = () => {
    setSelectedHeatFilter('all');
    setSearchQuery('');
    setSelectedRelationship('all');
    setSelectedVisibility('all');
    setSelectedLanguage('all');
    setSelectedDecision('all');
  };

  // Group repositories according to groupBy setting
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: 'Repositories', count: filteredAndSortedRepos.length, repos: filteredAndSortedRepos }];
    }

    if (groupBy === 'owner') {
      const groupsMap = new Map<string, Repository[]>();
      for (const r of filteredAndSortedRepos) {
        const owner = r.owner_login || 'Personal';
        if (!groupsMap.has(owner)) groupsMap.set(owner, []);
        groupsMap.get(owner)!.push(r);
      }
      return Array.from(groupsMap.entries()).map(([owner, items]) => ({
        key: owner,
        title: owner,
        count: items.length,
        repos: items,
      }));
    }

    if (groupBy === 'language') {
      const groupsMap = new Map<string, Repository[]>();
      for (const r of filteredAndSortedRepos) {
        const lang = r.language || 'Other';
        if (!groupsMap.has(lang)) groupsMap.set(lang, []);
        groupsMap.get(lang)!.push(r);
      }
      return Array.from(groupsMap.entries()).map(([lang, items]) => ({
        key: lang,
        title: lang,
        count: items.length,
        repos: items,
      }));
    }

    // Default: Group by Status
    const statusGroups: { key: RepoStatus; title: string; desc: string; swatch: string; repos: Repository[] }[] = [
      {
        key: 'active',
        title: 'Active',
        desc: `Committed within ${thresholds.active} days`,
        swatch: 'var(--heat-active)',
        repos: filteredAndSortedRepos.filter((r) => r.status === 'active'),
      },
      {
        key: 'cooling',
        title: 'Cooling',
        desc: `No commits in ${thresholds.active + 1}–${thresholds.cooling} days`,
        swatch: 'var(--heat-cooling)',
        repos: filteredAndSortedRepos.filter((r) => r.status === 'cooling'),
      },
      {
        key: 'stale',
        title: 'Stale',
        desc: `No commits in ${thresholds.cooling + 1}–${thresholds.stale} days`,
        swatch: 'var(--heat-stale)',
        repos: filteredAndSortedRepos.filter((r) => r.status === 'stale'),
      },
      {
        key: 'dead',
        title: 'Dead',
        desc: `Over ${thresholds.stale} days without commits`,
        swatch: 'var(--heat-dead)',
        repos: filteredAndSortedRepos.filter((r) => r.status === 'dead'),
      },
    ];

    return statusGroups.map((g) => ({
      key: g.key,
      title: g.title,
      desc: g.desc,
      swatch: g.swatch,
      count: g.repos.length,
      repos: g.repos,
    }));
  }, [filteredAndSortedRepos, groupBy, thresholds]);

  if ((isSyncing || isLoading) && repos.length === 0) {
    return <OverviewSkeleton message="Syncing your repositories and commit history..." />;
  }

  const activeCount = activePool.filter((r) => r.status === 'active').length;
  const coolingCount = activePool.filter((r) => r.status === 'cooling').length;
  const staleCount = activePool.filter((r) => r.status === 'stale').length;
  const deadCount = activePool.filter((r) => r.status === 'dead').length;
  const totalPoolCount = activePool.length || 1;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 0 64px 0' }}>
      {/* 1. Top Summary Sentence & Action Row */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          className="overview-summary"
          style={{
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 12px 0',
            color: 'var(--ink)',
          }}
        >
          {summarySentence}
        </h1>

        {needsTriageCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--ink)' }}>
              <strong>{needsTriageCount} {needsTriageCount === 1 ? 'repo needs' : 'repos need'} a decision.</strong> Triage cooling and stale projects.
            </span>
            {onStartTriage && (
              <button
                type="button"
                className="btn-primary"
                onClick={onStartTriage}
                style={{ fontSize: '13px', padding: '6px 16px' }}
              >
                Start triage
              </button>
            )}
          </div>
        )}
      </div>

      {/* Persistent Notice if installation has selected repositories */}
      {selectedInstallation && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink)' }}>
            <Lock size={15} strokeWidth={1.75} style={{ color: 'var(--ink-2)' }} />
            <span>
              RepoPulse can only see the {selectedInstallation.repo_count || 0} repos you selected on GitHub. Add more to include the rest.
            </span>
          </div>
          <a
            href={`https://github.com/settings/installations/${selectedInstallation.github_installation_id}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Manage access
            <ExternalLink size={13} strokeWidth={1.75} />
          </a>
        </div>
      )}

      {/* 2. Heat Bar (Filter by status share) */}
      <div style={{ marginBottom: '24px' }}>
        <div
          className="heat-bar"
          style={{
            display: 'flex',
            height: '14px',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-2)',
            marginBottom: '12px',
          }}
        >
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'active' ? 'all' : 'active')}
              style={{
                width: `${(activeCount / totalPoolCount) * 100}%`,
                backgroundColor: 'var(--heat-active)',
                border: 'none',
                cursor: 'pointer',
                opacity: selectedHeatFilter === 'all' || selectedHeatFilter === 'active' ? 1 : 0.35,
              }}
              title={`Active: ${activeCount} repos`}
            />
          )}
          {coolingCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'cooling' ? 'all' : 'cooling')}
              style={{
                width: `${(coolingCount / totalPoolCount) * 100}%`,
                backgroundColor: 'var(--heat-cooling)',
                border: 'none',
                cursor: 'pointer',
                opacity: selectedHeatFilter === 'all' || selectedHeatFilter === 'cooling' ? 1 : 0.35,
              }}
              title={`Cooling: ${coolingCount} repos`}
            />
          )}
          {staleCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'stale' ? 'all' : 'stale')}
              style={{
                width: `${(staleCount / totalPoolCount) * 100}%`,
                backgroundColor: 'var(--heat-stale)',
                border: 'none',
                cursor: 'pointer',
                opacity: selectedHeatFilter === 'all' || selectedHeatFilter === 'stale' ? 1 : 0.35,
              }}
              title={`Stale: ${staleCount} repos`}
            />
          )}
          {deadCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'dead' ? 'all' : 'dead')}
              style={{
                width: `${(deadCount / totalPoolCount) * 100}%`,
                backgroundColor: 'var(--heat-dead)',
                border: 'none',
                cursor: 'pointer',
                opacity: selectedHeatFilter === 'all' || selectedHeatFilter === 'dead' ? 1 : 0.35,
              }}
              title={`Dead: ${deadCount} repos`}
            />
          )}
        </div>

        {/* Heat Bar Labels */}
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--ink-2)' }}>
          <span
            onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'active' ? 'all' : 'active')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: selectedHeatFilter === 'active' ? 600 : 400 }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--heat-active)', display: 'inline-block' }} />
            Active <strong style={{ color: 'var(--ink)' }}>{activeCount}</strong>
          </span>
          <span
            onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'cooling' ? 'all' : 'cooling')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: selectedHeatFilter === 'cooling' ? 600 : 400 }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--heat-cooling)', display: 'inline-block' }} />
            Cooling <strong style={{ color: 'var(--ink)' }}>{coolingCount}</strong>
          </span>
          <span
            onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'stale' ? 'all' : 'stale')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: selectedHeatFilter === 'stale' ? 600 : 400 }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--heat-stale)', display: 'inline-block' }} />
            Stale <strong style={{ color: 'var(--ink)' }}>{staleCount}</strong>
          </span>
          <span
            onClick={() => setSelectedHeatFilter(selectedHeatFilter === 'dead' ? 'all' : 'dead')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: selectedHeatFilter === 'dead' ? 600 : 400 }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--heat-dead)', display: 'inline-block' }} />
            Dead <strong style={{ color: 'var(--ink)' }}>{deadCount}</strong>
          </span>
        </div>
      </div>

      {/* 3. View Switcher (All, Mine, Shared with me, Organizations) */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--line)', marginBottom: '16px', paddingBottom: '8px' }}>
        {(
          [
            { key: 'all', label: 'All repositories' },
            { key: 'mine', label: 'Mine' },
            { key: 'shared', label: 'Shared with me' },
            { key: 'organizations', label: 'Organizations' },
          ] as { key: ViewFilter; label: string }[]
        ).map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setActiveView(v.key)}
            style={{
              padding: '6px 0',
              fontSize: '13px',
              fontWeight: activeView === v.key ? 600 : 400,
              color: activeView === v.key ? 'var(--ink)' : 'var(--ink-2)',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderBottom: activeView === v.key ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: '-9px',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* 4. Sticky Toolbar */}
      <div
        style={{
          position: 'sticky',
          top: '56px',
          backgroundColor: 'var(--paper)',
          padding: '8px 0',
          zIndex: 40,
          borderBottom: '1px solid var(--line)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
            <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-2)' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search repos, labels, languages... [/]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '13px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Controls: Filter, Sort, Group, Density */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filter Toggle */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '6px 12px',
                }}
              >
                <Filter size={13} strokeWidth={1.75} />
                Filters
                <ChevronDown size={12} strokeWidth={1.75} />
              </button>

              {showFilterMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '36px',
                    right: 0,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r)',
                    padding: '16px',
                    width: '260px',
                    zIndex: 100,
                    boxShadow: 'none',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
                      Visibility
                    </label>
                    <select
                      value={selectedVisibility}
                      onChange={(e) => setSelectedVisibility(e.target.value)}
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--r)', border: '1px solid var(--line)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
                    >
                      <option value="all">All visibilities</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
                      Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--r)', border: '1px solid var(--line)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
                    >
                      <option value="all">All languages</option>
                      {uniqueLanguages.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
                      Triage decision
                    </label>
                    <select
                      value={selectedDecision}
                      onChange={(e) => setSelectedDecision(e.target.value)}
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--r)', border: '1px solid var(--line)', backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
                    >
                      <option value="all">All decisions</option>
                      <option value="undecided">Undecided</option>
                      <option value="keep">Keeping</option>
                      <option value="pause">Paused</option>
                      <option value="retire">Retired</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              <option value="status_newest">Sort: Status, then newest</option>
              <option value="last_commit_newest">Sort: Last commit (newest)</option>
              <option value="last_commit_oldest">Sort: Last commit (oldest)</option>
              <option value="commits_30d">Sort: Commits in 30 days</option>
              <option value="commits_90d">Sort: Commits in 90 days</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>

            {/* Group By Select */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              <option value="status">Group by status</option>
              <option value="owner">Group by owner</option>
              <option value="language">Group by language</option>
              <option value="none">No grouping</option>
            </select>

            {/* Density Toggle */}
            <button
              type="button"
              className="btn-quiet"
              onClick={() => setIsCompact(!isCompact)}
              title="Toggle row density"
              style={{ fontSize: '12px', padding: '6px 8px' }}
            >
              {isCompact ? 'Comfortable' : 'Compact'}
            </button>
          </div>
        </div>

        {/* Active Filter Tokens & Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--ink-2)' }}>
              Showing {filteredAndSortedRepos.length} of {activePool.length} repos
            </span>

            {hasActiveFilters && (
              <>
                {selectedHeatFilter !== 'all' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink)' }}>
                    Status: {selectedHeatFilter}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedHeatFilter('all')} />
                  </span>
                )}
                {selectedVisibility !== 'all' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink)' }}>
                    Visibility: {selectedVisibility}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedVisibility('all')} />
                  </span>
                )}
                {selectedLanguage !== 'all' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink)' }}>
                    Lang: {selectedLanguage}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedLanguage('all')} />
                  </span>
                )}
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={handleClearAllFilters}
                  style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--heat-active)' }}
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRepoIds.size > 0 && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--ink)',
            borderRadius: 'var(--r)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
            {selectedRepoIds.size} {selectedRepoIds.size === 1 ? 'repository' : 'repositories'} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkDecision('keep')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Keep all
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkDecision('pause')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Pause all
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleBulkDecision('retire')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Retire all
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => setSelectedRepoIds(new Set())}
              style={{ fontSize: '12px' }}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 5. Repository Sections */}
      {filteredAndSortedRepos.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', border: '1px solid var(--line)', borderRadius: 'var(--r)', backgroundColor: 'var(--surface)' }}>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: '0 0 12px 0' }}>
            No repositories match your active search or filters.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClearAllFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groupedSections.map((section) => {
            if (section.count === 0) return null;
            const isCollapsed = Boolean(collapsedGroups[section.key]);
            const limit = groupRowLimits[section.key] || 10;
            const visibleRepos = section.repos.slice(0, limit);

            return (
              <div key={section.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {/* Section Header */}
                <div
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [section.key]: !prev[section.key],
                    }))
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: 'var(--paper)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {section.swatch && (
                      <span style={{ width: '10px', height: '10px', backgroundColor: section.swatch, display: 'inline-block' }} />
                    )}
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{section.title}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>({section.count})</span>
                  </div>

                  {section.desc && (
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      {section.desc}
                    </span>
                  )}
                </div>

                {/* Section Rows */}
                {!isCollapsed && (
                  <div>
                    {visibleRepos.map((repo) => (
                      <RepoRow
                        key={repo.id}
                        repo={repo}
                        currentUsername={currentUsername}
                        isSelected={selectedRepoIds.has(repo.id)}
                        onToggleSelect={handleToggleSelect}
                        onOpenDetails={onOpenDetails}
                        onDecision={onDecision}
                        onUpdateLabel={onUpdateLabel}
                      />
                    ))}

                    {/* Show More in Group */}
                    {section.repos.length > limit && (
                      <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--line)' }}>
                        <button
                          type="button"
                          className="btn-quiet"
                          onClick={() =>
                            setGroupRowLimits((prev) => ({
                              ...prev,
                              [section.key]: limit + 20,
                            }))
                          }
                          style={{ fontSize: '12px', color: 'var(--ink)' }}
                        >
                          Show {Math.min(20, section.repos.length - limit)} more ({section.repos.length - limit} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Honest Limitation Notice for Team / Collaboration Views */}
      {(activeView === 'shared' || activeView === 'organizations') && (
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            backgroundColor: 'var(--surface)',
            fontSize: '13px',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            Not seeing a team repo? Ask the repository owner to install RepoPulse on that account or organization.
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyInstallLink}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {copiedInstallLink ? <Check size={13} /> : <Copy size={13} />}
            {copiedInstallLink ? 'Copied link' : 'Copy install link'}
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcutsDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowShortcutsDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>Keyboard shortcuts</strong>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowShortcutsDialog(false)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--ink)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Move selection</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>J / K / Arrows</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Open details</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>Enter</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Keep going</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>K</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pause</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>P</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Retire</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>R</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Focus search</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>/</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Show shortcuts</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>?</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
