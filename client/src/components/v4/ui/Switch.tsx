import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: React.ReactNode;
  description?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, disabled, id, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const control = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      disabled={disabled}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-fast outline-none',
        'bg-neutral-6',
        'focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
        'data-[state=checked]:bg-neutral-12',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-neutral-1 shadow-subtle ring-0 transition-transform duration-fast',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5'
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) {
    return control;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 select-none">
        {label && (
          <label
            htmlFor={switchId}
            className={cn(
              'text-xs font-medium text-neutral-11 cursor-pointer leading-tight',
              disabled && 'cursor-not-allowed text-neutral-8'
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-2xs text-neutral-9 leading-normal">{description}</p>
        )}
      </div>
      <div>{control}</div>
    </div>
  );
});

Switch.displayName = SwitchPrimitive.Root.displayName;
