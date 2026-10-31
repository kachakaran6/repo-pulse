import React from 'react';
import { Layers, CheckSquare, Archive, Share2, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppTab } from '../../layout/AppSidebar.js';

export interface BottomTabBarV4Props {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  triageCount: number;
}

export const BottomTabBarV4: React.FC<BottomTabBarV4Props> = ({
  activeTab,
  onSelectTab,
  triageCount,
}) => {
  const tabs: { id: AppTab; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'overview', label: 'Ledger', icon: Layers },
    { id: 'triage', label: 'Triage', icon: CheckSquare, badge: triageCount },
    { id: 'share', label: 'Cards', icon: Share2 },
    { id: 'archive', label: 'Decisions', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-sticky border-t border-neutral-6 bg-neutral-1/95 backdrop-blur-md px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none"
      aria-label="Mobile Navigation"
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectTab(tab.id)}
            data-coachmark={tab.id === 'triage' ? 'triage-mode' : undefined}
            className={cn(
              'relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-0.5 text-2xs transition-colors font-sans outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 focus-visible:ring-inset rounded-xs touch-manipulation',
              isActive
                ? 'text-neutral-12 font-bold'
                : 'text-neutral-9 hover:text-neutral-11 font-medium'
            )}
          >
            <div className="relative">
              <Icon size={18} className={isActive ? 'text-neutral-12' : 'text-neutral-9'} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-2 px-1 py-0.2 min-w-3.5 text-[9px] font-mono tabular font-bold rounded-full bg-neutral-12 text-neutral-1 leading-tight text-center"
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="mt-1 leading-none text-[10px] sm:text-2xs truncate max-w-[60px] text-center">
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-neutral-12 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
