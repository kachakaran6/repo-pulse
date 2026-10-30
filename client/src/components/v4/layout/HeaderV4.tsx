import React from 'react';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  Sparkles,
  Command,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar.js';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '../ui/DropdownMenu.js';
import { SimpleTooltip } from '../ui/Tooltip.js';
import type { UserProfile } from '../../../types.js';
import type { AppTab } from '../../layout/AppSidebar.js';

function formatRelativeSyncTime(dateStr?: string | null): string {
  if (!dateStr) return 'Not synced yet';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Not synced yet';
  const diffMinutes = Math.floor((Date.now() - time) / 60000);
  if (diffMinutes <= 0) return 'Synced just now';
  if (diffMinutes === 1) return 'Synced 1 min ago';
  if (diffMinutes < 60) return `Synced ${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `Synced ${diffHours}h ago`;
}

const TAB_TITLES: Record<AppTab, string> = {
  overview: 'Ledger',
  analytics: 'Analytics',
  share: 'Digest',
  triage: 'Triage',
  archive: 'Decisions',
  settings: 'Settings',
};

export interface HeaderV4Props {
  activeTab: AppTab;
  user: UserProfile;
  lastSyncFinishedAt?: string | null;
  isSyncing: boolean;
  onSync: () => Promise<void>;
  onSelectTab: (tab: AppTab) => void;
  onSignOut: () => Promise<void>;
  onSignOutAll: () => Promise<void>;
  onOpenSearch: () => void;
  onOpenDesignTokens?: () => void;
  onOpenComponents?: () => void;
  uiVersion?: 'v3' | 'v4';
  onToggleUiVersion?: () => void;
}

export const HeaderV4: React.FC<HeaderV4Props> = ({
  activeTab,
  user,
  lastSyncFinishedAt,
  isSyncing,
  onSync,
  onSelectTab,
  onSignOut,
  onSignOutAll,
  onOpenSearch,
  onOpenDesignTokens,
  onOpenComponents,
  uiVersion = 'v4',
  onToggleUiVersion,
}) => {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains('dark');
    if (nextDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('repopulse-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('repopulse-theme', 'light');
    }
  };

  return (
    <header className="h-14 border-b border-neutral-6 bg-neutral-1/90 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-sticky shrink-0 select-none">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-neutral-9 hidden sm:inline">RepoPulse</span>
        <ChevronRight size={14} className="text-neutral-7 hidden sm:inline" />
        <h1 className="text-sm font-bold tracking-tight text-neutral-12 truncate font-sans">
          {TAB_TITLES[activeTab] || 'Ledger'}
        </h1>
      </div>

      {/* Center: Global Search Trigger Button */}
      <div className="flex-1 max-w-sm hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          data-coachmark="command-palette"
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-9 bg-neutral-3 border border-neutral-6 rounded-sm hover:border-neutral-8 hover:text-neutral-12 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-neutral-9 shrink-0" />
            <span className="truncate">Search repos, actions...</span>
          </div>
          <kbd className="text-2xs font-mono px-1.5 py-0.5 rounded-xs border border-neutral-6 bg-neutral-2 text-neutral-9">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </div>

      {/* Right Controls: Sync Status, Theme Toggle, User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Sync Status with relative time & quiet refresh icon */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-2xs text-neutral-10 font-mono"
        >
          <span className="hidden sm:inline tabular">
            {isSyncing ? 'Syncing repos…' : formatRelativeSyncTime(lastSyncFinishedAt)}
          </span>
          <button
            type="button"
            onClick={() => onSync()}
            disabled={isSyncing}
            aria-label="Refresh repository synchronization"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-9 hover:text-neutral-12 hover:bg-neutral-4 rounded-xs transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
            title="Trigger manual GitHub sync"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-6 mx-0.5" />

        {/* Subtle Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-9 hover:text-neutral-12 hover:bg-neutral-4 rounded-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 touch-manipulation"
          title="Toggle appearance (Light/Dark)"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Avatar Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${user.login.slice(0, 2).toUpperCase()} - User account menu for ${user.login}`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 focus-visible:ring-offset-2 touch-manipulation cursor-pointer"
            >
              <Avatar size="md" aria-hidden="true">
                <AvatarImage src={user.avatar_url} alt="" />
                <AvatarFallback aria-hidden="true">{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-2xs font-normal text-neutral-9">Signed in as</div>
              <div className="text-xs font-semibold text-neutral-12 font-sans truncate">
                @{user.login}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onSelectTab('settings')}>
              Settings
            </DropdownMenuItem>

            {onOpenComponents && (
              <DropdownMenuItem onClick={onOpenComponents}>
                Component Library
              </DropdownMenuItem>
            )}

            {onOpenDesignTokens && (
              <DropdownMenuItem onClick={onOpenDesignTokens}>
                Design Tokens
              </DropdownMenuItem>
            )}

            {onToggleUiVersion && (
              <DropdownMenuItem onClick={onToggleUiVersion}>
                UI Mode: <strong className="ml-1 uppercase font-mono text-neutral-12">{uiVersion}</strong>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onSignOut()}>
              Sign out
            </DropdownMenuItem>

            <DropdownMenuItem destructive onClick={() => onSignOutAll()}>
              Sign out everywhere
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
