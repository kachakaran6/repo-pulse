import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Share2,
  ListChecks,
  Archive,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AppTab = 'overview' | 'analytics' | 'triage' | 'archive' | 'settings' | 'share';

const NAV: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'share', label: 'Share cards', icon: Share2 },
  { id: 'triage', label: 'Triage', icon: ListChecks },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AppSidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  triageCount: number;
  isDemoUser?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  triageCount,
  isDemoUser,
}) => {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3">
        <a
          href="#overview"
          className="flex items-center gap-2 px-2 py-1 text-base font-bold tracking-tight text-sidebar-foreground no-underline"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('overview');
          }}
        >
          <img src="/repopulse-mark.svg" alt="" width={24} height={24} className="size-6 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">RepoPulse</span>
        </a>
        {isDemoUser && (
          <Badge variant="secondary" className="ml-2 group-data-[collapsible=icon]:hidden">
            Demo
          </Badge>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={activeTab === id}
                    onClick={() => onSelectTab(id)}
                    tooltip={label}
                    className={cn(activeTab === id && 'font-semibold')}
                  >
                    <Icon />
                    <span>{label}</span>
                    {id === 'triage' && triageCount > 0 && (
                      <SidebarMenuBadge className="tabular bg-primary text-primary-foreground">
                        {triageCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        Repository activity ledger
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
