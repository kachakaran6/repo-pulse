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
}) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{TAB_TITLES[activeTab]}</p>
      </div>
      <div className="flex items-center gap-3">
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
            <Button variant="ghost" size="icon" className="size-9 rounded-sm" id="user-menu-btn">
              <Avatar className="size-7">
                <AvatarImage src={user.avatar_url} alt={user.login} />
                <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              Signed in as <span className="font-semibold text-foreground">{user.login}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectTab('settings')}>Settings</DropdownMenuItem>
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
