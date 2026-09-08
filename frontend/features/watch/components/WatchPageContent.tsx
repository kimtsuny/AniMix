"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { WatchPlayer } from "./WatchPlayer";
import { EpisodeSelector } from "./EpisodeSelector";
import { YouMightLike } from "./YouMightLike";
import {
  MOCK_ANIME,
  MOCK_EPISODES,
  MOCK_RECOMMENDATIONS,
  MOCK_SEASONS,
  type MockEpisode,
} from "@/features/watch/data/mock-data";

interface WatchPageContentProps {
  animeId: string;
  season: string;
  episode: string;
}

export function WatchPageContent({
  animeId,
  season,
  episode,
}: WatchPageContentProps) {
  const currentEpisodeNumber = parseInt(episode, 10) || 12;
  const [selectedEpisode, setSelectedEpisode] = useState(currentEpisodeNumber);
  const [selectedSeason, setSelectedSeason] = useState(season || "1");

  const handleEpisodeSelect = useCallback((ep: MockEpisode) => {
    setSelectedEpisode(ep.number);
  }, []);

  const handlePreviousEpisode = useCallback(() => {
    setSelectedEpisode((prev) => Math.max(1, prev - 1));
  }, []);

  // Breadcrumb items
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Anime", href: "/" },
    { label: MOCK_ANIME.title, href: `/anime/${animeId}` },
    { label: `Season ${selectedSeason}`, href: "#" },
    { label: `Episode ${selectedEpisode}`, href: "#", active: true },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <nav
        className="px-4 md:px-8 lg:px-12 pt-20 md:pt-22 pb-3"
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-1 md:gap-1.5 text-xs md:text-[13px] flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center gap-1 md:gap-1.5">
              {index > 0 && (
                <ChevronRight className="size-3 text-white/30 flex-shrink-0" />
              )}
              {crumb.active ? (
                <span className="text-[#e63946] font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-white/50 hover:text-white/80 transition-colors truncate max-w-[150px] md:max-w-none"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Video Player */}
      <WatchPlayer
        posterImage={MOCK_ANIME.banner}
        onPreviousEpisode={handlePreviousEpisode}
      />

      {/* Episodes & You Might Like */}
      <div className="px-4 md:px-8 lg:px-12">
        <EpisodeSelector
          episodes={MOCK_EPISODES}
          seasons={MOCK_SEASONS}
          selectedEpisodeNumber={selectedEpisode}
          selectedSeason={selectedSeason}
          totalEpisodes={MOCK_EPISODES.length}
          onEpisodeSelect={handleEpisodeSelect}
          onSeasonChange={setSelectedSeason}
        />

        <div className="border-t border-white/5" />

        <YouMightLike recommendations={MOCK_RECOMMENDATIONS} />
      </div>
    </div>
  );
}
