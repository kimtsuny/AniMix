"use client";

import { useEffect, useRef } from "react";
import { useSearchStore } from "../store/search.store";
import { searchAnime } from "../api/services/search.service";
import { useDebounce } from "./useDebounce";
import { searchCacheUtils } from "../utils/cache";

export function useSearch() {
  const { query, setResults, setStatus } = useSearchStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();

    if (!trimmedQuery) {
      setStatus("idle");
      setResults([]);
      return;
    }

    if (searchCacheUtils.has(trimmedQuery)) {
      const cachedResults = searchCacheUtils.get(trimmedQuery)!;
      setResults(cachedResults);
      setStatus(cachedResults.length > 0 ? "success" : "empty");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const executeSearch = async () => {
      setStatus("loading");
      
      try {
        const results = await searchAnime(trimmedQuery, abortController.signal);
        
        if (abortController.signal.aborted) return;

        searchCacheUtils.set(trimmedQuery, results);
        setResults(results);
        setStatus(results.length > 0 ? "success" : "empty");
      } catch (error: any) {
        if (error.name === "AbortError") return;
        setStatus("error");
      }
    };

    executeSearch();

    return () => {
      // Abort previous request when a new debounced query triggers this effect
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, setResults, setStatus]);
}
