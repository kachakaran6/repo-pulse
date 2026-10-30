import React from 'react';
import { Search } from 'lucide-react';

export interface FloatingSearchButtonV4Props {
  onClick: () => void;
}

export const FloatingSearchButtonV4: React.FC<FloatingSearchButtonV4Props> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 z-30 size-12 min-w-[48px] min-h-[48px] rounded-full bg-neutral-12 text-neutral-1 flex items-center justify-center shadow-modal border border-neutral-10 active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-neutral-12 focus-visible:ring-offset-2 touch-manipulation"
      title="Search repositories (⌘K)"
      aria-label="Open search command palette"
    >
      <Search size={18} strokeWidth={2.25} />
    </button>
  );
};
