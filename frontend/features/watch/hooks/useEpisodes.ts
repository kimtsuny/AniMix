"use client";

import { useEffect, useState } from "react";
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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = async () => {
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, [animeId, seasonNumber]);

  const selectEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  return {
    anime,
    seasons,
    episodes,
    selectedEpisode,
    isLoading,
    error,
    selectEpisode,
    refetch: fetchEpisodes,
  };
}