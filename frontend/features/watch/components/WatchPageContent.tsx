"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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

  /*
   * Episode card selection
   *
   * Change the URL so the URL remains
   * the source of truth for the current episode.
   */
  const handleEpisodeSelect = useCallback(
    (ep: { id: number }) => {
      const selected = episodes.find(
        (episode) => episode.id === ep.id
      );

      if (!selected) return;

      router.push(
        `/watch/${animeId}/${season}/${selected.number}`
      );
    },
    [
      episodes,
      router,
      animeId,
      season,
    ]
  );

  /*
   * Season selection
   *
   * For now, when changing season we go
   * to episode 1 of that season.
   */
  const handleSeasonChange = useCallback(
    (value: string) => {
      const newSeason = Number(value);

      if (!Number.isFinite(newSeason)) return;

      router.push(
        `/watch/${animeId}/${newSeason}/1`
      );
    },
    [router, animeId]
  );

  /*
   * Previous episode
   */
  const handlePreviousEpisode = useCallback(() => {
    const previous = previousEpisode();

    if (previous === undefined) return;

    router.push(
      `/watch/${animeId}/${season}/${previous}`
    );
  }, [
    previousEpisode,
    router,
    animeId,
    season,
  ]);

  /*
   * Next episode
   */
  const handleNextEpisode = useCallback(() => {
    const next = nextEpisode();

    if (next === undefined) return;

    router.push(
      `/watch/${animeId}/${season}/${next}`
    );
  }, [
    nextEpisode,
    router,
    animeId,
    season,
  ]);

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
      {/* Video Player */}
      <WatchPlayer
        posterImage={
          anime?.bannerImage ?? undefined
        }
        stream={stream}
        isLoading={isStreamLoading}
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
          selectedSeason={String(seasonNumber)}
          totalEpisodes={episodes.length}
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