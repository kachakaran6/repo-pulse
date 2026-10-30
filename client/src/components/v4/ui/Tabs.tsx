import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'underline' | 'pill';
}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = 'underline', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-4 text-xs font-medium',
      variant === 'underline' && 'border-b border-neutral-6 pb-px w-full justify-start',
      variant === 'pill' && 'rounded-sm bg-neutral-4 p-1 border border-neutral-6',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'underline' | 'pill';
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant = 'underline', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap text-xs font-medium transition-all duration-fast outline-none select-none disabled:pointer-events-none disabled:opacity-40',
      'focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
      variant === 'underline' &&
        'py-2 px-1 text-neutral-10 border-b-2 border-transparent hover:text-neutral-12 data-[state=active]:border-neutral-12 data-[state=active]:text-neutral-12 data-[state=active]:font-semibold',
      variant === 'pill' &&
        'rounded-xs px-3 py-1 text-neutral-10 hover:text-neutral-12 data-[state=active]:bg-neutral-3 data-[state=active]:text-neutral-12 data-[state=active]:font-semibold data-[state=active]:shadow-subtle',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
