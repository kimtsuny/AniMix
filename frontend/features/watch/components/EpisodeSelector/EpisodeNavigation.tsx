"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface EpisodeNavigationProps {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onScrollPrev: () => void;
  onScrollNext: () => void;
}

export function EpisodeNavigation({
  canScrollPrev,
  canScrollNext,
  onScrollPrev,
  onScrollNext,
}: EpisodeNavigationProps) {
  return (
    <>
      {/* Previous button */}
      <button
        onClick={onScrollPrev}
        disabled={!canScrollPrev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/80 disabled:opacity-0 disabled:pointer-events-none hidden md:flex`}
        aria-label="Scroll to previous episodes"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Next button */}
      <button
        onClick={onScrollNext}
        disabled={!canScrollNext}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/80 disabled:opacity-0 disabled:pointer-events-none hidden md:flex`}
        aria-label="Scroll to next episodes"
      >
        <ChevronRight className="size-5" />
      </button>
    </>
  );
}
