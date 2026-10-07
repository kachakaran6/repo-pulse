import React, { useState, useMemo } from 'react';
import type { Repository, RepoStatus } from '../types.js';
import { RepoRow } from './RepoRow.js';

interface OverviewViewProps {
  repos: Repository[];
  summarySentence: string;
  currentUsername?: string;
  onOpenDetails: (repo: Repository) => void;
  thresholds: { active: number; cooling: number; stale: number };
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  repos,
  summarySentence,
  currentUsername,
  onOpenDetails,
  thresholds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | RepoStatus>('all');

  // Exclude retired repos from overview
  const activePool = useMemo(() => {
    return repos.filter((r) => !r.is_retired);
  }, [repos]);

  const activeCount = activePool.filter((r) => r.status === 'active').length;
  const coolingCount = activePool.filter((r) => r.status === 'cooling').length;
  const staleCount = activePool.filter((r) => r.status === 'stale').length;
  const deadCount = activePool.filter((r) => r.status === 'dead').length;
  const totalCount = activePool.length || 1;

  // Filter repos by search and status segment
  const filteredRepos = useMemo(() => {
    return activePool.filter((r) => {
      const matchesStatus = selectedFilter === 'all' || r.status === selectedFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.full_name.toLowerCase().includes(q) ||
        (r.meta?.label && r.meta.label.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [activePool, selectedFilter, searchQuery]);

  const groups: { status: RepoStatus; title: string; desc: string; repos: Repository[] }[] = [
    {
      status: 'active',
      title: 'Active',
      desc: `Committed within ${thresholds.active} days`,
      repos: filteredRepos.filter((r) => r.status === 'active'),
    },
    {
      status: 'cooling',
      title: 'Cooling',
      desc: `No commits in ${thresholds.active + 1}–${thresholds.cooling} days`,
      repos: filteredRepos.filter((r) => r.status === 'cooling'),
    },
    {
      status: 'stale',
      title: 'Stale',
      desc: `No commits in ${thresholds.cooling + 1}–${thresholds.stale} days`,
      repos: filteredRepos.filter((r) => r.status === 'stale'),
    },
    {
      status: 'dead',
      title: 'Dead',
      desc: `No commits in ${thresholds.stale}+ days or no activity recorded`,
      repos: filteredRepos.filter((r) => r.status === 'dead'),
    },
  ];

  return (
    <div>
      {/* 28px Summary Sentence (no box) */}
      <h1 className="overview-summary">{summarySentence}</h1>

      {/* Heat Bar Component (Replaces pill filter buttons) */}
      <div className="heat-bar-section">
        <div className="heat-bar" role="img" aria-label="Repository status breakdown bar">
          <div
            className="heat-segment active"
            style={{ width: `${(activeCount / totalCount) * 100}%` }}
            title={`Active: ${activeCount} repos`}
          />
          <div
            className="heat-segment cooling"
            style={{ width: `${(coolingCount / totalCount) * 100}%` }}
            title={`Cooling: ${coolingCount} repos`}
          />
          <div
            className="heat-segment stale"
            style={{ width: `${(staleCount / totalCount) * 100}%` }}
            title={`Stale: ${staleCount} repos`}
          />
          <div
            className="heat-segment dead"
            style={{ width: `${(deadCount / totalCount) * 100}%` }}
            title={`Dead: ${deadCount} repos`}
          />
        </div>

        {/* Heat Bar Interactive Filter Legend */}
        <div className="heat-legend">
          <button
            type="button"
            className="heat-legend-btn"
            aria-pressed={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            <strong>All</strong> <span className="tabular num">({activePool.length})</span>
          </button>

          <button
            type="button"
            className="heat-legend-btn"
            aria-pressed={selectedFilter === 'active'}
            onClick={() => setSelectedFilter(selectedFilter === 'active' ? 'all' : 'active')}
          >
            <span className="swatch-square active" />
            <span>Active</span>
            <span className="tabular num">({activeCount})</span>
          </button>

          <button
            type="button"
            className="heat-legend-btn"
            aria-pressed={selectedFilter === 'cooling'}
            onClick={() => setSelectedFilter(selectedFilter === 'cooling' ? 'all' : 'cooling')}
          >
            <span className="swatch-square cooling" />
            <span>Cooling</span>
            <span className="tabular num">({coolingCount})</span>
          </button>

          <button
            type="button"
            className="heat-legend-btn"
            aria-pressed={selectedFilter === 'stale'}
            onClick={() => setSelectedFilter(selectedFilter === 'stale' ? 'all' : 'stale')}
          >
            <span className="swatch-square stale" />
            <span>Stale</span>
            <span className="tabular num">({staleCount})</span>
          </button>

          <button
            type="button"
            className="heat-legend-btn"
            aria-pressed={selectedFilter === 'dead'}
            onClick={() => setSelectedFilter(selectedFilter === 'dead' ? 'all' : 'dead')}
          >
            <span className="swatch-square dead" />
            <span>Dead</span>
            <span className="tabular num">({deadCount})</span>
          </button>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          className="clean-input"
          placeholder="Search repositories by name, language, or label..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grouped Ledger Sections */}
      {groups.map((group) => {
        if (selectedFilter !== 'all' && selectedFilter !== group.status) {
          return null;
        }

        if (group.repos.length === 0 && searchQuery) {
          return null;
        }

        return (
          <section key={group.status} className="ledger-group">
            <div className="ledger-group-header">
              <div className="ledger-group-title">
                <span className={`swatch-square ${group.status}`} />
                <span>{group.title}</span>
                <span className="tabular num" style={{ color: 'var(--ink-2)', fontWeight: 400 }}>
                  ({group.repos.length})
                </span>
              </div>
              <span className="ledger-group-rule">{group.desc}</span>
            </div>

            {group.repos.length === 0 ? (
              <div style={{ padding: '16px 0', fontSize: '13px', color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>
                No repositories in this status group.
              </div>
            ) : (
              <div className="ledger-table">
                {group.repos.map((repo) => (
                  <RepoRow
                    key={repo.id}
                    repo={repo}
                    currentUsername={currentUsername}
                    onOpenDetails={onOpenDetails}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
