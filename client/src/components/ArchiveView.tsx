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
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Archive is empty</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', maxWidth: '440px', margin: '0 auto' }}>
          When you retire repositories in Triage, they will be listed here. You can bring any repository back to the active ledger at any time.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Archived Repositories
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          Retired repositories kept out of daily focus. Click &quot;Bring back&quot; to restore to active status.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--line)' }}>
        {retiredRepos.map((repo) => {
          const commitDate = repo.last_commit_at
            ? new Date(repo.last_commit_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'No commits';

          return (
            <div
              key={repo.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <a
                  href={`https://github.com/${repo.full_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                >
                  {repo.full_name}
                </a>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--ink-2)' }}>
                  <span>Last commit {commitDate}</span>
                  {repo.meta?.label && (
                    <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      {repo.meta.label}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-outline"
                style={{ padding: '4px 12px', fontSize: '13px' }}
                onClick={() => onBringBack(repo.id)}
              >
                Bring back
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
