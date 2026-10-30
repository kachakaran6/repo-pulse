import React, { forwardRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isMono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error,
      isLoading,
      disabled,
      leftIcon,
      rightIcon,
      isMono = false,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-neutral-9">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled || isLoading}
            aria-invalid={hasError}
            aria-label={props['aria-label'] || (typeof props.placeholder === 'string' ? props.placeholder : undefined)}
            className={cn(
              'w-full h-8.5 px-3 py-1.5 text-xs text-neutral-12 placeholder:text-neutral-9 rounded-sm border bg-neutral-3 transition-colors duration-fast ease-standard outline-none',
              'hover:border-neutral-8',
              'focus-visible:border-neutral-12 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
              'disabled:bg-neutral-2 disabled:text-neutral-8 disabled:border-neutral-6 disabled:cursor-not-allowed',
              isMono ? 'font-mono tabular' : 'font-sans',
              hasError
                ? 'border-activity-5 focus-visible:outline-activity-5'
                : 'border-neutral-6',
              leftIcon ? 'pl-8' : '',
              rightIcon || isLoading || hasError ? 'pr-8' : '',
              className
            )}
            {...props}
          />

          <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-none">
            {isLoading && <Loader2 className="size-3.5 animate-spin text-neutral-9" />}
            {hasError && !isLoading && (
              <AlertCircle className="size-3.5 text-activity-5" aria-hidden="true" />
            )}
            {!isLoading && !hasError && rightIcon}
          </div>
        </div>

        {typeof error === 'string' && (
          <p className="text-2xs font-medium text-activity-5 flex items-center gap-1 mt-1 font-sans" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
