"use client";

import type { Season } from "@/features/watch/api/services/episode.service";
import { cn } from "@/shared/lib/utils";

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonChange,
}: SeasonSelectorProps) {
  if (!seasons || seasons.length === 0) {
    return null;
  }

  const selectedSeasonNumber = Number(selectedSeason);

  return (
    <div
      role="tablist"
      aria-label="Season selector"
      className="relative w-full overflow-x-auto scrollbar-hide py-1 -mx-0.5 px-0.5"
    >
      <div className="flex items-center gap-2 w-max">
        {seasons.map((season) => {
          const isSelected = season.number === selectedSeasonNumber;
          const label = season.title || `Season ${season.number}`;

          return (
            <button
              key={season.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSeasonChange(String(season.number))}
              className={cn(
                "rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center",
                isSelected
                  ? "px-5 py-2 md:py-2.5 bg-white/[0.08] text-white border border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                  : "px-3.5 py-1.5 md:py-2 bg-white/[0.03] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] border border-white/[0.06]"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}