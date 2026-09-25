"use client";

import { useCallback } from "react";
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
    seasonNumber: activeSeasonNumber,
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

  /*
   * Episode card selection (in-place)
   */
  const handleEpisodeSelect = useCallback(
    (ep: { id: number }) => {
      selectEpisode(ep.id);
    },
    [selectEpisode]
  );

  /*
   * Season selection (in-place)
   */
  const handleSeasonChange = useCallback(
    (value: string) => {
      const newSeason = Number(value);
      if (!Number.isFinite(newSeason)) return;
      selectSeason(newSeason);
    },
    [selectSeason]
  );

  /*
   * Previous episode (in-place)
   */
  const handlePreviousEpisode = useCallback(() => {
    previousEpisode();
  }, [previousEpisode]);

  /*
   * Next episode (in-place)
   */
  const handleNextEpisode = useCallback(() => {
    nextEpisode();
  }, [nextEpisode]);

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
      {/* Video Player */}
      <WatchPlayer
        posterImage={
          anime?.bannerImage ?? undefined
        }
        stream={stream}
        isLoading={isStreamLoading}
        isEpisodesLoading={isEpisodesLoading}
        error={streamError}
        onPreviousEpisode={
          handlePreviousEpisode
        }
        onNextEpisode={
          handleNextEpisode
        }
      />

      {/* Episodes + You Might Like */}
      <div className="px-4 md:px-8 lg:px-12">
        <EpisodeSelector
          episodes={episodes}
          seasons={seasons}
          selectedEpisodeNumber={
            selectedEpisode?.number ??
            episodeNumber
          }
          selectedSeason={String(activeSeasonNumber)}
          totalEpisodes={episodes.length}
          isLoading={isEpisodesLoading}
          onEpisodeSelect={
            handleEpisodeSelect
          }
          onSeasonChange={
            handleSeasonChange
          }
        />

        <div className="border-t border-white/5" />

        <YouMightLike
          recommendations={[]}
        />
      </div>
    </div>
  );
}