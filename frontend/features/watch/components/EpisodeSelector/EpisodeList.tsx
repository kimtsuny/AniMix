"use client";

import { useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EpisodeCard } from "./EpisodeCard";
import type { Episode } from "@/features/watch/api/services/episode.service";

interface EpisodeListProps {
  episodes: Episode[];
  selectedEpisodeNumber: number;
  onEpisodeSelect: (episode: Episode) => void;
}

export function EpisodeList({
  episodes,
  selectedEpisodeNumber,
  onEpisodeSelect,
}: EpisodeListProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  useEffect(() => {
    if (!emblaApi || episodes.length === 0) return;
    const index = episodes.findIndex(
      (ep) => ep.number === selectedEpisodeNumber
    );
    if (index !== -1) {
      emblaApi.scrollTo(index);
    }
  }, [emblaApi, selectedEpisodeNumber, episodes]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="py-8 text-center text-white/40 text-sm">
        No episodes found.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Embla Carousel Viewport */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full -mx-1.5 px-1.5 py-1.5 -my-1.5"
      >
        <div className="flex gap-3 md:gap-3.5">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              className="shrink-0 min-w-0 basis-[58%] sm:basis-[38%] md:basis-[28%] lg:basis-[calc((100%-3.5rem)/5)]"
            >
              <EpisodeCard
                episode={episode}
                isSelected={episode.number === selectedEpisodeNumber}
                onSelect={onEpisodeSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}