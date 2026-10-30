import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
  description?: string;
  error?: boolean;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, error, disabled, id, ...props }, ref) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  const control = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={checkboxId}
      disabled={disabled}
      className={cn(
        'peer size-4 shrink-0 rounded-xs border transition-all duration-fast outline-none select-none',
        'border-neutral-7 bg-neutral-3',
        'hover:border-neutral-9',
        'focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
        'data-[state=checked]:bg-neutral-12 data-[state=checked]:text-neutral-1 data-[state=checked]:border-neutral-12',
        'data-[state=indeterminate]:bg-neutral-12 data-[state=indeterminate]:text-neutral-1 data-[state=indeterminate]:border-neutral-12',
        'disabled:cursor-not-allowed disabled:bg-neutral-2 disabled:border-neutral-6 disabled:opacity-50',
        error && 'border-activity-5',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3 stroke-[3]" />
        ) : (
          <Check className="size-3 stroke-[3]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label && !description) {
    return control;
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="pt-0.5">{control}</div>
      <div className="space-y-0.5 select-none">
        {label && (
          <label
            htmlFor={checkboxId}
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
    </div>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
