import React, { useState, useEffect, useRef } from 'react';
import { SidebarV4 } from './SidebarV4.js';
import { HeaderV4 } from './HeaderV4.js';
import { BottomTabBarV4 } from './BottomTabBarV4.js';
import { FloatingSearchButtonV4 } from './FloatingSearchButtonV4.js';
import { CommandPalette, type CommandItem } from '../ui/CommandPalette.js';
import { CoachmarksV4 } from '../coachmarks/CoachmarksV4.js';
import { Toaster, toast } from '../ui/Toast.js';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus.js';
import { WifiOff, RefreshCw, Layers, CheckSquare, Archive, Share2, TrendingUp, Settings } from 'lucide-react';
import type { UserProfile, SummaryStats, SyncStatus } from '../../../types.js';
import type { AppTab } from '../../layout/AppSidebar.js';

export interface ShellV4Props {
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
  onSelectFilter?: (filterType: 'status' | 'tag', value: string) => void;
  children: React.ReactNode;
}

export const ShellV4: React.FC<ShellV4Props> = ({
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
  uiVersion = 'v4',
  wipLimit,
  activeKeepCount,
  wipLimitEnabled,
  onToggleUiVersion,
  onSelectFilter,
  children,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Scroll restoration map per tab
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef<AppTab>(activeTab);

  // Preserve scroll before tab change, and restore on switch
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Save scroll of previous tab
      scrollPositionsRef.current[prevTabRef.current] = scrollContainerRef.current.scrollTop;

      // Restore scroll of active tab (or top if unvisited)
      const targetScroll = scrollPositionsRef.current[activeTab] || 0;
      scrollContainerRef.current.scrollTop = targetScroll;
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K / '/' for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );

      // Cmd+K or Ctrl+K opens search from anywhere
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      // '/' opens search when not already typing
      else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  const triageCount = (stats?.coolingCount || 0) + (stats?.staleCount || 0);

  // Global Command Palette Items
  const commandItems: CommandItem[] = [
    {
      id: 'nav-ledger',
      title: 'Go to Repository Ledger',
      category: 'Navigation',
      shortcut: 'G L',
      icon: <Layers size={14} />,
      onSelect: () => onSelectTab('overview'),
    },
    {
      id: 'nav-triage',
      title: `Open Triage Queue (${triageCount} cooling/stale)`,
      category: 'Navigation',
      shortcut: 'G T',
      icon: <CheckSquare size={14} />,
      onSelect: () => onSelectTab('triage'),
    },
    {
      id: 'nav-decisions',
      title: 'Review Archived Decisions',
      category: 'Navigation',
      shortcut: 'G D',
      icon: <Archive size={14} />,
      onSelect: () => onSelectTab('archive'),
    },
    {
      id: 'nav-digest',
      title: 'Generate Share Digest Card',
      category: 'Navigation',
      shortcut: 'G S',
      icon: <Share2 size={14} />,
      onSelect: () => onSelectTab('share'),
    },
    {
      id: 'nav-analytics',
      title: 'View Commit Velocity Analytics',
      category: 'Navigation',
      shortcut: 'G A',
      icon: <TrendingUp size={14} />,
      onSelect: () => onSelectTab('analytics'),
    },
    {
      id: 'nav-settings',
      title: 'Open Settings & Thresholds',
      category: 'Navigation',
      shortcut: 'G ,',
      icon: <Settings size={14} />,
      onSelect: () => onSelectTab('settings'),
    },
    {
      id: 'action-sync',
      title: 'Sync GitHub Repositories Now',
      category: 'Actions',
      shortcut: 'S',
      icon: <RefreshCw size={14} />,
      onSelect: () => {
        onSync();
        toast.info('Sync initiated...');
      },
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-1 text-neutral-11 font-sans">
      <Toaster />

      {/* Screen Reader Global Live Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" id="app-live-region" />

      {/* Slim Collapsible Desktop Sidebar */}
      <SidebarV4
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        triageCount={triageCount}
        isDemoUser={user.login === 'demo-user' || user.login === 'demo-developer'}
        onSelectFilter={onSelectFilter}
      />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-verdict-pause-bg text-verdict-pause-text border-b border-verdict-pause-border px-4 py-1.5 text-xs flex items-center justify-between font-mono shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff size={13} />
              <span>Offline mode · Showing cached repository ledger</span>
            </div>
            <span className="text-2xs uppercase">Changes queued</span>
          </div>
        )}

        {/* Top Header Bar */}
        <HeaderV4
          activeTab={activeTab}
          user={user}
          lastSyncFinishedAt={lastSync?.finished_at}
          isSyncing={isSyncing}
          onSync={onSync}
          onSelectTab={onSelectTab}
          wipLimit={wipLimit}
          activeKeepCount={activeKeepCount}
          wipLimitEnabled={wipLimitEnabled}
          onSignOut={onSignOut}
          onSignOutAll={onSignOutAll}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenDesignTokens={onOpenDesignTokens}
          onOpenComponents={onOpenComponents}
          uiVersion={uiVersion}
          onToggleUiVersion={onToggleUiVersion}
        />

        {/* Scrollable Page Body with Smooth Route Transition */}
        <main
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative"
        >
          <div
            key={activeTab}
            className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-12 animate-in fade-in-40 duration-fast"
          >
            {children}
          </div>
        </main>

        {/* Mobile Floating Search Button */}
        <FloatingSearchButtonV4 onClick={() => setSearchOpen(true)} />

        {/* Mobile 4-Area Bottom Tab Bar */}
        <BottomTabBarV4
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          triageCount={triageCount}
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={commandItems}
      />

      {/* Subtle First-Run Coachmarks (shown once, dismissible) */}
      <CoachmarksV4 />
    </div>
  );
};
