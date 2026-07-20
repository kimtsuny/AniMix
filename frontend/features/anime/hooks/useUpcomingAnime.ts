"use client";

import { useEffect, useState } from "react";

import { getUpcomingAnime } from "../api/services/home/upcoming.service";
import type { UpcomingAnime } from "../types/upcoming";

export function useUpcomingAnime() {
  const [data, setData] = useState<UpcomingAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUpcomingAnime() {
      try {
        const upcomingAnime = await getUpcomingAnime();

        setData(upcomingAnime);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingAnime();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
