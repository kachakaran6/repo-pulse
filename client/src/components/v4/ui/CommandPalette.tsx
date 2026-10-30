import React, { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, CornerDownLeft, ArrowUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command or search...',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Group items by category
  const categories = Array.from(new Set(filteredItems.map((i) => i.category)));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? (filteredItems.length || 1) - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
        onOpenChange(false);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-modal-backdrop bg-neutral-12/40 backdrop-blur-[2px] animate-in fade-in-0 duration-fast" />
        <DialogPrimitive.Content
          aria-label="Command search palette"
          className="fixed left-[50%] top-[20%] z-modal w-full max-w-xl translate-x-[-50%] rounded-md border border-neutral-6 bg-neutral-3 text-neutral-12 shadow-modal outline-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-fast"
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Command Search Palette</DialogPrimitive.Title>
          {/* Search Header */}
          <div className="flex items-center border-b border-neutral-6 px-3.5 py-2.5">
            <Search className="size-4 text-neutral-9 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-neutral-12 placeholder:text-neutral-9 outline-none font-sans"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-neutral-9 hover:text-neutral-12 p-1 rounded-xs"
              >
                <X className="size-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center text-2xs font-mono text-neutral-9 border border-neutral-6 px-1.5 py-0.5 rounded-xs ml-2">
              ESC
            </kbd>
          </div>

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-9">
                No matching actions or commands found.
              </div>
            ) : (
              categories.map((category) => {
                const categoryItems = filteredItems.filter((i) => i.category === category);
                return (
                  <div key={category} className="space-y-1">
                    <div className="px-2.5 py-1 text-2xs font-mono font-semibold uppercase tracking-wider text-neutral-9">
                      {category}
                    </div>
                    {categoryItems.map((item) => {
                      const overallIndex = filteredItems.indexOf(item);
                      const isSelected = overallIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            item.onSelect();
                            onOpenChange(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(overallIndex)}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-xs text-xs cursor-pointer select-none transition-colors',
                            isSelected
                              ? 'bg-neutral-12 text-neutral-1 font-medium'
                              : 'text-neutral-11 hover:bg-neutral-4'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.icon && (
                              <span className={cn('size-4 shrink-0', isSelected ? 'text-neutral-1' : 'text-neutral-9')}>
                                {item.icon}
                              </span>
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.shortcut && (
                              <kbd
                                className={cn(
                                  'text-2xs font-mono px-1.5 py-0.5 rounded-xs border',
                                  isSelected
                                    ? 'border-neutral-10 bg-neutral-11 text-neutral-1'
                                    : 'border-neutral-6 bg-neutral-2 text-neutral-9'
                                )}
                              >
                                {item.shortcut}
                              </kbd>
                            )}
                            {isSelected && <CornerDownLeft className="size-3 text-neutral-1" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="flex items-center justify-between border-t border-neutral-6 bg-neutral-2 px-3.5 py-1.5 text-2xs font-mono text-neutral-9">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ArrowUpDown className="size-3" /> Navigate
              </span>
              <span>&crarr; Select</span>
            </div>
            <span>RepoPulse Global Commands</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
