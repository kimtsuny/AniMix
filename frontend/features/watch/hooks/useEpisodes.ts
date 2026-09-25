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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentSeasonLoaded =
    loadedAnimeId === animeId && loadedSeasonNumber === seasonNumber;

  const currentAnime = loadedAnimeId === animeId ? anime : null;
  const currentSeasons = loadedAnimeId === animeId ? seasons : [];
  const currentEpisodes = isCurrentSeasonLoaded ? episodes : [];
  const currentSelectedEpisode = isCurrentSeasonLoaded ? selectedEpisode : null;
  const currentIsLoading = isLoading || !isCurrentSeasonLoaded;

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getSeasonEpisodes(animeId, seasonNumber)
      .then((data) => {
        if (cancelled) return;

        setAnime(data.anime);
        setSeasons((prev) => (prev.length > 0 ? prev : data.seasons));
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
      .catch((err) => {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "Failed to load episodes";

        setError(message);
        if (loadedAnimeId !== animeId) {
          setAnime(null);
          setSeasons([]);
        }
        setEpisodes([]);
        setSelectedEpisode(null);
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
  }, [animeId, seasonNumber, loadedAnimeId]);

  const selectEpisode = useCallback(
    (episode: Episode) => {
      setSelectedEpisode(episode);
    },
    []
  );

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getSeasonEpisodes(animeId, seasonNumber);

      setAnime(data.anime);
      setSeasons(data.seasons);
      setEpisodes(data.season.episodes);
      setLoadedAnimeId(animeId);
      setLoadedSeasonNumber(seasonNumber);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load episodes";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [animeId, seasonNumber]);

  return {
    anime: currentAnime,
    seasons: currentSeasons,
    episodes: currentEpisodes,
    selectedEpisode: currentSelectedEpisode,
    isLoading: currentIsLoading,
    error,
    selectEpisode,
    refetch,
  };
}