"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { Episode } from "@/features/watch/api/services/episode.service";
import { cn } from "@/shared/lib/utils";

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: (episode: Episode) => void;
}

export function EpisodeCard({
  episode,
  isSelected,
  onSelect,
}: EpisodeCardProps) {
  const title = episode.title || `Episode ${episode.number}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(episode)}
      className={cn(
        "group relative aspect-video w-full rounded-xl overflow-hidden text-left outline-none select-none cursor-pointer bg-neutral-900 transition-all duration-200",
        isSelected
          ? "border border-white shadow-[0_0_14px_rgba(255,255,255,0.18)]"
          : "border border-white/10 hover:border-white/25 hover:brightness-105"
      )}
      aria-label={`Play ${title}`}
      aria-current={isSelected ? "true" : undefined}
    >
      {/* Thumbnail image */}
      {episode.thumbnail ? (
        <Image
          src={episode.thumbnail}
          alt={title}
          fill
          sizes="(max-width: 640px) 60vw, (max-width: 768px) 38vw, (max-width: 1024px) 28vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          <Play className="size-6 text-white/20" />
        </div>
      )}

      {/* Cinematic dark gradient at the bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

      {/* Title (bottom-left) and Episode number (bottom-right) inside thumbnail */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-baseline justify-between gap-3 px-3.5 pb-2.5 pt-6 pointer-events-none">
        <span
          className="text-xs sm:text-sm font-medium text-white truncate drop-shadow-sm tracking-tight"
          title={title}
        >
          {title}
        </span>

        <span className="text-xs sm:text-sm font-semibold text-white/80 shrink-0 tabular-nums drop-shadow-sm">
          {episode.number}
        </span>
      </div>
    </button>
  );
}