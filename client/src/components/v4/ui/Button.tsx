import React, { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'outline'
  | 'verdict-keep'
  | 'verdict-pause'
  | 'verdict-retire';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium font-sans select-none transition-all duration-fast ease-standard outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2';

    const variants: Record<ButtonVariant, string> = {
      // Primary: high-contrast ink fill with paper text
      primary:
        'bg-neutral-12 text-neutral-1 border border-neutral-12 hover:opacity-90 active:scale-[0.99] shadow-subtle',
      // Secondary: quiet surface with hairline border
      secondary:
        'bg-neutral-3 text-neutral-11 border border-neutral-6 hover:bg-neutral-4 hover:border-neutral-7 hover:text-neutral-12 active:bg-neutral-5 active:scale-[0.99] shadow-subtle',
      // Ghost: flat, transparent background with quiet hover
      ghost:
        'bg-transparent text-neutral-10 border border-transparent hover:bg-neutral-4 hover:text-neutral-12 active:bg-neutral-5',
      // Destructive: ember background or border
      destructive:
        'bg-activity-5 text-neutral-1 border border-activity-5 hover:opacity-90 active:scale-[0.99] shadow-subtle',
      // Outline: transparent background with clear neutral border
      outline:
        'bg-transparent text-neutral-11 border border-neutral-7 hover:bg-neutral-4 hover:text-neutral-12 active:bg-neutral-5',
      // Verdict keep
      'verdict-keep':
        'bg-verdict-keep-bg text-verdict-keep-text border border-verdict-keep-border hover:opacity-90 font-semibold',
      // Verdict pause
      'verdict-pause':
        'bg-verdict-pause-bg text-verdict-pause-text border border-verdict-pause-border hover:opacity-90 font-semibold',
      // Verdict retire
      'verdict-retire':
        'bg-verdict-retire-bg text-verdict-retire-text border border-verdict-retire-border hover:opacity-90 font-semibold',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-7 px-2.5 text-xs rounded-sm gap-1.5',
      md: 'h-8.5 px-3.5 text-xs rounded-sm gap-2',
      lg: 'h-10 px-5 text-sm rounded-md gap-2.5',
      icon: 'size-8.5 p-0 rounded-sm',
      'icon-sm': 'size-7 p-0 rounded-sm',
    };

    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        whileTap={shouldReduceMotion || disabled || isLoading ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...(props as any)}
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
