import React, { useState, useRef, useEffect } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  className,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSearch('');
      setHighlightedIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? (filteredOptions.length || 1) - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-expanded={open}
          aria-label={selectedOption?.label || placeholder}
          className={cn(
            'flex h-8.5 w-full items-center justify-between rounded-sm border bg-neutral-3 px-3 py-1.5 text-xs text-neutral-12 outline-none transition-colors duration-fast select-none',
            'hover:border-neutral-8',
            'focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2',
            'disabled:cursor-not-allowed disabled:bg-neutral-2 disabled:text-neutral-8 disabled:border-neutral-6',
            error ? 'border-activity-5' : 'border-neutral-6',
            className
          )}
        >
          <span className={cn('truncate', !selectedOption && 'text-neutral-9')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="size-3.5 text-neutral-9 shrink-0 ml-2" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-popover w-[var(--radix-popover-trigger-width)] min-w-[200px] overflow-hidden rounded-md border border-neutral-6 bg-neutral-3 text-neutral-12 shadow-popover outline-none animate-in fade-in-80"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center border-b border-neutral-6 px-2.5 py-1.5">
            <Search className="size-3.5 text-neutral-9 shrink-0 mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-neutral-12 placeholder:text-neutral-9 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-neutral-9 hover:text-neutral-12 p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-neutral-9 font-sans">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-xs px-2.5 py-1.5 text-xs outline-none transition-colors',
                      isHighlighted ? 'bg-neutral-4 text-neutral-12' : 'text-neutral-11',
                      isSelected && 'font-medium text-neutral-12'
                    )}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && <Check className="size-3.5 text-neutral-12 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
