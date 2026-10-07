import React, { useState, useMemo } from 'react';
import type { Repository, RepoStatus } from '../types.js';
import { RepoRow } from './RepoRow.js';

interface OverviewViewProps {
  repos: Repository[];
  summarySentence: string;
  onOpenDetails: (repo: Repository) => void;
  onQuickLabel: (repo: Repository, label: string) => void;
  thresholds: { active: number; cooling: number; stale: number };
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  repos,
  summarySentence,
  onOpenDetails,
  onQuickLabel,
  thresholds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | RepoStatus>('all');

  // Filter out retired repos from main overview (they live in Archive)
  const nonRetiredRepos = useMemo(() => {
    return repos.filter((r) => !r.is_retired);
  }, [repos]);

  // Apply search query and status pill filter
  const filteredRepos = useMemo(() => {
    return nonRetiredRepos.filter((r) => {
      const matchesStatus = selectedFilter === 'all' || r.status === selectedFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        r.full_name.toLowerCase().includes(query) ||
        (r.meta?.label && r.meta.label.toLowerCase().includes(query)) ||
        (r.language && r.language.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [nonRetiredRepos, selectedFilter, searchQuery]);

  // Group by status
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
      {/* Rule-based Plain Summary Banner */}
      <div className="summary-banner">{summarySentence}</div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Filter by repository name, label, or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            All ({nonRetiredRepos.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedFilter === 'active' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('active')}
          >
            Active ({nonRetiredRepos.filter((r) => r.status === 'active').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedFilter === 'cooling' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('cooling')}
          >
            Cooling ({nonRetiredRepos.filter((r) => r.status === 'cooling').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedFilter === 'stale' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('stale')}
          >
            Stale ({nonRetiredRepos.filter((r) => r.status === 'stale').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedFilter === 'dead' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('dead')}
          >
            Dead ({nonRetiredRepos.filter((r) => r.status === 'dead').length})
          </button>
        </div>
      </div>

      {/* Status Group Sections */}
      {groups.map((group) => {
        if (selectedFilter !== 'all' && selectedFilter !== group.status) {
          return null;
        }

        if (group.repos.length === 0 && searchQuery) {
          return null;
        }

        return (
          <section key={group.status} className="status-group">
            <div className="group-header">
              <div className="group-title-wrap">
                <span className={`status-dot ${group.status}`} />
                <h2 className="group-title">{group.title}</h2>
                <span className="group-count num">({group.repos.length})</span>
              </div>
              <span className="group-desc">{group.desc}</span>
            </div>

            {group.repos.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '13px',
                  color: 'var(--ink-soft)',
                }}
              >
                No repositories currently in this group.
              </div>
            ) : (
              <div className="repo-list">
                {group.repos.map((repo) => (
                  <RepoRow
                    key={repo.id}
                    repo={repo}
                    onOpenDetails={onOpenDetails}
                    onQuickLabel={onQuickLabel}
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
