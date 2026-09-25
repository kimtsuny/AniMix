"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Track the latest active episode ID and request generation counter
  const activeEpisodeIdRef = useRef<number | null>(episodeId);
  activeEpisodeIdRef.current = episodeId;

  const requestIdRef = useRef(0);

  const fetchStream = useCallback(async () => {
    const currentEpisodeId = episodeId;
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    if (!currentEpisodeId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Immediately clear stale stream data so old stream cannot linger
      setData(null);

      const result = await getEpisodeStream(currentEpisodeId);

      // Verify this response matches the latest request and active episode
      if (
        currentRequestId !== requestIdRef.current ||
        activeEpisodeIdRef.current !== currentEpisodeId
      ) {
        return;
      }

      setData(result);
    } catch (err) {
      if (
        currentRequestId !== requestIdRef.current ||
        activeEpisodeIdRef.current !== currentEpisodeId
      ) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Failed to load stream";

      setData(null);
      setError(message);
    } finally {
      if (
        currentRequestId === requestIdRef.current &&
        activeEpisodeIdRef.current === currentEpisodeId
      ) {
        setIsLoading(false);
      }
    }
  }, [episodeId]);

  useEffect(() => {
    fetchStream();

    return () => {
      // Invalidate in-flight request when episodeId changes or component unmounts
      requestIdRef.current += 1;
    };
  }, [fetchStream]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStream,
  };
}