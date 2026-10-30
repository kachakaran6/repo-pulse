import React, { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Search,
  CornerDownLeft,
  ArrowUpDown,
  X,
  FileCode,
  BookOpen,
  GitCommit,
  StickyNote,
  Scale,
  FolderTree,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { searchHybrid } from '../../../api.js';
import type { SearchScope, GroupedSearchResult, SearchResult } from '@shared';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  onSelectRepo?: (repoId: string | number) => void;
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
  onSelectRepo,
  placeholder = 'Type a command, or search code / repos ("JWT refresh", "billing sync")...',
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [groupedResults, setGroupedResults] = useState<GroupedSearchResult[]>([]);
  const [flatResults, setFlatResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands if query matches any action
  const filteredCommands = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setScope('all');
      setSelectedIndex(0);
      setGroupedResults([]);
      setFlatResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced natural language semantic search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGroupedResults([]);
      setFlatResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchHybrid(trimmed, scope);
        setGroupedResults(data.groupedByRepo || []);
        setFlatResults(data.results || []);
        setSelectedIndex(0);
      } catch {
        // Fallback gracefully on search error
        setGroupedResults([]);
        setFlatResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, scope]);

  // Combine items for keyboard navigation:
  // When semantic results exist, navigation operates on flatResults first, then commands.
  const totalNavigableCount = flatResults.length > 0 ? flatResults.length : filteredCommands.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (totalNavigableCount || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? (totalNavigableCount || 1) - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults.length > 0 && flatResults[selectedIndex]) {
        const selected = flatResults[selectedIndex];
        if (onSelectRepo) {
          onSelectRepo(selected.repoId);
        }
        onOpenChange(false);
      } else if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
        onOpenChange(false);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'source_code':
        return <FileCode className="size-3.5 text-blue-400" />;
      case 'readme':
        return <BookOpen className="size-3.5 text-emerald-400" />;
      case 'commits':
        return <GitCommit className="size-3.5 text-purple-400" />;
      case 'notes':
        return <StickyNote className="size-3.5 text-amber-400" />;
      case 'decisions':
        return <Scale className="size-3.5 text-indigo-400" />;
      case 'file_tree':
        return <FolderTree className="size-3.5 text-cyan-400" />;
      default:
        return <Sparkles className="size-3.5 text-neutral-9" />;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-modal-backdrop bg-neutral-12/40 backdrop-blur-[2px] animate-in fade-in-0 duration-fast" />
        <DialogPrimitive.Content
          aria-label="Command and Semantic Search Palette"
          className="fixed left-[50%] top-[15%] z-modal w-full max-w-2xl translate-x-[-50%] rounded-md border border-neutral-6 bg-neutral-3 text-neutral-12 shadow-modal outline-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-fast flex flex-col max-h-[80vh]"
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Command and Semantic Search Palette</DialogPrimitive.Title>

          {/* Search Header */}
          <div className="flex items-center border-b border-neutral-6 px-3.5 py-2.5 shrink-0">
            {isSearching ? (
              <Loader2 className="size-4 text-neutral-9 shrink-0 mr-2.5 animate-spin" />
            ) : (
              <Search className="size-4 text-neutral-9 shrink-0 mr-2.5" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-neutral-12 placeholder:text-neutral-9 outline-none font-sans"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setGroupedResults([]);
                  setFlatResults([]);
                }}
                className="text-neutral-9 hover:text-neutral-12 p-1 rounded-xs"
              >
                <X className="size-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center text-2xs font-mono text-neutral-9 border border-neutral-6 px-1.5 py-0.5 rounded-xs ml-2">
              ESC
            </kbd>
          </div>

          {/* Search Scope Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-neutral-6 bg-neutral-2 shrink-0 overflow-x-auto text-2xs font-mono">
            <span className="text-neutral-9 mr-1 font-semibold uppercase tracking-wider text-3xs">Scope:</span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'repos', label: 'README & Metadata' },
                { id: 'code', label: 'Source Code' },
                { id: 'notes', label: 'Notes & Decisions' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id as SearchScope)}
                className={cn(
                  'px-2 py-0.5 rounded-xs transition-colors cursor-pointer',
                  scope === s.id
                    ? 'bg-neutral-12 text-neutral-1 font-semibold'
                    : 'text-neutral-10 hover:bg-neutral-4'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Scrollable Results Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* 1. Semantic Search Results (Grouped by Repository) */}
            {groupedResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2.5 py-1 text-2xs font-mono font-semibold uppercase tracking-wider text-neutral-9 border-b border-neutral-5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-amber-500" /> Natural-Language Matches ({flatResults.length})
                  </span>
                  <span>Hybrid RRF Ranking</span>
                </div>

                {groupedResults.map((group) => (
                  <div key={group.repo.id} className="rounded-md border border-neutral-5 bg-neutral-2 overflow-hidden">
                    {/* Repository Group Header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-4 border-b border-neutral-5 text-xs font-semibold text-neutral-12">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{group.repo.full_name}</span>
                        {group.repo.language && (
                          <span className="text-2xs font-mono px-1.5 py-0.2 rounded-xs bg-neutral-3 text-neutral-10 border border-neutral-6">
                            {group.repo.language}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectRepo) onSelectRepo(group.repo.id);
                          onOpenChange(false);
                        }}
                        className="text-2xs text-neutral-9 hover:text-neutral-12 flex items-center gap-1 font-mono cursor-pointer"
                      >
                        Open repo <ExternalLink className="size-2.5" />
                      </button>
                    </div>

                    {/* Matching Chunks in this Repo */}
                    <div className="divide-y divide-neutral-5">
                      {group.matches.map((match) => {
                        const overallIndex = flatResults.indexOf(match);
                        const isSelected = overallIndex === selectedIndex;

                        return (
                          <div
                            key={match.id}
                            onClick={() => {
                              if (onSelectRepo) onSelectRepo(match.repoId);
                              onOpenChange(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(overallIndex)}
                            className={cn(
                              'p-2.5 text-xs cursor-pointer select-none transition-colors space-y-1',
                              isSelected
                                ? 'bg-neutral-12 text-neutral-1'
                                : 'text-neutral-11 hover:bg-neutral-3'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-medium truncate">
                                {getKindIcon(match.kind)}
                                <span className={cn('truncate', isSelected ? 'text-neutral-1' : 'text-neutral-12 font-semibold')}>
                                  {match.matchReason}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  'text-3xs font-mono px-1 rounded-xs border shrink-0',
                                  isSelected
                                    ? 'border-neutral-10 bg-neutral-11 text-neutral-1'
                                    : 'border-neutral-6 bg-neutral-1 text-neutral-9'
                                )}
                              >
                                {match.kind}
                              </span>
                            </div>

                            {/* Snippet Context */}
                            <p
                              className={cn(
                                'text-2xs font-mono line-clamp-2 leading-relaxed',
                                isSelected ? 'text-neutral-3' : 'text-neutral-10'
                              )}
                            >
                              {match.snippet}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Commands & Navigation List (shown when no query or query matches actions) */}
            {groupedResults.length === 0 && filteredCommands.length > 0 && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-2xs font-mono font-semibold uppercase tracking-wider text-neutral-9">
                  Global Actions & Navigation
                </div>
                {filteredCommands.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xs text-xs cursor-pointer select-none transition-colors',
                        isSelected
                          ? 'bg-neutral-12 text-neutral-1 font-medium'
                          : 'text-neutral-11 hover:bg-neutral-4'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon && (
                          <span className={cn('size-4 shrink-0', isSelected ? 'text-neutral-1' : 'text-neutral-9')}>
                            {item.icon}
                          </span>
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd
                            className={cn(
                              'text-2xs font-mono px-1.5 py-0.5 rounded-xs border',
                              isSelected
                                ? 'border-neutral-10 bg-neutral-11 text-neutral-1'
                                : 'border-neutral-6 bg-neutral-2 text-neutral-9'
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && <CornerDownLeft className="size-3 text-neutral-1" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Empty State */}
            {query.trim().length >= 2 && groupedResults.length === 0 && !isSearching && filteredCommands.length === 0 && (
              <div className="py-10 text-center text-xs text-neutral-9 space-y-1">
                <p>No matching code snippets, repositories, or commands found for "{query}".</p>
                <p className="text-2xs text-neutral-8 font-mono">
                  Try broader semantic terms (e.g. "auth", "token", "database", "pipeline")
                </p>
              </div>
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="flex items-center justify-between border-t border-neutral-6 bg-neutral-2 px-3.5 py-1.5 text-2xs font-mono text-neutral-9 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ArrowUpDown className="size-3" /> Navigate
              </span>
              <span>&crarr; Open</span>
            </div>
            <span>Hybrid Full-Text + Vector Search</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
