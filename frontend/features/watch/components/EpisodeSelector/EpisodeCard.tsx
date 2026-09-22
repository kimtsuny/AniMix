"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { Episode } from "@/features/watch/api/services/episode.service";

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
  return (
    <button
      onClick={() => onSelect(episode)}
      className={`group relative flex-shrink-0 w-[160px] md:w-[180px] lg:w-[185px] text-left transition-all duration-200 ${
        isSelected ? "scale-[1.02]" : ""
      }`}
      aria-label={`Play ${episode.title ?? `Episode ${episode.number}`}`}
      aria-current={isSelected ? "true" : undefined}
    >
      <div
        className={`relative aspect-[16/10] rounded-lg overflow-hidden mb-2 transition-all duration-200 ${
          isSelected
            ? "ring-2 ring-[#e63946] shadow-lg shadow-[#e63946]/20"
            : "ring-1 ring-white/10 hover:ring-white/25"
        }`}
      >
        {episode.thumbnail ? (
          <Image
            src={episode.thumbnail}
            alt={
              episode.title ??
              `Episode ${episode.number}`
            }
            fill
            sizes="(max-width: 768px) 160px, 185px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-white/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span className="absolute bottom-2 left-2.5 text-white font-bold text-lg leading-none drop-shadow-lg">
          {episode.number}
        </span>

        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#e63946]/90 flex items-center justify-center shadow-lg">
              <Play className="size-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        )}

        {!isSelected && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Play className="size-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="w-full h-[2px] bg-[#e63946] rounded-full -mt-1 mb-1" />
      )}

      <p
        className={`text-xs font-medium truncate transition-colors ${
          isSelected
            ? "text-[#e63946]"
            : "text-white/70 group-hover:text-white/90"
        }`}
      >
        {episode.title ??
          `Episode ${episode.number}`}
      </p>
    </button>
  );
}