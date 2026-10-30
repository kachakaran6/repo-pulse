import React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  className,
  name,
}: SegmentedControlProps<T>) {
  const generatedName = React.useId();
  const groupName = name || generatedName;

  return (
    <div
      role="radiogroup"
      aria-disabled={disabled}
      className={cn(
        'inline-flex items-center rounded-sm border border-neutral-6 bg-neutral-4 p-0.5 select-none',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const isOptDisabled = disabled || opt.disabled;

        return (
          <label
            key={opt.value}
            className={cn(
              'relative flex items-center justify-center gap-1.5 cursor-pointer rounded-xs transition-all duration-fast font-sans font-medium outline-none',
              size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-3 py-1 text-xs',
              isSelected
                ? 'bg-neutral-3 text-neutral-12 font-semibold shadow-subtle'
                : 'text-neutral-10 hover:text-neutral-12',
              isOptDisabled && 'cursor-not-allowed text-neutral-8'
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={opt.value}
              checked={isSelected}
              disabled={isOptDisabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.icon && <span className="size-3.5 shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
