"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  getAnimeSeasons,
  getSeasonEpisodes,
} from "@/features/watch/api/services/episode.service";
import { Seasons } from "./Seasons/Seasons";
import { Episodes, EpisodesSkeleton } from "./Episodes";
import { Relation } from "@/features/anime/types/relation";
import { Episode } from "@/features/anime/types/episode";
import { DEFAULT_BATCH_SIZE } from "@/features/watch/utils/episodeBatching";

export type SeasonItem = Relation & {
  number?: number;
  anilistId?: number | null;
  episodeCount?: number;
};

export interface CachedSeasonBatch {
  animeId: number;
  seasonNumber: number;
  seasonAnilistId?: number | null;
  batchIndex: number;
  totalEpisodes: number;
  episodes: Episode[];
  timestamp: number;
}

export function buildCacheKey(
  animeId: number,
  seasonNumber: number,
  batchIndex: number
): string {
  return `anime:${animeId}:s:${seasonNumber}:b:${batchIndex}`;
}

export function validateCacheEntry(
  entry: CachedSeasonBatch | undefined,
  animeId: number,
  seasonNumber: number,
  batchIndex: number,
  expectedAnilistId?: number | null
): CachedSeasonBatch | null {
  if (!entry) return null;
  if (entry.animeId !== animeId) return null;
  if (entry.seasonNumber !== seasonNumber) return null;
  if (entry.batchIndex !== batchIndex) return null;
  if (
    expectedAnilistId &&
    entry.seasonAnilistId &&
    expectedAnilistId !== entry.seasonAnilistId
  ) {
    return null;
  }
  if (!Array.isArray(entry.episodes) || entry.episodes.length === 0) {
    return null;
  }
  return entry;
}

function resolveSeasonInfo(
  targetId: number,
  seasonsList: SeasonItem[]
): { seasonNumber: number; anilistId?: number | null } {
  const match = seasonsList.find(
    (s) =>
      s.id === targetId ||
      (s.anilistId && s.anilistId === targetId) ||
      s.number === targetId
  );
  if (match) {
    return {
      seasonNumber: match.number ?? (targetId < 100 ? targetId : 1),
      anilistId: match.anilistId ?? (targetId > 100 ? targetId : null),
    };
  }
  return {
    seasonNumber: targetId < 100 ? targetId : 1,
    anilistId: targetId > 100 ? targetId : null,
  };
}

interface SeasonsAndEpisodesProps {
  initialSeasonId: number;
  fallbackImage: string | null;
  initialSeasons?: SeasonItem[];
  initialEpisodes?: Episode[];
  rootAnimeId?: number;
}

export function SeasonsAndEpisodes({
  initialSeasonId,
  fallbackImage,
  initialSeasons,
  initialEpisodes,
  rootAnimeId: propRootAnimeId,
}: SeasonsAndEpisodesProps) {
  const searchParams = useSearchParams();
  const urlSeasonParam = searchParams.get("season");
  const initialUrlSeasonId = urlSeasonParam
    ? parseInt(urlSeasonParam, 10)
    : initialSeasonId;

  // 1. Immediate UI state for the selected season button
  const [selectedSeasonId, setSelectedSeasonId] = useState<number>(initialUrlSeasonId);
  const selectedSeasonIdRef = useRef<number>(initialUrlSeasonId);
  selectedSeasonIdRef.current = selectedSeasonId;

  const [seasons, setSeasons] = useState<SeasonItem[]>(initialSeasons ?? []);
  const seasonsRef = useRef<SeasonItem[]>(initialSeasons ?? []);
  seasonsRef.current = seasons;

  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes ?? []);
  const [totalEpisodes, setTotalEpisodes] = useState<number | undefined>(
    initialEpisodes?.length
  );
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);
  const [rootAnimeId, setRootAnimeId] = useState<number>(
    propRootAnimeId ?? initialSeasonId
  );
  const rootAnimeIdRef = useRef<number>(propRootAnimeId ?? initialSeasonId);
  rootAnimeIdRef.current = rootAnimeId;

  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(
    !initialSeasons || initialSeasons.length === 0
  );
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(
    !initialEpisodes || initialEpisodes.length === 0
  );
  const isLoadingEpisodesRef = useRef<boolean>(isLoadingEpisodes);
  isLoadingEpisodesRef.current = isLoadingEpisodes;

  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);

  // Unambiguous episode cache keyed by anime:season:batch
  const episodesCache = useRef<Map<string, CachedSeasonBatch>>(new Map());

  // Coordination refs
  const activeEpisodeRequestIdRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeBatchRequestIdRef = useRef<number>(0);
  const prefetchingSeasonRef = useRef<number | null>(null);
  const initialMountFetchDoneRef = useRef<boolean>(false);

  // Seed cache with initialEpisodes if provided
  if (
    initialEpisodes &&
    initialEpisodes.length > 0 &&
    episodesCache.current.size === 0
  ) {
    const key = buildCacheKey(initialSeasonId, 1, 0);
    episodesCache.current.set(key, {
      animeId: initialSeasonId,
      seasonNumber: 1,
      seasonAnilistId: initialSeasonId,
      batchIndex: 0,
      totalEpisodes: initialEpisodes.length,
      episodes: initialEpisodes,
      timestamp: Date.now(),
    });
  }

  // Helper to map AniMix backend episodes to Episode format
  const mapEpisodes = useCallback(
    (
      rawEpisodes: Array<{
        number: number;
        title: string | null;
        thumbnail: string | null;
      }>,
      resolvedRootId: number,
      seasonNum: number
    ): Episode[] => {
      return rawEpisodes.map((ep) => ({
        number: ep.number,
        title: ep.title
          ? ep.title.startsWith("Episode ")
            ? ep.title
            : `Episode ${ep.number} - ${ep.title}`
          : `Episode ${ep.number}`,
        thumbnail: ep.thumbnail,
        url: `/watch/${resolvedRootId}/${seasonNum}/${ep.number}`,
        site: "AniMix",
      }));
    },
    []
  );

  // Helper to map AniMix backend seasons to Relation format
  const mapSeasons = useCallback(
    (
      rawSeasons: Array<{
        id: number | null;
        number: number;
        title: string | null;
        episodeCount?: number;
        anilistId?: number | null;
      }>
    ): SeasonItem[] => {
      return rawSeasons.map((s) => ({
        id: s.anilistId ?? s.id ?? s.number,
        number: s.number,
        title: s.title || `Season ${s.number}`,
        coverImage: null,
        relationType: "SEASON",
        format: "TV",
        status: null,
        startDate: null,
        anilistId: s.anilistId,
        episodeCount: s.episodeCount,
      }));
    },
    []
  );

  // Central coordinator function for loading a season's episodes
  const loadSeasonEpisodes = useCallback(
    (targetSeasonId: number) => {
      const currentRootId = rootAnimeIdRef.current || initialSeasonId;
      const { seasonNumber, anilistId } = resolveSeasonInfo(
        targetSeasonId,
        seasonsRef.current
      );
      const cacheKey = buildCacheKey(currentRootId, seasonNumber, 0);

      // Check cache first
      const cached = validateCacheEntry(
        episodesCache.current.get(cacheKey),
        currentRootId,
        seasonNumber,
        0,
        anilistId
      );

      if (cached) {
        // Cancel any pending in-flight fetch
        activeAbortControllerRef.current?.abort();
        activeEpisodeRequestIdRef.current++;

        setEpisodes(cached.episodes);
        setTotalEpisodes(cached.totalEpisodes);
        setActiveBatchIndex(0);
        setIsLoadingEpisodes(false);
        return;
      }

      // Uncached: show skeleton immediately and fetch exactly one first batch
      activeAbortControllerRef.current?.abort();
      const controller = new AbortController();
      activeAbortControllerRef.current = controller;

      const currentRequestId = ++activeEpisodeRequestIdRef.current;
      setActiveBatchIndex(0);
      setIsLoadingEpisodes(true);
      setEpisodes([]); // Clear previous episodes so skeleton appears instantly

      getSeasonEpisodes(
        currentRootId,
        seasonNumber,
        { offset: 0, limit: DEFAULT_BATCH_SIZE },
        { signal: controller.signal }
      )
        .then((data) => {
          if (currentRequestId !== activeEpisodeRequestIdRef.current) return;

          const resolvedRootId = data.anime?.anilistId || currentRootId;
          const resolvedSeasonNum = data.season?.number || seasonNumber;
          const resolvedSeasonAnilistId =
            data.season?.anilistId ?? anilistId ?? targetSeasonId;

          const newEpisodes = mapEpisodes(
            data.season?.episodes || [],
            resolvedRootId,
            resolvedSeasonNum
          );

          const total =
            data.pagination?.total ??
            data.season?.episodes?.length ??
            newEpisodes.length;

          const resolvedKey = buildCacheKey(
            resolvedRootId,
            resolvedSeasonNum,
            0
          );
          const cacheEntry: CachedSeasonBatch = {
            animeId: resolvedRootId,
            seasonNumber: resolvedSeasonNum,
            seasonAnilistId: resolvedSeasonAnilistId,
            batchIndex: 0,
            totalEpisodes: total,
            episodes: newEpisodes,
            timestamp: Date.now(),
          };

          episodesCache.current.set(resolvedKey, cacheEntry);
          if (resolvedRootId !== currentRootId) {
            episodesCache.current.set(
              buildCacheKey(currentRootId, resolvedSeasonNum, 0),
              cacheEntry
            );
          }

          setTotalEpisodes(total);
          setEpisodes(newEpisodes);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (currentRequestId !== activeEpisodeRequestIdRef.current) return;
          console.warn("Failed to load season episodes:", err);
          setEpisodes([]);
        })
        .finally(() => {
          if (currentRequestId === activeEpisodeRequestIdRef.current) {
            setIsLoadingEpisodes(false);
          }
        });
    },
    [initialSeasonId, mapEpisodes]
  );

  // Immediate season selection click handler
  const handleSeasonSelect = useCallback(
    (id: number) => {
      if (id === selectedSeasonIdRef.current && !isLoadingEpisodesRef.current) {
        return;
      }

      // 1. Immediately update UI state so active button style updates in the same frame
      setSelectedSeasonId(id);
      selectedSeasonIdRef.current = id;

      // 2. Synchronize URL cleanly without triggering full App Router RSC navigation
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("season", id.toString());
        window.history.pushState(
          null,
          "",
          `${url.pathname}?${url.searchParams.toString()}`
        );
      } catch {
        // Fallback for non-browser environments
      }

      // 3. Immediately coordinate episode request
      loadSeasonEpisodes(id);
    },
    [loadSeasonEpisodes]
  );

  // Background hover prefetch for adjacent season
  const handleSeasonHover = useCallback(
    (id: number) => {
      if (id === selectedSeasonIdRef.current) return;
      if (isLoadingEpisodesRef.current) return;

      const currentRootId = rootAnimeIdRef.current || initialSeasonId;
      const { seasonNumber, anilistId } = resolveSeasonInfo(
        id,
        seasonsRef.current
      );
      const cacheKey = buildCacheKey(currentRootId, seasonNumber, 0);

      if (
        validateCacheEntry(
          episodesCache.current.get(cacheKey),
          currentRootId,
          seasonNumber,
          0,
          anilistId
        )
      ) {
        return;
      }

      if (prefetchingSeasonRef.current === seasonNumber) return;
      prefetchingSeasonRef.current = seasonNumber;

      getSeasonEpisodes(currentRootId, seasonNumber, {
        offset: 0,
        limit: DEFAULT_BATCH_SIZE,
      })
        .then((data) => {
          const resolvedRootId = data.anime?.anilistId || currentRootId;
          const resolvedSeasonNum = data.season?.number || seasonNumber;
          const resolvedSeasonAnilistId =
            data.season?.anilistId ?? anilistId ?? id;

          const prefetchedEpisodes = mapEpisodes(
            data.season?.episodes || [],
            resolvedRootId,
            resolvedSeasonNum
          );

          const total =
            data.pagination?.total ??
            data.season?.episodes?.length ??
            prefetchedEpisodes.length;

          const resolvedKey = buildCacheKey(
            resolvedRootId,
            resolvedSeasonNum,
            0
          );
          const cacheEntry: CachedSeasonBatch = {
            animeId: resolvedRootId,
            seasonNumber: resolvedSeasonNum,
            seasonAnilistId: resolvedSeasonAnilistId,
            batchIndex: 0,
            totalEpisodes: total,
            episodes: prefetchedEpisodes,
            timestamp: Date.now(),
          };

          episodesCache.current.set(resolvedKey, cacheEntry);
          if (resolvedRootId !== currentRootId) {
            episodesCache.current.set(
              buildCacheKey(currentRootId, resolvedSeasonNum, 0),
              cacheEntry
            );
          }
        })
        .catch(() => {
          // Prefetch errors are harmless and silent
        })
        .finally(() => {
          if (prefetchingSeasonRef.current === seasonNumber) {
            prefetchingSeasonRef.current = null;
          }
        });
    },
    [initialSeasonId, mapEpisodes]
  );

  // Synchronize browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const seasonParam = params.get("season");
      const targetId = seasonParam
        ? parseInt(seasonParam, 10)
        : initialSeasonId;

      if (!isNaN(targetId) && targetId !== selectedSeasonIdRef.current) {
        setSelectedSeasonId(targetId);
        selectedSeasonIdRef.current = targetId;
        loadSeasonEpisodes(targetId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [initialSeasonId, loadSeasonEpisodes]);

  // Initial independent concurrent fetches (seasons metadata + first episode batch)
  useEffect(() => {
    if (initialMountFetchDoneRef.current) return;
    initialMountFetchDoneRef.current = true;

    // A. Lightweight season metadata request
    if (!initialSeasons || initialSeasons.length === 0) {
      setIsLoadingSeasons(true);
      getAnimeSeasons(initialSeasonId)
        .then((data) => {
          if (data.rootAnimeId) {
            setRootAnimeId(data.rootAnimeId);
            rootAnimeIdRef.current = data.rootAnimeId;
          }
          if (data.seasons && data.seasons.length > 0) {
            const mapped = mapSeasons(data.seasons);
            setSeasons(mapped);
            seasonsRef.current = mapped;
          }
        })
        .catch((err) => {
          console.warn("Failed to load anime seasons metadata:", err);
        })
        .finally(() => {
          setIsLoadingSeasons(false);
        });
    }

    // B. Initial episode request (first 100 episodes)
    if (
      initialEpisodes &&
      initialEpisodes.length > 0 &&
      (!urlSeasonParam || initialUrlSeasonId === initialSeasonId)
    ) {
      return;
    }

    loadSeasonEpisodes(initialUrlSeasonId);
  }, [
    initialSeasonId,
    initialSeasons,
    initialEpisodes,
    initialUrlSeasonId,
    urlSeasonParam,
    mapSeasons,
    loadSeasonEpisodes,
  ]);

  // Batch changing inside the current season
  const handleBatchChange = (batchIndex: number) => {
    setActiveBatchIndex(batchIndex);

    const currentSeasonId = selectedSeasonIdRef.current;
    const currentRootId = rootAnimeIdRef.current || initialSeasonId;
    const { seasonNumber, anilistId } = resolveSeasonInfo(
      currentSeasonId,
      seasonsRef.current
    );

    const batchKey = buildCacheKey(currentRootId, seasonNumber, batchIndex);
    const cachedBatch = validateCacheEntry(
      episodesCache.current.get(batchKey),
      currentRootId,
      seasonNumber,
      batchIndex,
      anilistId
    );

    if (cachedBatch) {
      setEpisodes(cachedBatch.episodes);
      return;
    }

    setIsLoadingBatch(true);
    const currentBatchRequestId = ++activeBatchRequestIdRef.current;

    getSeasonEpisodes(currentRootId, seasonNumber, {
      offset: batchIndex * DEFAULT_BATCH_SIZE,
      limit: DEFAULT_BATCH_SIZE,
    })
      .then((data) => {
        if (currentBatchRequestId !== activeBatchRequestIdRef.current) return;
        // Verify user didn't switch to another season while batch was loading
        if (selectedSeasonIdRef.current !== currentSeasonId) return;

        const resolvedRootId = data.anime?.anilistId || currentRootId;
        const mappedBatch = mapEpisodes(
          data.season?.episodes || [],
          resolvedRootId,
          seasonNumber
        );

        const total =
          data.pagination?.total ??
          data.season?.episodes?.length ??
          mappedBatch.length;

        episodesCache.current.set(batchKey, {
          animeId: resolvedRootId,
          seasonNumber,
          seasonAnilistId: data.season?.anilistId ?? anilistId,
          batchIndex,
          totalEpisodes: total,
          episodes: mappedBatch,
          timestamp: Date.now(),
        });

        setEpisodes(mappedBatch);
      })
      .catch((err) => {
        if (currentBatchRequestId !== activeBatchRequestIdRef.current) return;
        console.warn("Failed to load episode batch:", err);
      })
      .finally(() => {
        if (currentBatchRequestId === activeBatchRequestIdRef.current) {
          setIsLoadingBatch(false);
        }
      });
  };

  return (
    <div className="space-y-3 relative">
      <Seasons
        seasons={seasons}
        activeSeasonId={selectedSeasonId}
        onSeasonSelect={handleSeasonSelect}
        onSeasonHover={handleSeasonHover}
        isLoading={isLoadingSeasons}
      />

      <div className="relative min-h-[200px]">
        {isLoadingEpisodes ? (
          <EpisodesSkeleton count={5} />
        ) : (
          <Episodes
            episodes={episodes}
            fallbackImage={fallbackImage}
            seasonId={selectedSeasonId}
            totalEpisodes={totalEpisodes}
            activeBatchIndex={activeBatchIndex}
            onBatchChange={handleBatchChange}
            isLoadingBatch={isLoadingBatch}
          />
        )}
      </div>
    </div>
  );
}
