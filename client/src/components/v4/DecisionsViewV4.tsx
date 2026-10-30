import React, { useState, useMemo } from 'react';
import type { Repository, DecisionType } from '../../types.js';
import { Button } from './ui/Button.js';
import { EmptyState } from './ui/EmptyState.js';
import {
  Search,
  X,
  History,
  RotateCcw,
  ExternalLink,
  Check,
  Clock,
  Archive,
  Calendar,
  Tag,
} from 'lucide-react';
import { toast } from './ui/Toast.js';

interface DecisionsViewV4Props {
  repos: Repository[];
  onBringBack: (repoId: number) => Promise<void>;
  onDecision?: (repoId: number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
}

interface DecisionItem {
  repo: Repository;
  verdict: 'keep' | 'pause' | 'retire';
  dateStr: string;
  monthKey: string;
  monthLabel: string;
  reason: string;
}

export const DecisionsViewV4: React.FC<DecisionsViewV4Props> = ({
  repos,
  onBringBack,
  onDecision,
}) => {
  const [search, setSearch] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'keep' | 'pause' | 'retire'>('all');

  // Collect all decisions from repository records
  const allDecisions = useMemo(() => {
    const list: DecisionItem[] = [];

    for (const r of repos || []) {
      const decision = r.meta?.decision || (r.is_retired ? 'retire' : r.is_paused ? 'pause' : null);
      if (!decision) continue;

      const timestamp = r.meta?.decided_at || r.last_commit_at || new Date().toISOString();
      const d = new Date(timestamp);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      const reason =
        r.meta?.note ||
        (decision === 'retire'
          ? 'Retired to reduce maintenance overhead and declutter ledger.'
          : decision === 'pause'
          ? `Paused and snoozed${r.meta?.paused_until ? ` until ${r.meta.paused_until}` : ''}.`
          : 'Kept active as priority repository.');

      list.push({
        repo: r,
        verdict: decision as 'keep' | 'pause' | 'retire',
        dateStr,
        monthKey,
        monthLabel,
        reason,
      });
    }

    // Sort by timestamp newest first
    list.sort((a, b) => {
      const tA = new Date(a.repo.meta?.decided_at || a.repo.last_commit_at || 0).getTime();
      const tB = new Date(b.repo.meta?.decided_at || b.repo.last_commit_at || 0).getTime();
      return tB - tA;
    });

    return list;
  }, [repos]);

  // Filtered decisions
  const filteredDecisions = useMemo(() => {
    return allDecisions.filter((item) => {
      // Verdict filter
      if (filterVerdict !== 'all' && item.verdict !== filterVerdict) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          item.repo.full_name.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          (item.repo.meta?.label && item.repo.meta.label.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allDecisions, filterVerdict, search]);

  // Group by month
  const monthlyGroups = useMemo(() => {
    const map = new Map<string, { label: string; items: DecisionItem[] }>();

    for (const item of filteredDecisions) {
      if (!map.has(item.monthKey)) {
        map.set(item.monthKey, { label: item.monthLabel, items: [] });
      }
      map.get(item.monthKey)!.items.push(item);
    }

    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      items: val.items,
    }));
  }, [filteredDecisions]);

  const handleRestore = async (repoId: number) => {
    try {
      await onBringBack(repoId);
      toast.success('Restored repository to active ledger');
    } catch {
      toast.error('Failed to restore repository');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans animate-in fade-in duration-normal">
      {/* Page Header */}
      <div className="border-b border-neutral-4 pb-4 space-y-1">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-12 font-sans">
          Decisions Timeline
        </h1>
        <p className="text-xs text-neutral-9">
          Searchable audit log of repository verdicts, snoozes, and archival decisions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-8 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions by repository, reason, or tag..."
            aria-label="Search decisions by repository, reason, or tag"
            className="w-full h-8 pl-8 pr-7 text-xs font-mono bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 placeholder:text-neutral-8 focus:outline-none focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear decisions search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-8 hover:text-neutral-12 p-0.5 cursor-pointer touch-manipulation"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Verdict Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter decisions by verdict">
          {(['all', 'keep', 'pause', 'retire'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilterVerdict(v)}
              aria-pressed={filterVerdict === v}
              aria-label={`Filter by ${v} verdict`}
              className={`px-2.5 py-1 text-xs rounded-xs font-mono capitalize transition-all cursor-pointer touch-manipulation ${
                filterVerdict === v
                  ? 'bg-neutral-12 text-neutral-1 font-medium'
                  : 'bg-neutral-2 text-neutral-9 hover:text-neutral-12 border border-neutral-4'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredDecisions.length === 0 ? (
        <EmptyState
          title={search ? 'No matching decisions' : 'Zero decisions recorded'}
          description={
            search
              ? `No decisions matched "${search}". Clear your search query.`
              : 'Triage repositories in Triage mode to record Keep, Pause, or Retire decisions.'
          }
          icon={<History className="size-8 text-neutral-8" />}
          action={
            search ? (
              <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Timeline Grouped by Month */
        <div className="space-y-8 pt-2">
          {monthlyGroups.map((group) => (
            <section key={group.key} className="space-y-3">
              {/* Month Group Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between py-2 px-3 bg-neutral-1/95 backdrop-blur-md border-b border-neutral-4 text-xs font-semibold text-neutral-12">
                <span className="flex items-center gap-2">
                  <Calendar size={13} className="text-neutral-8" />
                  <span>{group.label}</span>
                </span>
                <span className="font-mono text-2xs text-neutral-8 tabular">
                  {group.items.length} {group.items.length === 1 ? 'decision' : 'decisions'}
                </span>
              </div>

              {/* Monthly Timeline Items */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-4">
                {group.items.map((item) => {
                  const verdictBadge =
                    item.verdict === 'keep'
                      ? 'border-verdict-keep-border text-verdict-keep-text bg-verdict-keep-bg'
                      : item.verdict === 'pause'
                      ? 'border-verdict-pause-border text-verdict-pause-text bg-verdict-pause-bg'
                      : 'border-verdict-retire-border text-verdict-retire-text bg-verdict-retire-bg';

                  const dotColor =
                    item.verdict === 'keep'
                      ? 'bg-verdict-keep-border'
                      : item.verdict === 'pause'
                      ? 'bg-verdict-pause-border'
                      : 'bg-verdict-retire-border';

                  return (
                    <div
                      key={item.repo.id}
                      className="relative p-4 border border-neutral-4 bg-neutral-1 hover:bg-neutral-2/40 rounded-xs space-y-2 transition-colors"
                    >
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[27px] top-4 size-2 rounded-full border border-neutral-1 ${dotColor}`}
                      />

                      {/* Header Line: Repo Name & Verdict Chip */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-neutral-12 truncate">
                              {item.repo.full_name}
                            </span>
                            <span
                              className={`text-2xs font-mono uppercase px-1.5 py-0.2 rounded-xs border font-medium ${verdictBadge}`}
                            >
                              {item.verdict}
                            </span>
                            {item.repo.meta?.label && (
                              <span className="text-2xs font-mono text-neutral-10 bg-neutral-3 px-1.5 py-0.2 rounded-xs">
                                {item.repo.meta.label}
                              </span>
                            )}
                          </div>
                          <span className="text-2xs font-mono text-neutral-8">{item.dateStr}</span>
                        </div>

                        {/* Action: Bring back or restore */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(item.repo.id)}
                            className="text-2xs h-6 px-2 gap-1 text-neutral-10 hover:text-neutral-12"
                          >
                            <RotateCcw size={11} />
                            <span>Restore</span>
                          </Button>
                          <a
                            href={`https://github.com/${item.repo.full_name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-xs text-neutral-8 hover:text-neutral-12 inline-flex"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      {/* Reason as Main Text */}
                      <p className="text-xs text-neutral-11 font-sans leading-relaxed pt-1">
                        {item.reason}
                      </p>

                      {/* Target date metadata if present */}
                      {item.repo.meta?.goal_date && (
                        <div className="text-2xs font-mono text-heat-active pt-0.5">
                          Milestone goal date: {item.repo.meta.goal_date}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
