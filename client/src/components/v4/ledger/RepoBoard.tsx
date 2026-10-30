import React, { useState } from 'react';
import type { Repository, DecisionType } from '../../../types.js';
import { motion, useReducedMotion } from 'framer-motion';
import { ScoreRing } from './ScoreRing.js';
import { LanguageDot } from './LanguageDot.js';
import { Lock, MoveRight, Check, Clock, Archive, HelpCircle } from 'lucide-react';
import { toast } from '../ui/Toast.js';

interface RepoBoardProps {
  repos: Repository[];
  currentUsername?: string;
  onOpenDetails: (repo: Repository) => void;
  onDecision: (repoId: number, decision: 'keep' | 'pause' | 'retire') => Promise<void>;
}

interface ColumnDef {
  key: 'undecided' | 'keep' | 'pause' | 'retire';
  title: string;
  desc: string;
  color: string;
  badgeBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'undecided',
    title: 'Needs Decision',
    desc: 'Unclassified repositories',
    color: 'text-neutral-11 border-neutral-6',
    badgeBg: 'bg-neutral-4 text-neutral-12',
  },
  {
    key: 'keep',
    title: 'Keep Going',
    desc: 'Active engineering focus',
    color: 'text-verdict-keep-text border-verdict-keep-border',
    badgeBg: 'bg-verdict-keep-bg text-verdict-keep-text',
  },
  {
    key: 'pause',
    title: 'Paused',
    desc: 'Snoozed projects',
    color: 'text-verdict-pause-text border-verdict-pause-border',
    badgeBg: 'bg-verdict-pause-bg text-verdict-pause-text',
  },
  {
    key: 'retire',
    title: 'Retired',
    desc: 'Archived from daily focus',
    color: 'text-verdict-retire-text border-verdict-retire-border',
    badgeBg: 'bg-verdict-retire-bg text-verdict-retire-text',
  },
];

export const RepoBoard: React.FC<RepoBoardProps> = ({
  repos,
  currentUsername,
  onOpenDetails,
  onDecision,
}) => {
  const [draggedRepoId, setDraggedRepoId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const getRepoColumn = (repo: Repository): 'undecided' | 'keep' | 'pause' | 'retire' => {
    if (repo.is_retired || repo.meta?.decision === 'retire') return 'retire';
    if (repo.is_paused || repo.meta?.decision === 'pause') return 'pause';
    if (repo.meta?.decision === 'keep') return 'keep';
    return 'undecided';
  };

  const handleDragStart = (e: React.DragEvent, repoId: number) => {
    setDraggedRepoId(repoId);
    e.dataTransfer.setData('text/plain', String(repoId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colKey) setDragOverColumn(colKey);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: 'undecided' | 'keep' | 'pause' | 'retire') => {
    e.preventDefault();
    setDragOverColumn(null);
    const repoIdStr = e.dataTransfer.getData('text/plain');
    const repoId = Number(repoIdStr);
    if (!repoId || isNaN(repoId)) return;

    if (targetCol === 'undecided') return; // Cannot drop back to undecided

    const targetRepo = repos.find((r) => r.id === repoId);
    if (targetRepo && getRepoColumn(targetRepo) !== targetCol) {
      toast.info(`Moved ${targetRepo.full_name} to ${targetCol}`);
      await onDecision(repoId, targetCol);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8 select-none">
      {COLUMNS.map((col) => {
        const colRepos = repos.filter((r) => getRepoColumn(r) === col.key);
        const isOver = dragOverColumn === col.key;

        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`flex flex-col bg-neutral-2/50 border rounded-xs p-3 min-h-[500px] transition-colors duration-fast ${
              isOver ? 'border-neutral-12 bg-neutral-3/70' : 'border-neutral-4'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans text-xs font-semibold text-neutral-12">{col.title}</h3>
                  <span className={`px-1.5 py-0.2 rounded-xs font-mono text-2xs font-medium ${col.badgeBg}`}>
                    {colRepos.length}
                  </span>
                </div>
                <p className="text-2xs text-neutral-8 font-sans mt-0.5">{col.desc}</p>
              </div>
            </div>

            {/* Column Cards List */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              {colRepos.length === 0 ? (
                <div className="h-32 flex items-center justify-center border border-dashed border-neutral-4 rounded-xs text-2xs text-neutral-8 font-mono">
                  Drop repos here
                </div>
              ) : (
                colRepos.map((repo) => {
                  let displayName = repo.full_name;
                  if (
                    currentUsername &&
                    displayName.toLowerCase().startsWith(`${currentUsername.toLowerCase()}/`)
                  ) {
                    displayName = displayName.substring(currentUsername.length + 1);
                  }

                  return (
                    <motion.div
                      key={repo.id}
                      layout={!shouldReduceMotion}
                      layoutId={`board-card-${repo.id}`}
                      transition={{ layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
                      draggable
                      onDragStart={(e: any) => handleDragStart(e, repo.id)}
                      onClick={() => onOpenDetails(repo)}
                      className="group p-3 bg-neutral-1 hover:bg-neutral-2/80 border border-neutral-4 hover:border-neutral-6 rounded-xs cursor-grab active:cursor-grabbing transition-colors space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-neutral-12 truncate">
                              {displayName}
                            </span>
                            {repo.is_private && <Lock size={10} className="text-neutral-8" />}
                          </div>
                          {repo.meta?.label && (
                            <span className="text-2xs font-mono text-neutral-10 bg-neutral-3 px-1 py-0.2 rounded-xs mt-0.5 inline-block">
                              {repo.meta.label}
                            </span>
                          )}
                        </div>
                        <ScoreRing repo={repo} size={24} strokeWidth={2} />
                      </div>

                      <div className="flex items-center justify-between text-2xs text-neutral-8 pt-1">
                        <LanguageDot language={repo.language} />
                        <span className="font-mono">{repo.weekly_commits}w commits</span>
                      </div>

                      {/* Quick Move Buttons (if not dragged) */}
                      {col.key === 'undecided' && (
                        <div
                          className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onDecision(repo.id, 'keep')}
                            className="flex-1 py-1 text-2xs border border-verdict-keep-border/50 text-verdict-keep-text rounded-xs hover:bg-verdict-keep-bg/40 font-mono text-center"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecision(repo.id, 'pause')}
                            className="flex-1 py-1 text-2xs border border-verdict-pause-border/50 text-verdict-pause-text rounded-xs hover:bg-verdict-pause-bg/40 font-mono text-center"
                          >
                            Pause
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecision(repo.id, 'retire')}
                            className="flex-1 py-1 text-2xs border border-verdict-retire-border/50 text-verdict-retire-text rounded-xs hover:bg-verdict-retire-bg/40 font-mono text-center"
                          >
                            Retire
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
