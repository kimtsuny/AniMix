"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { MockEpisode } from "@/features/watch/data/mock-data";

interface EpisodeCardProps {
  episode: MockEpisode;
  isSelected: boolean;
  onSelect: (episode: MockEpisode) => void;
}

export function EpisodeCard({ episode, isSelected, onSelect }: EpisodeCardProps) {
  return (
    <button
      onClick={() => onSelect(episode)}
      className={`group relative flex-shrink-0 w-[160px] md:w-[180px] lg:w-[185px] text-left transition-all duration-200 ${
        isSelected ? "scale-[1.02]" : ""
      }`}
      aria-label={`Play ${episode.title}`}
      aria-current={isSelected ? "true" : undefined}
    >
      {/* Thumbnail container */}
      <div
        className={`relative aspect-[16/10] rounded-lg overflow-hidden mb-2 transition-all duration-200 ${
          isSelected
            ? "ring-2 ring-[#e63946] shadow-lg shadow-[#e63946]/20"
            : "ring-1 ring-white/10 hover:ring-white/25"
        }`}
      >
        <Image
          src={episode.thumbnail}
          alt={episode.title}
          fill
          sizes="(max-width: 768px) 160px, 185px"
          className="object-cover"
        />

        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Episode number — bottom left */}
        <span className="absolute bottom-2 left-2.5 text-white font-bold text-lg leading-none drop-shadow-lg">
          {episode.number}
        </span>

        {/* Duration — bottom right */}
        <span className="absolute bottom-2 right-2 text-white/80 text-[11px] font-medium bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {episode.duration}
        </span>

        {/* Play indicator for selected episode */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#e63946]/90 flex items-center justify-center shadow-lg">
              <Play className="size-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Hover play overlay */}
        {!isSelected && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Play className="size-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Selected indicator bar */}
      {isSelected && (
        <div className="w-full h-[2px] bg-[#e63946] rounded-full -mt-1 mb-1" />
      )}

      {/* Episode title */}
      <p
        className={`text-xs font-medium truncate transition-colors ${
          isSelected ? "text-[#e63946]" : "text-white/70 group-hover:text-white/90"
        }`}
      >
        {episode.title}
      </p>
    </button>
  );
}
