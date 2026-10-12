"use client";

import { useEffect, useRef } from "react";
import type { EpisodeBatch } from "@/features/watch/utils/episodeBatching";
import { DEFAULT_BATCH_SIZE } from "@/features/watch/utils/episodeBatching";
import { cn } from "@/shared/lib/utils";

export interface EpisodeRangeSelectorProps {
  batches: EpisodeBatch[];
  activeBatchIndex: number;
  onSelectBatch: (batchIndex: number) => void;
}

export function EpisodeRangeSelector({
  batches,
  activeBatchIndex,
  onSelectBatch,
}: EpisodeRangeSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Keep the active batch button visible within the horizontal scroll container
  useEffect(() => {
    const container = containerRef.current;
    const button = activeButtonRef.current;
    if (!container || !button) return;

    const containerLeft = container.scrollLeft;
    const containerRight = containerLeft + container.clientWidth;
    const buttonLeft = button.offsetLeft;
    const buttonRight = buttonLeft + button.offsetWidth;

    if (buttonLeft < containerLeft || buttonRight > containerRight) {
      button.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeBatchIndex]);

  // Hide range selector completely whenever episodes.length <= 100 or when at most 1 batch exists.
  // Must return null so it leaves no empty space, borders, or placeholder elements.
  const totalEpisodes = batches?.reduce((sum, b) => sum + b.count, 0) ?? 0;
  if (!batches || batches.length <= 1 || totalEpisodes <= DEFAULT_BATCH_SIZE) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Episode range selector"
      className="relative w-full max-w-full min-w-0 overflow-x-auto scrollbar-hide py-1 -mx-0.5 px-0.5 mb-3 overscroll-x-contain"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 w-max">
        {batches.map((batch) => {
          const isSelected = batch.index === activeBatchIndex;

          return (
            <button
              key={batch.index}
              ref={isSelected ? activeButtonRef : null}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`Episodes ${batch.label}`}
              onClick={() => onSelectBatch(batch.index)}
              className={cn(
                "rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center py-1.5 md:py-2 px-3 md:px-3.5",
                isSelected
                  ? "bg-white/[0.08] text-white border border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  : "bg-white/[0.03] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] border border-white/[0.06]"
              )}
            >
              {batch.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
