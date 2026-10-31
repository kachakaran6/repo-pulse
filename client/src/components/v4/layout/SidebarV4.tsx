import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckSquare,
  Archive,
  Share2,
  TrendingUp,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Flame,
  Clock,
  Users,
  Moon,
  Tag,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import { SimpleTooltip } from '../ui/Tooltip.js';
import { Badge } from '../ui/Badge.js';
import { cn } from '@/lib/utils';
import type { AppTab } from '../../layout/AppSidebar.js';

export interface SidebarV4Props {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  triageCount: number;
  isDemoUser?: boolean;
  onSelectFilter?: (filterType: 'status' | 'tag', value: string) => void;
}

interface NavItem {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface SavedViewItem {
  label: string;
  status: string;
  icon: LucideIcon;
  color: string;
}

const STORAGE_KEY = 'repopulse_sidebar_collapsed';

export const SidebarV4: React.FC<SidebarV4Props> = ({
  activeTab,
  onSelectTab,
  triageCount,
  isDemoUser = false,
  onSelectFilter,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Ledger', icon: Layers },
    { id: 'triage', label: 'Triage', icon: CheckSquare, badge: triageCount },
    { id: 'archive', label: 'Decisions', icon: Archive },
    { id: 'share', label: 'Cards & Share', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const savedViews: SavedViewItem[] = [
    { label: 'Active Work', status: 'active', icon: Flame, color: 'text-activity-5' },
    { label: 'Cooling Down', status: 'cooling', icon: Clock, color: 'text-activity-3' },
    { label: 'Team Projects', status: 'shared', icon: Users, color: 'text-neutral-11' },
    { label: 'Dormant', status: 'dead', icon: Moon, color: 'text-activity-1' },
  ];

  const sampleTags = ['saas', 'infra', 'client', 'backend'];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-neutral-6 bg-neutral-2 select-none transition-all duration-normal ease-standard shrink-0 h-screen sticky top-0 z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Header Logo */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-neutral-6 shrink-0">
        <a
          href="#ledger"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('overview');
          }}
          className="flex items-center gap-2.5 text-neutral-12 font-bold no-underline overflow-hidden"
          title="RepoPulse Ledger"
        >
          <img src="/repopulse-mark.svg" alt="" width={22} height={22} className="size-5.5 shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm tracking-tight font-sans font-bold">RepoPulse</span>
              {isDemoUser && (
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-10">
                  Demo
                </span>
              )}
            </div>
          )}
        </a>

        <button
          type="button"
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="p-1.5 text-neutral-9 hover:text-neutral-12 hover:bg-neutral-4 rounded-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-12"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav Items Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-6">
        {/* Main Navigation */}
        <nav className="space-y-1" aria-label="Main application sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            const buttonContent = (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                data-coachmark={item.id === 'triage' ? 'triage-mode' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 text-xs rounded-sm transition-all duration-fast font-sans outline-none',
                  'focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
                  isActive
                    ? 'bg-neutral-3 text-neutral-12 font-semibold shadow-subtle border border-neutral-6'
                    : 'text-neutral-10 hover:bg-neutral-4 hover:text-neutral-12 border border-transparent'
                )}
              >
                <Icon size={16} className={cn('shrink-0', isActive ? 'text-neutral-12' : 'text-neutral-9')} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-2xs font-mono tabular rounded-full border',
                      item.id === 'triage'
                        ? 'bg-neutral-12 text-neutral-1 border-neutral-12'
                        : 'bg-neutral-4 text-neutral-10 border-neutral-6'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <SimpleTooltip key={item.id} side="right" content={item.badge ? `${item.label} (${item.badge})` : item.label}>
                  {buttonContent}
                </SimpleTooltip>
              );
            }

            return buttonContent;
          })}
        </nav>

        {/* Pinned Saved Views (Expanded Only) */}
        {!collapsed && (
          <div data-coachmark="saved-views" className="space-y-1.5 pt-2 border-t border-neutral-6/80">
            <span className="px-2.5 text-2xs font-mono uppercase tracking-wider text-neutral-9 block">
              Saved Views
            </span>
            <div className="space-y-0.5">
              {savedViews.map((sv) => {
                const SvIcon = sv.icon;
                return (
                  <button
                    key={sv.label}
                    type="button"
                    onClick={() => {
                      onSelectTab('overview');
                      onSelectFilter?.('status', sv.status);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-2xs text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 rounded-xs transition-colors text-left"
                  >
                    <SvIcon size={13} className={cn('shrink-0', sv.color)} />
                    <span className="truncate">{sv.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tag Shortcuts (Expanded Only) */}
        {!collapsed && (
          <div className="space-y-1.5 pt-2 border-t border-neutral-6/80">
            <span className="px-2.5 text-2xs font-mono uppercase tracking-wider text-neutral-9 block">
              Tag Shortcuts
            </span>
            <div className="flex flex-wrap gap-1 px-2">
              {sampleTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onSelectTab('overview');
                    onSelectFilter?.('tag', tag);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono text-neutral-10 bg-neutral-3 border border-neutral-6 rounded-xs hover:border-neutral-8 hover:text-neutral-12 transition-colors"
                >
                  <Hash size={10} className="text-neutral-9" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-neutral-6 text-2xs font-mono text-neutral-9 text-center shrink-0">
        {!collapsed ? 'Quiet Ledger · v4' : 'v4'}
      </div>
    </aside>
  );
};
