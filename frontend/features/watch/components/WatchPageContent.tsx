"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { WatchPlayer } from "./WatchPlayer";
import { EpisodeSelector } from "./EpisodeSelector";
import { YouMightLike } from "./YouMightLike";
import { useWatch } from "../hooks/useWatch";

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
  const animeIdNumber = Number(animeId);
  const seasonNumber = Number(season) || 1;
  const episodeNumber = Number(episode) || 1;

  const {
    anime,
    seasons,
    episodes,
    selectedEpisode,
    stream,
    isEpisodesLoading,
    isStreamLoading,
    episodesError,
    streamError,
    selectEpisode,
    selectSeason,
    previousEpisode,
    nextEpisode,
  } = useWatch(
    animeIdNumber,
    seasonNumber,
    episodeNumber
  );

  const handleEpisodeSelect = useCallback(
    (ep: { id: number }) => {
      selectEpisode(ep.id);
    },
    [selectEpisode]
  );

  const handleSeasonChange = useCallback(
    (value: string) => {
      selectSeason(Number(value));
    },
    [selectSeason]
  );

  if (isEpisodesLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">
          Loading episodes...
        </p>
      </div>
    );
  }

  if (episodesError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">
          {episodesError}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <nav
        className="px-4 md:px-8 lg:px-12 pt-20 md:pt-22 pb-3"
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-1 md:gap-1.5 text-xs md:text-[13px] flex-wrap">
          <li>
            <Link
              href="/"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Home
            </Link>
          </li>

          <li className="flex items-center gap-1 md:gap-1.5">
            <ChevronRight className="size-3 text-white/30" />

            <Link
              href="/"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Anime
            </Link>
          </li>

          <li className="flex items-center gap-1 md:gap-1.5">
            <ChevronRight className="size-3 text-white/30" />

            <Link
              href={`/anime/${animeId}`}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              {anime?.title ?? "Anime"}
            </Link>
          </li>

          <li className="flex items-center gap-1 md:gap-1.5">
            <ChevronRight className="size-3 text-white/30" />

            <span className="text-white/50">
              Season {seasonNumber}
            </span>
          </li>

          <li className="flex items-center gap-1 md:gap-1.5">
            <ChevronRight className="size-3 text-white/30" />

            <span className="text-[#e63946] font-medium">
              Episode {selectedEpisode?.number ?? episodeNumber}
            </span>
          </li>
        </ol>
      </nav>

      {/* Video Player */}
      <WatchPlayer
        posterImage={anime?.bannerImage ?? undefined}
        stream={stream}
        isLoading={isStreamLoading}
        error={streamError}
        onPreviousEpisode={previousEpisode}
        onNextEpisode={nextEpisode}
      />

      {/* Episodes */}
      <div className="px-4 md:px-8 lg:px-12">
        <EpisodeSelector
          episodes={episodes}
          seasons={seasons}
          selectedEpisodeNumber={
            selectedEpisode?.number ?? episodeNumber
          }
          selectedSeason={String(seasonNumber)}
          totalEpisodes={episodes.length}
          onEpisodeSelect={handleEpisodeSelect}
          onSeasonChange={handleSeasonChange}
        />

        <div className="border-t border-white/5" />

        <YouMightLike recommendations={[]} />
      </div>
    </div>
  );
}