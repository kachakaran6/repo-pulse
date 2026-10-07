import React from 'react';
import type { Repository } from '../types.js';

interface ArchiveViewProps {
  repos: Repository[];
  onBringBack: (repoId: number) => Promise<void>;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ repos, onBringBack }) => {
  const retiredRepos = repos.filter((r) => r.is_retired);

  if (retiredRepos.length === 0) {
    return (
      <div className="empty-state">
        <h2 className="empty-state-title">Archive is empty</h2>
        <p className="empty-state-desc">
          When you retire repositories in Triage, they will appear here in this ledger.
          You can restore any retired repository back to active status at any time.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          Archived Repositories
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
          Retired repositories kept out of daily focus. Click &quot;Bring back&quot; to unarchive.
        </p>
      </div>

      <table className="archive-table">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Last Commit</th>
            <th>Label</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {retiredRepos.map((repo) => {
            const commitDate = repo.last_commit_at
              ? new Date(repo.last_commit_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'No commits';

            return (
              <tr key={repo.id}>
                <td>
                  <a
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="repo-name-link"
                  >
                    {repo.full_name}
                  </a>
                  {repo.is_private && <span className="private-tag" style={{ marginLeft: '6px' }}>Private</span>}
                </td>
                <td className="tabular">{commitDate}</td>
                <td>
                  {repo.meta?.label ? (
                    <span className="label-chip">{repo.meta.label}</span>
                  ) : (
                    <span style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>—</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '13px' }}
                    onClick={() => onBringBack(repo.id)}
                  >
                    Bring back
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
