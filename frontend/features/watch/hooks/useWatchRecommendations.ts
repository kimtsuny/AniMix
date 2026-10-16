"use client";

import { useEffect, useState } from "react";
import { getAnimeRecommendations } from "@/features/anime/api/services/details";
import type { WatchRecommendation } from "../components/YouMightLike/types";

export interface UseWatchRecommendationsResult {
  recommendations: WatchRecommendation[];
  isLoading: boolean;
  error: string | null;
}

export function useWatchRecommendations(
  animeId: number
): UseWatchRecommendationsResult {
  const [state, setState] = useState<{
    animeId: number;
    recommendations: WatchRecommendation[];
    isLoading: boolean;
    error: string | null;
  }>({
    animeId,
    recommendations: [],
    isLoading: Boolean(animeId && animeId > 0),
    error: null,
  });

  const isLoading = state.animeId !== animeId || state.isLoading;
  const recommendations =
    state.animeId === animeId ? state.recommendations : [];
  const error = state.animeId === animeId ? state.error : null;

  useEffect(() => {
    if (!animeId || Number.isNaN(animeId) || animeId <= 0) {
      return;
    }

    let cancelled = false;

    getAnimeRecommendations(animeId)
      .then((data) => {
        if (cancelled) return;
        setState({
          animeId,
          recommendations: data,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          animeId,
          recommendations: [],
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to load recommendations",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [animeId]);

  return {
    recommendations,
    isLoading,
    error,
  };
}
