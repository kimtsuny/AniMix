"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getEpisodeStream,
  getAnonymousEpisodeStream,
  type StreamResponse,
} from "../api/services/stream.service";

export type StreamTarget =
  | number
  | {
      id?: number | null;
      provider?: string;
      providerId?: string;
    }
  | null;

interface UseStreamResult {
  data: StreamResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStream(
  target: StreamTarget
): UseStreamResult {
  const [data, setData] = useState<StreamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetKey =
    typeof target === "number"
      ? `id:${target}`
      : target?.id != null
      ? `id:${target.id}`
      : target?.provider && target?.providerId
      ? `anon:${target.provider}:${target.providerId}`
      : null;

  // Track the latest active target key and target reference
  const activeTargetKeyRef = useRef<string | null>(targetKey);
  const targetRef = useRef(target);

  useEffect(() => {
    activeTargetKeyRef.current = targetKey;
    targetRef.current = target;
  }, [targetKey, target]);

  const requestIdRef = useRef(0);

  const fetchStream = useCallback(async () => {
    const currentKey = targetKey;
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    if (!currentKey) {
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

      let result: StreamResponse;
      const currentTarget = targetRef.current;

      if (typeof currentTarget === "number") {
        result = await getEpisodeStream(currentTarget);
      } else if (currentTarget?.id != null) {
        result = await getEpisodeStream(currentTarget.id);
      } else if (currentTarget?.provider && currentTarget?.providerId) {
        result = await getAnonymousEpisodeStream(
          currentTarget.provider,
          currentTarget.providerId
        );
      } else {
        return;
      }

      // Verify this response matches the latest request and active target
      if (
        currentRequestId !== requestIdRef.current ||
        activeTargetKeyRef.current !== currentKey
      ) {
        return;
      }

      setData(result);
    } catch (err) {
      if (
        currentRequestId !== requestIdRef.current ||
        activeTargetKeyRef.current !== currentKey
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
        activeTargetKeyRef.current === currentKey
      ) {
        setIsLoading(false);
      }
    }
  }, [targetKey]);

  useEffect(() => {
    fetchStream();

    return () => {
      // Invalidate in-flight request when target changes or component unmounts
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