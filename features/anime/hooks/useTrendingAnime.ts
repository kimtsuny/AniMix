import { useEffect, useState } from "react";

import { getTrendingAnime } from "../api/services/trending.service";
import type { TrendingAnime } from "../types/trending";

export function useTrendingAnime() {
  const [data, setData] = useState<TrendingAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTrendingAnime() {
      try {
        const trendingAnime = await getTrendingAnime();

        setData(trendingAnime);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingAnime();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
