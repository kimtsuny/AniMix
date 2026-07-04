import { useEffect, useState } from "react";

import { getPopularAnime } from "../api/services/popular.service";
import type { PopularAnime } from "../types/popular";

export function usePopularAnime() {
  const [data, setData] = useState<PopularAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPopularAnime() {
      try {
        const popularAnime = await getPopularAnime();

        setData(popularAnime);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchPopularAnime();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
