"use client";

import { useEffect, useState } from "react";

import { getTopRatedAnime } from "../api/services/home/top-rated.service";
import type { TopRatedAnime } from "../types/top-rated";

export function useTopRatedAnime() {
  const [data, setData] = useState<TopRatedAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTopRatedAnime() {
      try {
        const topRatedAnime = await getTopRatedAnime();

        setData(topRatedAnime);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopRatedAnime();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
