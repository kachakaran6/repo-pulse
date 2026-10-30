import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import {
  Search,
  X,
  List,
  LayoutGrid,
  Kanban,
  BookmarkPlus,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog.js';
import { Input } from '../ui/Input.js';
import { toast } from '../ui/Toast.js';

export type LedgerViewMode = 'list' | 'cards' | 'board';

export interface FilterState {
  search: string;
  language: string;
  verdict: string;
  tag: string;
  activityRange: string;
}

interface LedgerFilterBarProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  viewMode: LedgerViewMode;
  onViewModeChange: (mode: LedgerViewMode) => void;
  uniqueLanguages: string[];
  uniqueTags: string[];
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const LedgerFilterBar: React.FC<LedgerFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  uniqueLanguages,
  uniqueTags,
  searchInputRef,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [showExtendedFilters, setShowExtendedFilters] = useState(false);

  // Active filter chips
  const activeChips: { key: keyof FilterState; label: string; value: string }[] = [];
  if (filters.language && filters.language !== 'all') {
    activeChips.push({ key: 'language', label: 'Language', value: filters.language });
  }
  if (filters.verdict && filters.verdict !== 'all') {
    activeChips.push({ key: 'verdict', label: 'Verdict', value: filters.verdict });
  }
  if (filters.tag && filters.tag !== 'all') {
    activeChips.push({ key: 'tag', label: 'Tag', value: filters.tag });
  }
  if (filters.activityRange && filters.activityRange !== 'all') {
    activeChips.push({ key: 'activityRange', label: 'Activity', value: filters.activityRange });
  }

  const handleSaveViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveViewName.trim()) return;

    try {
      const stored = localStorage.getItem('repopulse_saved_views_custom');
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: Date.now().toString(),
        name: saveViewName.trim(),
        filters,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('repopulse_saved_views_custom', JSON.stringify(list));
      toast.success(`Saved view "${saveViewName.trim()}"`);
      setShowSaveModal(false);
      setSaveViewName('');
    } catch {
      toast.error('Failed to save view');
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Main Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search Input without box-shadow, 1px neutral line */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-8 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search repositories by name, tag, or description... ( / )"
            aria-label="Filter repositories by title, tag, or description"
            className="w-full h-9 sm:h-8 pl-8 pr-7 text-xs font-mono bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-12 placeholder:text-neutral-8 placeholder:font-sans focus:outline-none focus:border-neutral-12 focus:ring-1 focus:ring-neutral-12 transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              aria-label="Clear repository search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-8 hover:text-neutral-12 p-1.5 touch-manipulation cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* View Switcher and Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher: List, Cards, Board */}
          <div
            className="inline-flex rounded-xs border border-neutral-4 bg-neutral-2/70 p-0.5 select-none"
            role="group"
            aria-label="Ledger layout switcher"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="Dense List View"
              aria-label="Dense List View"
              aria-pressed={viewMode === 'list'}
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xs text-xs font-sans transition-all cursor-pointer touch-manipulation touch-target-expand ${
                viewMode === 'list'
                  ? 'bg-neutral-1 text-neutral-12 font-medium shadow-xs'
                  : 'text-neutral-9 hover:text-neutral-12'
              }`}
            >
              <List size={13} />
              <span className="hidden sm:inline">List</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              title="Cards Grid View"
              aria-label="Cards Grid View"
              aria-pressed={viewMode === 'cards'}
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xs text-xs font-sans transition-all cursor-pointer touch-manipulation touch-target-expand ${
                viewMode === 'cards'
                  ? 'bg-neutral-1 text-neutral-12 font-medium shadow-xs'
                  : 'text-neutral-9 hover:text-neutral-12'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              title="Verdict Kanban Board"
              aria-label="Verdict Kanban Board"
              aria-pressed={viewMode === 'board'}
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xs text-xs font-sans transition-all cursor-pointer touch-manipulation touch-target-expand ${
                viewMode === 'board'
                  ? 'bg-neutral-1 text-neutral-12 font-medium shadow-xs'
                  : 'text-neutral-9 hover:text-neutral-12'
              }`}
            >
              <Kanban size={13} />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          {/* Toggle Extended Filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExtendedFilters((prev) => !prev)}
            aria-expanded={showExtendedFilters}
            aria-controls="extended-filter-controls"
            className={`h-8 px-2 text-xs gap-1.5 touch-manipulation ${
              showExtendedFilters || activeChips.length > 0 ? 'bg-neutral-3 text-neutral-12' : ''
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Filters</span>
          </Button>

          {/* Save This View Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveModal(true)}
            aria-label="Save view"
            className="h-8 px-2 text-xs gap-1.5 text-neutral-9 hover:text-neutral-12 touch-manipulation"
          >
            <BookmarkPlus size={13} />
            <span className="hidden md:inline">Save view</span>
          </Button>
        </div>
      </div>

      {/* Extended Filters Bar */}
      {showExtendedFilters && (
        <div
          id="extended-filter-controls"
          role="region"
          aria-label="Advanced repository filters"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-neutral-2 border border-neutral-4 rounded-xs text-xs animate-in fade-in duration-fast"
        >
          {/* Verdict Filter */}
          <div>
            <label htmlFor="filter-verdict" className="block text-2xs text-neutral-8 uppercase font-mono mb-1">Verdict</label>
            <select
              id="filter-verdict"
              value={filters.verdict}
              onChange={(e) => onFilterChange({ verdict: e.target.value })}
              className="w-full h-8 px-2 bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-11 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-12"
            >
              <option value="all">All Verdicts</option>
              <option value="undecided">Undecided</option>
              <option value="keep">Keep</option>
              <option value="pause">Pause</option>
              <option value="retire">Retire</option>
            </select>
          </div>

          {/* Activity Range Filter */}
          <div>
            <label htmlFor="filter-activity" className="block text-2xs text-neutral-8 uppercase font-mono mb-1">Activity</label>
            <select
              id="filter-activity"
              value={filters.activityRange}
              onChange={(e) => onFilterChange({ activityRange: e.target.value })}
              className="w-full h-8 px-2 bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-11 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-12"
            >
              <option value="all">All Activity</option>
              <option value="week">This week (&le;7d)</option>
              <option value="month">This month (8-30d)</option>
              <option value="quarter">Last 3 months (31-90d)</option>
              <option value="dormant">Dormant (&gt;90d)</option>
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label htmlFor="filter-language" className="block text-2xs text-neutral-8 uppercase font-mono mb-1">Language</label>
            <select
              id="filter-language"
              value={filters.language}
              onChange={(e) => onFilterChange({ language: e.target.value })}
              className="w-full h-8 px-2 bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-11 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-12"
            >
              <option value="all">All Languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label htmlFor="filter-tag" className="block text-2xs text-neutral-8 uppercase font-mono mb-1">Tag</label>
            <select
              id="filter-tag"
              value={filters.tag}
              onChange={(e) => onFilterChange({ tag: e.target.value })}
              className="w-full h-8 px-2 bg-neutral-1 border border-neutral-5 rounded-xs text-neutral-11 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-12"
            >
              <option value="all">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Filter Chips Bar (Collapses filters into removable chips) */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-3 text-neutral-12 rounded-xs text-xs font-mono border border-neutral-4"
            >
              <span className="text-neutral-8 text-2xs uppercase">{chip.label}:</span>
              <span>{chip.value}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ [chip.key]: 'all' })}
                aria-label={`Remove ${chip.label} filter: ${chip.value}`}
                className="hover:text-neutral-12 text-neutral-7 p-1 cursor-pointer touch-manipulation"
                title={`Remove ${chip.label} filter`}
              >
                <X size={11} />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onResetFilters}
            className="text-2xs font-sans text-neutral-8 hover:text-neutral-12 underline ml-1 cursor-pointer touch-manipulation"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Save View Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveViewSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="save-view-name" className="text-xs font-mono text-neutral-10">
                View Name
              </label>
              <Input
                id="save-view-name"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="e.g. My Active TypeScript Projects"
                autoFocus
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!saveViewName.trim()}>
                Save View
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
