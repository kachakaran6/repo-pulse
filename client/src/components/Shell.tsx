import React from 'react';
import type { UserProfile, SummaryStats, SyncStatus } from '../types.js';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar, type AppTab } from './layout/AppSidebar.js';
import { AppHeader } from './layout/AppHeader.js';

interface ShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: UserProfile | null;
  stats: SummaryStats | null;
  lastSync: SyncStatus | null;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onSignOut: () => Promise<void>;
  onSignOutAll: () => Promise<void>;
  onOpenDesignTokens?: () => void;
  onOpenComponents?: () => void;
  uiVersion?: 'v3' | 'v4';
  wipLimit?: number | null;
  activeKeepCount?: number;
  wipLimitEnabled?: boolean;
  onToggleUiVersion?: () => void;
  onSelectRepo?: (repoId: string | number) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onSelectTab,
  user,
  stats,
  lastSync,
  onSync,
  isSyncing,
  onSignOut,
  onSignOutAll,
  onOpenDesignTokens,
  onOpenComponents,
  uiVersion,
  wipLimit,
  activeKeepCount,
  wipLimitEnabled,
  onToggleUiVersion,
  onSelectRepo,
  children,
}) => {
  const triageCount = (stats?.coolingCount || 0) + (stats?.staleCount || 0);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          triageCount={triageCount}
          isDemoUser={user.login === 'demo-user'}
        />
        <SidebarInset className="flex max-h-svh flex-col overflow-hidden">
          <AppHeader
            activeTab={activeTab}
            user={user}
            lastSyncFinishedAt={lastSync?.finished_at}
            isSyncing={isSyncing}
            onSync={onSync}
            onSelectTab={onSelectTab}
            onSignOut={onSignOut}
            onSignOutAll={onSignOutAll}
            onOpenDesignTokens={onOpenDesignTokens}
            onOpenComponents={onOpenComponents}
            uiVersion={uiVersion}
            onToggleUiVersion={onToggleUiVersion}
            wipLimit={wipLimit}
            activeKeepCount={activeKeepCount}
            wipLimitEnabled={wipLimitEnabled}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};
