import { WipLimitIndicator } from '../wip/WipLimitIndicator.js';
import React from 'react';
import type { UserProfile } from '../../types.js';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { AppTab } from './AppSidebar';

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
  overview: 'Overview',
  analytics: 'Analytics',
  share: 'Share cards',
  triage: 'Triage',
  archive: 'Archive',
  settings: 'Settings',
};

interface AppHeaderProps {
  activeTab: AppTab;
  user: UserProfile;
  lastSyncFinishedAt?: string | null;
  isSyncing: boolean;
  onSync: () => Promise<void>;
  onSelectTab: (tab: AppTab) => void;
  onSignOut: () => Promise<void>;
  onSignOutAll: () => Promise<void>;
  onOpenDesignTokens?: () => void;
  onOpenComponents?: () => void;
  uiVersion?: 'v3' | 'v4';
  wipLimit?: number | null;
  activeKeepCount?: number;
  wipLimitEnabled?: boolean;
  onToggleUiVersion?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  user,
  lastSyncFinishedAt,
  isSyncing,
  onSync,
  onSelectTab,
  onSignOut,
  onSignOutAll,
  onOpenDesignTokens,
  onOpenComponents,
  uiVersion,
  wipLimit,
  activeKeepCount,
  wipLimitEnabled = true,
  onToggleUiVersion,
}) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-6" />
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{TAB_TITLES[activeTab]}</p>
        {activeTab === 'overview' && wipLimitEnabled && (
          <WipLimitIndicator
            currentCount={activeKeepCount ?? 0}
            wipLimit={wipLimit}
            onClick={() => onSelectTab('settings')}
          />
        )}
        {onToggleUiVersion && (
          <button
            type="button"
            onClick={onToggleUiVersion}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-medium rounded-sm border border-neutral-6 bg-neutral-2 text-neutral-10 hover:text-neutral-12 hover:border-neutral-8 transition-colors"
            title="Toggle between UI v3 and UI v4 (?ui=v4)"
          >
            UI: <span className="font-semibold text-neutral-12">{uiVersion || 'v3'}</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {onOpenComponents && (
          <button
            type="button"
            onClick={onOpenComponents}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-sm border border-neutral-6 text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 transition-colors"
            title="Inspect Component Library (/components)"
          >
            Components
          </button>
        )}
        {onOpenDesignTokens && (
          <button
            type="button"
            onClick={onOpenDesignTokens}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-sm border border-neutral-6 text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 transition-colors"
            title="Inspect Design Tokens (/design-tokens)"
          >
            Tokens
          </button>
        )}
        <span className="hidden text-xs text-muted-foreground tabular sm:inline">
          {isSyncing ? 'Syncing repositories…' : formatRelativeSyncTime(lastSyncFinishedAt)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onSync()} disabled={isSyncing} id="sync-btn">
          Sync
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-sm"
              id="user-menu-btn"
              aria-label={`${user.login.slice(0, 2).toUpperCase()} - User account menu for ${user.login}`}
            >
              <Avatar className="size-7" aria-hidden="true">
                <AvatarImage src={user.avatar_url} alt="" />
                <AvatarFallback aria-hidden="true">{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              Signed in as <span className="font-semibold text-foreground">{user.login}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectTab('settings')}>Settings</DropdownMenuItem>
            {onOpenComponents && (
              <DropdownMenuItem onClick={onOpenComponents}>Component library</DropdownMenuItem>
            )}
            {onOpenDesignTokens && (
              <DropdownMenuItem onClick={onOpenDesignTokens}>Design tokens</DropdownMenuItem>
            )}
            {onToggleUiVersion && (
              <DropdownMenuItem onClick={onToggleUiVersion}>
                Switch UI ({uiVersion === 'v4' ? 'use v3' : 'use v4'})
              </DropdownMenuItem>
            )}
            <DropdownMenuItem id="signout-btn" onClick={() => onSignOut()}>
              Sign out
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onSignOutAll()}
            >
              Sign out everywhere
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
