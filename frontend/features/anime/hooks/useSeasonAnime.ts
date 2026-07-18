import { useEffect, useState } from "react";

import { getSeasonAnime } from "../api/services/home/season.service";
import type { SeasonAnime } from "../types/season";

export function useSeasonAnime() {
  const [data, setData] = useState<SeasonAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSeasonAnime() {
      try {
        const seasonAnime = await getSeasonAnime({
          season: "SUMMER",
          seasonYear: 2026,
        });

        setData(seasonAnime);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSeasonAnime();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
