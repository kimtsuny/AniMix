"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getSeasonEpisodes,
  type Episode,
  type Season,
  type Anime,
} from "../api/services/episode.service";

interface UseEpisodesResult {
  anime: Anime | null;
  seasons: Season[];
  episodes: Episode[];
  selectedEpisode: Episode | null;
  isLoading: boolean;
  error: string | null;
  selectEpisode: (episode: Episode) => void;
  refetch: () => Promise<void>;
}

export function useEpisodes(
  animeId: number,
  seasonNumber: number
): UseEpisodesResult {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] =
    useState<Episode | null>(null);

  const [loadedAnimeId, setLoadedAnimeId] = useState<number | null>(null);
  const [loadedSeasonNumber, setLoadedSeasonNumber] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCurrentSeasonLoaded =
    loadedAnimeId === animeId && loadedSeasonNumber === seasonNumber;

  const currentEpisodes = isCurrentSeasonLoaded ? episodes : [];
  const currentSelectedEpisode = isCurrentSeasonLoaded ? selectedEpisode : null;
  const currentIsLoading = isLoading || !isCurrentSeasonLoaded;

  const fetchEpisodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getSeasonEpisodes(
        animeId,
        seasonNumber
      );

      setAnime(data.anime);
      setSeasons(data.seasons);
      setEpisodes(data.season.episodes);
      setLoadedAnimeId(animeId);
      setLoadedSeasonNumber(seasonNumber);

      setSelectedEpisode((current) => {
        if (current) {
          return (
            data.season.episodes.find(
              (episode) => episode.id === current.id
            ) ?? data.season.episodes[0] ?? null
          );
        }

        return data.season.episodes[0] ?? null;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load episodes";

      setError(message);
      setAnime(null);
      setSeasons([]);
      setEpisodes([]);
      setSelectedEpisode(null);
      setLoadedAnimeId(null);
      setLoadedSeasonNumber(null);
    } finally {
      setIsLoading(false);
    }
  }, [animeId, seasonNumber]);

  useEffect(() => {
    let cancelled = false;

    getSeasonEpisodes(animeId, seasonNumber)
      .then((data) => {
        if (cancelled) return;

        setAnime(data.anime);
        setSeasons(data.seasons);
        setEpisodes(data.season.episodes);
        setLoadedAnimeId(animeId);
        setLoadedSeasonNumber(seasonNumber);
        setError(null);

        setSelectedEpisode((current) => {
          if (current) {
            return (
              data.season.episodes.find(
                (episode) => episode.id === current.id
              ) ?? data.season.episodes[0] ?? null
            );
          }

          return data.season.episodes[0] ?? null;
        });
      })
      .catch((error) => {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load episodes";

        setError(message);
        setAnime(null);
        setSeasons([]);
        setEpisodes([]);
        setSelectedEpisode(null);
        setLoadedAnimeId(null);
        setLoadedSeasonNumber(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [animeId, seasonNumber]);

  const selectEpisode = useCallback(
    (episode: Episode) => {
      setSelectedEpisode(episode);
    },
    []
  );

  return {
    anime,
    seasons,
    episodes: currentEpisodes,
    selectedEpisode: currentSelectedEpisode,
    isLoading: currentIsLoading,
    error,
    selectEpisode,
    refetch: fetchEpisodes,
  };
}