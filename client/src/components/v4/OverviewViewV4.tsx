import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Repository, RepoStatus } from '../../types.js';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RepoRowDense } from './ledger/RepoRowDense.js';
import { RepoCard } from './ledger/RepoCard.js';
import { RepoBoard } from './ledger/RepoBoard.js';
import { StickySectionHeader } from './ledger/StickySectionHeader.js';
import {
  LedgerFilterBar,
  type FilterState,
  type LedgerViewMode,
} from './ledger/LedgerFilterBar.js';
import { FloatingBulkActionBar } from './ledger/FloatingBulkActionBar.js';
import { OverviewSkeletonV4 } from './OverviewSkeletonV4.js';
import { EmptyState } from './ui/EmptyState.js';
import { Button } from './ui/Button.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog.js';
import {
  Layers,
  CheckCircle2,
  CheckCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AnimatedNumber } from './motion/AnimatedNumber.js';
import { toast } from './ui/Toast.js';

interface OverviewViewV4Props {
  repos: Repository[];
  summarySentence: string;
  currentUsername?: string;
  onOpenDetails: (repo: Repository) => void;
  thresholds: { active: number; cooling: number; stale: number };
  isSyncing?: boolean;
  isLoading?: boolean;
  onSync?: () => Promise<void>;
  onStartTriage?: () => void;
  onDecision?: (repoId: number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
  onUpdateLabel?: (repoId: number, label: string) => Promise<void>;
  installations?: any[];
}

interface SectionItem {
  type: 'header' | 'row';
  sectionKey: string;
  repo?: Repository;
  headerData?: {
    title: string;
    subtitle: string;
    count: number;
    repos: Repository[];
    color: string;
    isCollapsed: boolean;
  };
}

const VIEW_STORAGE_KEY = 'repopulse_ledger_view_mode';

export const OverviewViewV4: React.FC<OverviewViewV4Props> = ({
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
}) => {
  // 1. View Mode (List, Cards, Board) with persistence
  const [viewMode, setViewMode] = useState<LedgerViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'cards' || saved === 'board' || saved === 'list') {
      return saved as LedgerViewMode;
    }
    return 'list';
  });

  const handleViewModeChange = (mode: LedgerViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

  // 2. Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    language: 'all',
    verdict: 'all',
    tag: 'all',
    activityRange: 'all',
  });

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      language: 'all',
      verdict: 'all',
      tag: 'all',
      activityRange: 'all',
    });
  };

  // 3. Collapsed Sections State (Dormant collapsed by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    dormant: true,
  });

  // Auto-expand all collapsed sections when search query is typed
  useEffect(() => {
    if (filters.search.trim().length > 0) {
      setCollapsedSections({});
    }
  }, [filters.search]);

  // 4. Multi-Select State
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());

  const toggleSelectRepo = (id: number) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedRepoIds(new Set());
  };

  // 5. Keyboard Navigation State
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Active pool excludes retired repos
  const activePool = useMemo(() => {
    return (repos || []).filter((r) => !r.is_retired);
  }, [repos]);

  // Repos needing decision
  const undecidedRepos = useMemo(() => {
    return activePool.filter((r) => !r.meta?.decision);
  }, [activePool]);

  // Unique languages and tags for filters
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const r of activePool) {
      if (r.language) langs.add(r.language);
    }
    return Array.from(langs).sort();
  }, [activePool]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of activePool) {
      if (r.meta?.label) tags.add(r.meta.label);
    }
    return Array.from(tags).sort();
  }, [activePool]);

  // Filter Active Pool
  const filteredRepos = useMemo(() => {
    let result = [...activePool];

    // Search query
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          (r.meta?.label && r.meta.label.toLowerCase().includes(q)) ||
          (r.language && r.language.toLowerCase().includes(q)) ||
          (r.explanation?.message && r.explanation.message.toLowerCase().includes(q))
      );
    }

    // Language
    if (filters.language !== 'all') {
      result = result.filter((r) => r.language === filters.language);
    }

    // Verdict
    if (filters.verdict === 'undecided') {
      result = result.filter((r) => !r.meta?.decision);
    } else if (filters.verdict !== 'all') {
      result = result.filter((r) => r.meta?.decision === filters.verdict);
    }

    // Tag
    if (filters.tag !== 'all') {
      result = result.filter((r) => r.meta?.label === filters.tag);
    }

    // Activity Range
    if (filters.activityRange !== 'all') {
      const now = Date.now();
      result = result.filter((r) => {
        if (!r.last_commit_at) return filters.activityRange === 'dormant';
        const days = Math.floor((now - new Date(r.last_commit_at).getTime()) / 864e5);
        if (filters.activityRange === 'week') return days <= 7;
        if (filters.activityRange === 'month') return days > 7 && days <= 30;
        if (filters.activityRange === 'quarter') return days > 30 && days <= 90;
        if (filters.activityRange === 'dormant') return days > 90;
        return true;
      });
    }

    return result;
  }, [activePool, filters]);

  // Categorize into the 4 Requested Time Sections:
  // 1. "This week" (<= 7 days)
  // 2. "This month" (8 - 30 days)
  // 3. "Last 3 months" (31 - 90 days)
  // 4. "Dormant" (> 90 days or no commits)
  const sections = useMemo(() => {
    const now = Date.now();
    const thisWeek: Repository[] = [];
    const thisMonth: Repository[] = [];
    const last3Months: Repository[] = [];
    const dormant: Repository[] = [];

    for (const r of filteredRepos) {
      if (!r.last_commit_at) {
        dormant.push(r);
        continue;
      }
      const days = Math.floor((now - new Date(r.last_commit_at).getTime()) / 864e5);
      if (days <= 7) {
        thisWeek.push(r);
      } else if (days <= 30) {
        thisMonth.push(r);
      } else if (days <= 90) {
        last3Months.push(r);
      } else {
        dormant.push(r);
      }
    }

    return [
      {
        key: 'this-week',
        title: 'This week',
        subtitle: 'Committed within 7 days',
        color: 'var(--heat-active)',
        repos: thisWeek,
      },
      {
        key: 'this-month',
        title: 'This month',
        subtitle: '8 to 30 days ago',
        color: 'var(--heat-cooling)',
        repos: thisMonth,
      },
      {
        key: 'last-3-months',
        title: 'Last 3 months',
        subtitle: '31 to 90 days ago',
        color: 'var(--heat-stale)',
        repos: last3Months,
      },
      {
        key: 'dormant',
        title: 'Dormant',
        subtitle: 'No commits in over 90 days',
        color: 'var(--heat-dead)',
        repos: dormant,
      },
    ];
  }, [filteredRepos]);

  // Flattened virtual items list for high-performance rendering (1000+ repos)
  const virtualItems: SectionItem[] = useMemo(() => {
    const list: SectionItem[] = [];

    for (const sec of sections) {
      if (sec.repos.length === 0) continue;
      const isCollapsed = Boolean(collapsedSections[sec.key]);

      // Header item
      list.push({
        type: 'header',
        sectionKey: sec.key,
        headerData: {
          title: sec.title,
          subtitle: sec.subtitle,
          count: sec.repos.length,
          repos: sec.repos,
          color: sec.color,
          isCollapsed,
        },
      });

      // Row items if section not collapsed
      if (!isCollapsed) {
        for (const repo of sec.repos) {
          list.push({
            type: 'row',
            sectionKey: sec.key,
            repo,
          });
        }
      }
    }

    return list;
  }, [sections, collapsedSections]);

  // Virtualizer instance for List mode (1000+ repos support)
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => listContainerRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      return item?.type === 'header' ? 44 : 52;
    },
    overscan: 12,
  });

  // Bulk Actions Handlers
  const handleBulkDecision = async (decision: 'keep' | 'pause' | 'retire') => {
    if (!onDecision || selectedRepoIds.size === 0) return;
    const count = selectedRepoIds.size;
    const actionWord = decision === 'keep' ? 'Kept' : decision === 'pause' ? 'Paused' : 'Retired';
    toast.info(`${actionWord} ${count} repositories`);

    for (const id of Array.from(selectedRepoIds)) {
      await onDecision(id, decision);
    }
    setSelectedRepoIds(new Set());
  };

  const handleBulkTag = async (tag: string) => {
    if (!onUpdateLabel || selectedRepoIds.size === 0) return;
    for (const id of Array.from(selectedRepoIds)) {
      await onUpdateLabel(id, tag);
    }
    setSelectedRepoIds(new Set());
    toast.success(`Applied tag "${tag}" to ${selectedRepoIds.size} repositories`);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcutsDialog((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shouldReduceMotion = useReducedMotion();

  if ((isSyncing || isLoading) && repos.length === 0) {
    return (
      <motion.div
        key="skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
      >
        <OverviewSkeletonV4 message="Syncing repositories and commit ledger from GitHub..." />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="ledger-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
      className="space-y-6 pb-20 font-sans"
    >
      {/* 1. "Needs a decision" Banner or "Ledger clear" Completion State */}
      {undecidedRepos.length > 0 ? (
        <div className="flex items-center justify-between gap-4 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-heat-cooling shrink-0" />
            <span className="text-neutral-11">
              <strong className="text-neutral-12 font-semibold">
                <AnimatedNumber value={undecidedRepos.length} />{' '}
                {undecidedRepos.length === 1 ? 'repository needs' : 'repositories need'} a decision.
              </strong>{' '}
              Review projects without a verdict to maintain focus.
            </span>
          </div>

          {onStartTriage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onStartTriage}
              className="gap-1.5 text-xs h-7 shrink-0"
            >
              <span>Start triage</span>
              <ArrowRight size={12} />
            </Button>
          )}
        </div>
      ) : activePool.length > 0 ? (
        /* "Ledger clear" completion state when all repos have a verdict */
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-verdict-keep-bg/30 border border-verdict-keep-border/60 rounded-xs text-xs shadow-subtle"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-5 rounded-full bg-verdict-keep-bg border border-verdict-keep-border flex items-center justify-center text-verdict-keep-text shrink-0">
              <CheckCheck size={13} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-neutral-12 font-semibold block sm:inline">
                Ledger clear · All <AnimatedNumber value={activePool.length} /> repositories have an active verdict.
              </span>{' '}
              <span className="text-neutral-9 font-normal">
                Your engineering attention is calibrated for the week.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-2xs font-mono text-neutral-10 shrink-0">
            <span className="px-2 py-0.5 rounded-xs bg-neutral-1 border border-neutral-4">
              <strong className="text-verdict-keep-text font-semibold">
                <AnimatedNumber value={activePool.filter((r) => r.meta?.decision === 'keep').length} />
              </strong> Kept
            </span>
            <span className="px-2 py-0.5 rounded-xs bg-neutral-1 border border-neutral-4">
              <strong className="text-verdict-pause-text font-semibold">
                <AnimatedNumber value={activePool.filter((r) => r.meta?.decision === 'pause').length} />
              </strong> Paused
            </span>
            <span className="px-2 py-0.5 rounded-xs bg-neutral-1 border border-neutral-4">
              <strong className="text-verdict-retire-text font-semibold">
                <AnimatedNumber value={repos.filter((r) => r.is_retired).length} />
              </strong> Retired
            </span>
          </div>
        </motion.div>
      ) : null}

      {/* 2. Top Summary Sentence (28px text, unboxed) */}
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-12 font-sans leading-tight">
          {summarySentence || `${activePool.length} repositories in ledger`}
        </h1>
        <p className="text-xs text-neutral-9 font-sans">
          Calibrated activity ledger grouped by recent commit cadence and velocity.
        </p>
      </div>

      {/* 3. Filter Bar (Search, Chips, Language, Verdict, Tag, Activity Range, View Switcher, Save View) */}
      <LedgerFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        uniqueLanguages={uniqueLanguages}
        uniqueTags={uniqueTags}
        searchInputRef={searchInputRef}
      />

      {/* 4. Main Content: Empty State, Virtualized List, Cards Grid, or Board */}
      {filteredRepos.length === 0 ? (
        <EmptyState
          title={filters.search ? 'No repositories found' : 'No active repositories'}
          description={
            filters.search
              ? `No repositories matched "${filters.search}". Reset your search or filters to see all repositories.`
              : 'All repositories have been retired or none match the active filters.'
          }
          icon={<Layers className="size-6 text-neutral-8" />}
          action={
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Reset filters
            </Button>
          }
        />
      ) : viewMode === 'board' ? (
        /* Board / Kanban View */
        <RepoBoard
          repos={filteredRepos}
          currentUsername={currentUsername}
          onOpenDetails={onOpenDetails}
          onDecision={onDecision || (async () => {})}
        />
      ) : viewMode === 'cards' ? (
        /* Cards View with Group Sections */
        <div className="space-y-8">
          {sections.map((sec) => {
            if (sec.repos.length === 0) return null;
            const isCollapsed = Boolean(collapsedSections[sec.key]);

            return (
              <section key={sec.key} className="space-y-3">
                <StickySectionHeader
                  title={sec.title}
                  subtitle={sec.subtitle}
                  count={sec.repos.length}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() =>
                    setCollapsedSections((prev) => ({ ...prev, [sec.key]: !prev[sec.key] }))
                  }
                  repos={sec.repos}
                  statusColor={sec.color}
                />

                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {sec.repos.map((repo) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        currentUsername={currentUsername}
                        isSelected={selectedRepoIds.has(repo.id)}
                        onToggleSelect={toggleSelectRepo}
                        onOpenDetails={onOpenDetails}
                        onDecision={onDecision || (async () => {})}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* Dense List View with Virtualized Rendering (1000+ repos support) */
        <div
          ref={listContainerRef}
          className="border-t border-neutral-4 min-h-[400px] overflow-visible"
        >
          {virtualItems.length > 80 ? (
            /* Virtualized Window for Large Lists */
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = virtualItems[virtualRow.index];
                if (!item) return null;

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {item.type === 'header' && item.headerData ? (
                      <StickySectionHeader
                        title={item.headerData.title}
                        subtitle={item.headerData.subtitle}
                        count={item.headerData.count}
                        isCollapsed={item.headerData.isCollapsed}
                        onToggleCollapse={() =>
                          setCollapsedSections((prev) => ({
                            ...prev,
                            [item.sectionKey]: !prev[item.sectionKey],
                          }))
                        }
                        repos={item.headerData.repos}
                        statusColor={item.headerData.color}
                      />
                    ) : item.repo ? (
                      <RepoRowDense
                        repo={item.repo}
                        currentUsername={currentUsername}
                        isSelected={selectedRepoIds.has(item.repo.id)}
                        onToggleSelect={toggleSelectRepo}
                        onOpenDetails={onOpenDetails}
                        onDecision={onDecision || (async () => {})}
                        onUpdateLabel={onUpdateLabel}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Direct Render with Sticky Headers for Standard Lists */
            <div className="space-y-6">
              {sections.map((sec) => {
                if (sec.repos.length === 0) return null;
                const isCollapsed = Boolean(collapsedSections[sec.key]);

                return (
                  <section key={sec.key} className="space-y-0">
                    <StickySectionHeader
                      title={sec.title}
                      subtitle={sec.subtitle}
                      count={sec.repos.length}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={() =>
                        setCollapsedSections((prev) => ({
                          ...prev,
                          [sec.key]: !prev[sec.key],
                        }))
                      }
                      repos={sec.repos}
                      statusColor={sec.color}
                    />

                    {!isCollapsed && (
                      <div className="border-t-0">
                        {sec.repos.map((repo) => (
                          <RepoRowDense
                            key={repo.id}
                            repo={repo}
                            currentUsername={currentUsername}
                            isSelected={selectedRepoIds.has(repo.id)}
                            onToggleSelect={toggleSelectRepo}
                            onOpenDetails={onOpenDetails}
                            onDecision={onDecision || (async () => {})}
                            onUpdateLabel={onUpdateLabel}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Floating Bulk Action Bar (Multi-select) */}
      <FloatingBulkActionBar
        selectedCount={selectedRepoIds.size}
        onBulkDecision={handleBulkDecision}
        onBulkTag={handleBulkTag}
        onClearSelection={handleClearSelection}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-2">
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Focus search input</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">/</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Open global command palette</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">⌘K / Ctrl+K</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-4">
              <span>Open repository detail drawer</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">Enter</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Toggle keyboard help</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-3 rounded-xs font-mono text-2xs">?</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
