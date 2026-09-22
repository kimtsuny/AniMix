"use client";

import { useEffect, useMemo, useState } from "react";
import { useEpisodes } from "./useEpisodes";
import { useStream } from "./useStream";

interface UseWatchResult {
  anime: ReturnType<typeof useEpisodes>["anime"];
  seasons: ReturnType<typeof useEpisodes>["seasons"];
  episodes: ReturnType<typeof useEpisodes>["episodes"];

  selectedEpisode: ReturnType<
    typeof useEpisodes
  >["selectedEpisode"];

  stream: ReturnType<typeof useStream>["data"];

  isEpisodesLoading: boolean;
  isStreamLoading: boolean;

  episodesError: string | null;
  streamError: string | null;

  selectEpisode: (
    episodeId: number
  ) => void;

  selectSeason: (
    seasonNumber: number
  ) => void;

  previousEpisode: () => void;
  nextEpisode: () => void;
}

export function useWatch(
  animeId: number,
  initialSeasonNumber: number,
  initialEpisodeNumber: number
): UseWatchResult {
  const [seasonNumber, setSeasonNumber] =
    useState(initialSeasonNumber);

  const [episodeId, setEpisodeId] =
    useState<number | null>(null);

  const {
    anime,
    seasons,
    episodes,
    selectedEpisode,
    isLoading: isEpisodesLoading,
    error: episodesError,
    selectEpisode: selectEpisodeFromEpisodes,
  } = useEpisodes(animeId, seasonNumber);

  /*
   * Set the initial/current episode when
   * the episode list becomes available.
   */
  useEffect(() => {
    if (episodes.length === 0) {
      setEpisodeId(null);
      return;
    }

    const episodeFromUrl = episodes.find(
      (episode) =>
        episode.number === initialEpisodeNumber
    );

    const episode =
      episodeFromUrl ?? episodes[0];

    setEpisodeId(episode.id);
    selectEpisodeFromEpisodes(episode);
  }, [
    episodes,
    initialEpisodeNumber,
    selectEpisodeFromEpisodes,
  ]);

  /*
   * Fetch stream for the currently selected episode.
   */
  const {
    data: stream,
    isLoading: isStreamLoading,
    error: streamError,
  } = useStream(episodeId);

  const selectEpisode = (id: number) => {
    const episode = episodes.find(
      (item) => item.id === id
    );

    if (!episode) return;

    setEpisodeId(episode.id);
    selectEpisodeFromEpisodes(episode);
  };

  const selectSeason = (number: number) => {
    setSeasonNumber(number);
    setEpisodeId(null);
  };

  const currentIndex = useMemo(() => {
    if (!selectedEpisode) return -1;

    return episodes.findIndex(
      (episode) =>
        episode.id === selectedEpisode.id
    );
  }, [episodes, selectedEpisode]);

  const previousEpisode = () => {
    if (currentIndex <= 0) return;

    const previous =
      episodes[currentIndex - 1];

    selectEpisode(previous.id);
  };

  const nextEpisode = () => {
    if (
      currentIndex === -1 ||
      currentIndex >= episodes.length - 1
    ) {
      return;
    }

    const next =
      episodes[currentIndex + 1];

    selectEpisode(next.id);
  };

  return {
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
  };
}