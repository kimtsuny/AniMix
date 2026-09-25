"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEpisodes } from "./useEpisodes";
import { useStream } from "./useStream";
import type { Episode } from "../api/services/episode.service";

interface UseWatchResult {
  anime: ReturnType<typeof useEpisodes>["anime"];
  seasons: ReturnType<typeof useEpisodes>["seasons"];
  episodes: ReturnType<typeof useEpisodes>["episodes"];

  selectedEpisode: Episode | null;
  seasonNumber: number;

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

  previousEpisode: () => number | undefined;
  nextEpisode: () => number | undefined;
}

function updateWatchUrl(
  animeId: number | string,
  seasonNumber: number,
  episodeNumber: number
) {
  if (typeof window === "undefined") return;
  const newUrl = `/watch/${animeId}/${seasonNumber}/${episodeNumber}`;
  if (window.location.pathname !== newUrl) {
    window.history.replaceState(null, "", newUrl);
  }
}

export function useWatch(
  animeId: number,
  initialSeasonNumber: number,
  initialEpisodeNumber: number
): UseWatchResult {
  const [seasonNumber, setSeasonNumber] = useState(initialSeasonNumber);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeId, setEpisodeId] = useState<number | null>(null);

  // Target episode number to select once the season's episodes arrive
  const targetEpisodeNumberRef = useRef<number>(initialEpisodeNumber);

  const {
    anime,
    seasons,
    episodes,
    isLoading: isEpisodesLoading,
    error: episodesError,
    selectEpisode: selectEpisodeFromEpisodes,
  } = useEpisodes(animeId, seasonNumber);

  /*
   * When episodes arrive for the current season, select the target episode
   */
  useEffect(() => {
    if (episodes.length === 0) {
      return;
    }

    const targetNumber = targetEpisodeNumberRef.current;
    const target =
      episodes.find((ep) => ep.number === targetNumber) ?? episodes[0];

    if (!target) return;

    setSelectedEpisode((current) => {
      if (current && current.id === target.id) return current;
      return target;
    });

    setEpisodeId((currentId) => {
      if (currentId === target.id) return currentId;
      return target.id;
    });

    selectEpisodeFromEpisodes(target);
    updateWatchUrl(animeId, seasonNumber, target.number);
  }, [episodes, animeId, seasonNumber, selectEpisodeFromEpisodes]);

  /*
   * Fetch stream for the currently selected episode.
   */
  const {
    data: stream,
    isLoading: isStreamLoading,
    error: streamError,
  } = useStream(episodeId);

  const selectEpisode = useCallback(
    (id: number) => {
      const ep = episodes.find((item) => item.id === id);
      if (!ep) return;

      targetEpisodeNumberRef.current = ep.number;
      setSelectedEpisode(ep);
      setEpisodeId(ep.id);
      selectEpisodeFromEpisodes(ep);
      updateWatchUrl(animeId, seasonNumber, ep.number);
    },
    [episodes, animeId, seasonNumber, selectEpisodeFromEpisodes]
  );

  const selectSeason = useCallback(
    (newSeason: number) => {
      if (newSeason === seasonNumber) return;

      targetEpisodeNumberRef.current = 1;
      setSeasonNumber(newSeason);
      setSelectedEpisode(null);
      setEpisodeId(null);
      updateWatchUrl(animeId, newSeason, 1);
    },
    [animeId, seasonNumber]
  );

  const currentIndex = useMemo(() => {
    if (!selectedEpisode) return -1;

    return episodes.findIndex(
      (episode) => episode.id === selectedEpisode.id
    );
  }, [episodes, selectedEpisode]);

  const previousEpisode = useCallback(() => {
    if (currentIndex <= 0) return undefined;

    const prevEp = episodes[currentIndex - 1];
    selectEpisode(prevEp.id);
    return prevEp.number;
  }, [currentIndex, episodes, selectEpisode]);

  const nextEpisode = useCallback(() => {
    if (
      currentIndex === -1 ||
      currentIndex >= episodes.length - 1
    ) {
      return undefined;
    }

    const nextEp = episodes[currentIndex + 1];
    selectEpisode(nextEp.id);
    return nextEp.number;
  }, [currentIndex, episodes, selectEpisode]);

  /*
   * Support browser Back/Forward navigation in-place
   */
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts[0] === "watch" && parts.length >= 4) {
        const urlSeason = Number(parts[2]);
        const urlEpisode = Number(parts[3]);

        if (Number.isFinite(urlSeason) && urlSeason !== seasonNumber) {
          targetEpisodeNumberRef.current = Number.isFinite(urlEpisode) ? urlEpisode : 1;
          setSeasonNumber(urlSeason);
          setSelectedEpisode(null);
          setEpisodeId(null);
        } else if (Number.isFinite(urlEpisode)) {
          targetEpisodeNumberRef.current = urlEpisode;
          const ep = episodes.find((item) => item.number === urlEpisode);
          if (ep) {
            setSelectedEpisode(ep);
            setEpisodeId(ep.id);
            selectEpisodeFromEpisodes(ep);
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [seasonNumber, episodes, selectEpisodeFromEpisodes]);

  return {
    anime,
    seasons,
    episodes,
    selectedEpisode,
    seasonNumber,

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