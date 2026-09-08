"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { EpisodeCard } from "./EpisodeCard";
import { EpisodeNavigation } from "./EpisodeNavigation";
import type { MockEpisode } from "@/features/watch/data/mock-data";

interface EpisodeListProps {
  episodes: MockEpisode[];
  selectedEpisodeNumber: number;
  onEpisodeSelect: (episode: MockEpisode) => void;
}

export function EpisodeList({
  episodes,
  selectedEpisodeNumber,
  onEpisodeSelect,
}: EpisodeListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 10);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative">
      <EpisodeNavigation
        canScrollPrev={canScrollPrev}
        canScrollNext={canScrollNext}
        onScrollPrev={() => scroll("prev")}
        onScrollNext={() => scroll("next")}
      />

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            isSelected={episode.number === selectedEpisodeNumber}
            onSelect={onEpisodeSelect}
          />
        ))}
      </div>
    </div>
  );
}
