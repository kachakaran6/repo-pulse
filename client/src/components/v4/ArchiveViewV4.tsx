import React from 'react';
import type { Repository } from '../../types.js';
import { Button } from './ui/Button.js';
import { EmptyState } from './ui/EmptyState.js';
import { Archive, RotateCcw, ExternalLink } from 'lucide-react';

interface ArchiveViewV4Props {
  repos: Repository[];
  onBringBack: (repoId: number) => Promise<void>;
}

export const ArchiveViewV4: React.FC<ArchiveViewV4Props> = ({ repos, onBringBack }) => {
  const retiredRepos = (repos || []).filter((r) => r.is_retired);

  if (retiredRepos.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="Archive is empty"
          description="When you retire repositories in Triage, they will appear here. You can bring any repository back to the active ledger at any time."
          icon={<Archive className="size-8 text-neutral-8" />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-normal font-sans">
      {/* 1. Header (28px headline, no card box) */}
      <div className="border-b border-neutral-4 pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-12 font-sans">
          Archived Repositories
        </h1>
        <p className="text-xs text-neutral-9 mt-1">
          Retired projects kept out of daily focus and ledger metrics. Bring any project back to active tracking at any time.
        </p>
      </div>

      {/* 2. Hairline-Separated Rows */}
      <div className="divide-y divide-neutral-4 border-b border-neutral-4">
        {retiredRepos.map((repo) => {
          const commitDate = repo.last_commit_at
            ? new Date(repo.last_commit_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'No commits on record';

          return (
            <div
              key={repo.id}
              className="flex items-center justify-between gap-4 py-3 px-1 hover:bg-neutral-2/50 transition-colors duration-fast"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm font-medium text-neutral-12 hover:underline truncate"
                  >
                    {repo.full_name}
                  </a>
                  <ExternalLink size={12} className="text-neutral-8 shrink-0" />
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-9 font-sans">
                  <span>Last commit {commitDate}</span>
                  {repo.language && (
                    <>
                      <span className="text-neutral-6">·</span>
                      <span>{repo.language}</span>
                    </>
                  )}
                  {repo.meta?.label && (
                    <>
                      <span className="text-neutral-6">·</span>
                      <span className="font-mono text-neutral-11">{repo.meta.label}</span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBringBack(repo.id)}
                className="shrink-0 text-xs gap-1.5"
              >
                <RotateCcw size={12} />
                <span>Bring back</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
