"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getEpisodeStream,
  type StreamResponse,
} from "../api/services/stream.service";

interface UseStreamResult {
  data: StreamResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStream(
  episodeId: number | null
): UseStreamResult {
  const [data, setData] = useState<StreamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStream = useCallback(async () => {
    if (!episodeId) {
      setData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await getEpisodeStream(episodeId);

      setData(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load stream";

      setData(null);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStream,
  };
}