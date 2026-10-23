"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  getAnimeSeasons,
  getSeasonEpisodes,
} from "@/features/watch/api/services/episode.service";
import { Seasons } from "./Seasons/Seasons";
import { Episodes, EpisodesSkeleton } from "./Episodes";
import { SeasonUnreleasedPanel } from "./Seasons/SeasonUnreleasedPanel";
import { Relation } from "@/features/anime/types/relation";
import { Episode } from "@/features/anime/types/episode";
import { AnimeDetails } from "@/features/anime/types/anime-details";
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

// Module-scoped caches that persist across client-side page transitions (e.g. Details <-> Watch)
export const globalEpisodesCache = new Map<string, CachedSeasonBatch>();
export const globalSeasonsCache = new Map<number, SeasonItem[]>();
export const globalRootAnimeIdCache = new Map<number, number>();

export function clearGlobalCaches() {
  globalEpisodesCache.clear();
  globalSeasonsCache.clear();
  globalRootAnimeIdCache.clear();
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

export function resolveSeasonInfo(
  targetId: number,
  seasonsList: SeasonItem[]
): { seasonNumber: number | null; anilistId: number | null; seasonTitle: string | null } {
  // 1. If seasonsList is populated, search by id, anilistId, or number
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
      seasonTitle: match.title,
    };
  }

  // 2. If seasonsList is not available yet, but targetId is explicitly a small logical season number (< 100, e.g. 1, 2, 3)
  if (targetId < 100) {
    return {
      seasonNumber: targetId,
      anilistId: null,
      seasonTitle: null,
    };
  }

  // 3. targetId is an AniList ID (> 100, e.g. 20958) and seasonsList has not loaded yet:
  // Return null seasonNumber to prevent prematurely guessing season 1!
  return {
    seasonNumber: null,
    anilistId: targetId,
    seasonTitle: null,
  };
}

interface SeasonsAndEpisodesProps {
  initialSeasonId: number;
  fallbackImage: string | null;
  initialSeasons?: SeasonItem[];
  initialEpisodes?: Episode[];
  rootAnimeId?: number;
  anime?: AnimeDetails | null;
  relations?: Relation[];
}

export function SeasonsAndEpisodes({
  initialSeasonId,
  fallbackImage,
  initialSeasons,
  initialEpisodes,
  rootAnimeId: propRootAnimeId,
  anime,
  relations,
}: SeasonsAndEpisodesProps) {
  const searchParams = useSearchParams();
  const urlSeasonParam = searchParams.get("season");
  const initialUrlSeasonId = urlSeasonParam
    ? parseInt(urlSeasonParam, 10)
    : initialSeasonId;

  // Selected season ID (drives active button style immediately)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number>(initialUrlSeasonId);
  const selectedSeasonIdRef = useRef<number>(initialUrlSeasonId);
  selectedSeasonIdRef.current = selectedSeasonId;

  // Seasons metadata (reused from global cache if available)
  const cachedSeasons = initialSeasons ?? globalSeasonsCache.get(initialSeasonId) ?? [];
  const [seasons, setSeasons] = useState<SeasonItem[]>(cachedSeasons);
  const seasonsRef = useRef<SeasonItem[]>(cachedSeasons);
  seasonsRef.current = seasons;

  // Canonical root anime ID
  const cachedRootId =
    propRootAnimeId ??
    globalRootAnimeIdCache.get(initialSeasonId) ??
    initialSeasonId;
  const [rootAnimeId, setRootAnimeId] = useState<number>(cachedRootId);
  const rootAnimeIdRef = useRef<number>(cachedRootId);
  rootAnimeIdRef.current = rootAnimeId;

  // Check if target season episodes are already available in persistent global cache on mount
  const initialResolved = resolveSeasonInfo(initialUrlSeasonId, cachedSeasons);
  const initialSeasonNum =
    initialResolved.seasonNumber ??
    (initialUrlSeasonId < 100
      ? initialUrlSeasonId
      : initialUrlSeasonId === initialSeasonId
      ? 1
      : null);
  const initialBatchKey =
    initialSeasonNum !== null
      ? buildCacheKey(cachedRootId, initialSeasonNum, 0)
      : null;
  const initialCachedBatch = initialBatchKey
    ? validateCacheEntry(
        globalEpisodesCache.get(initialBatchKey),
        cachedRootId,
        initialSeasonNum!,
        0,
        initialResolved.anilistId
      )
    : null;

  // Seed cache with initialEpisodes if explicitly passed in props
  if (
    initialEpisodes &&
    initialEpisodes.length > 0 &&
    !globalEpisodesCache.has(buildCacheKey(cachedRootId, 1, 0))
  ) {
    const key = buildCacheKey(cachedRootId, 1, 0);
    globalEpisodesCache.set(key, {
      animeId: cachedRootId,
      seasonNumber: 1,
      seasonAnilistId: initialSeasonId,
      batchIndex: 0,
      totalEpisodes: initialEpisodes.length,
      episodes: initialEpisodes,
      timestamp: Date.now(),
    });
  }

  const [episodes, setEpisodes] = useState<Episode[]>(
    initialCachedBatch?.episodes ?? initialEpisodes ?? []
  );
  const [totalEpisodes, setTotalEpisodes] = useState<number | undefined>(
    initialCachedBatch?.totalEpisodes ?? initialEpisodes?.length
  );
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);
  const activeBatchIndexRef = useRef<number>(0);
  activeBatchIndexRef.current = activeBatchIndex;

  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(
    cachedSeasons.length === 0
  );
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(
    !initialCachedBatch && (!initialEpisodes || initialEpisodes.length === 0)
  );
  const isLoadingEpisodesRef = useRef<boolean>(isLoadingEpisodes);
  isLoadingEpisodesRef.current = isLoadingEpisodes;

  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);

  // Coordination refs
  const activeEpisodeRequestIdRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeBatchRequestIdRef = useRef<number>(0);
  const prefetchingSeasonRef = useRef<number | null>(null);
  const initialMountFetchDoneRef = useRef<boolean>(false);

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
      return rawSeasons.map((s) => {
        const seasonAnilistId =
          s.anilistId ?? (s.id && s.id > 100 ? s.id : null);
        let seasonStatus: string | null = null;
        let seasonCover: string | null = null;

        if (seasonAnilistId && anime && seasonAnilistId === anime.id) {
          seasonStatus = anime.status;
          seasonCover =
            anime.bannerImage ||
            anime.coverImage?.extraLarge ||
            anime.coverImage?.large ||
            null;
        } else if (seasonAnilistId && relations) {
          const match = relations.find((r) => r.id === seasonAnilistId);
          if (match) {
            seasonStatus = match.status;
            seasonCover = match.coverImage;
          }
        }

        if (!seasonStatus && relations) {
          const match = relations.find((r) => {
            const regex = new RegExp(
              `(^|\\b)(?:season\\s*0*${s.number}|${s.number}(?:st|nd|rd|th)\\s*season)\\b`,
              "i"
            );
            return regex.test(r.title);
          });
          if (match) {
            seasonStatus = match.status;
            if (!seasonCover) seasonCover = match.coverImage;
          }
        }

        return {
          id: s.anilistId ?? s.id ?? s.number,
          number: s.number,
          title: s.title || `Season ${s.number}`,
          coverImage: seasonCover,
          relationType: "SEASON",
          format: "TV",
          status: seasonStatus,
          startDate: null,
          anilistId: s.anilistId,
          episodeCount: s.episodeCount,
        };
      });
    },
    [anime, relations]
  );

  // Central coordinator function for loading a season's episodes
  const loadSeasonEpisodes = useCallback(
    (targetSeasonId: number, overrideSeasons?: SeasonItem[]) => {
      const availableSeasons = overrideSeasons ?? seasonsRef.current;
      const currentRootId = rootAnimeIdRef.current || initialSeasonId;
      const { seasonNumber, anilistId } = resolveSeasonInfo(
        targetSeasonId,
        availableSeasons
      );

      // If seasonNumber cannot be determined yet because metadata is still loading:
      if (seasonNumber === null) {
        setIsLoadingEpisodes(true);
        setEpisodes([]);
        // The seasons metadata promise in useEffect will resolve and re-call loadSeasonEpisodes!
        return;
      }

      const cacheKey = buildCacheKey(currentRootId, seasonNumber, 0);

      // Check persistent global cache
      const cached = validateCacheEntry(
        globalEpisodesCache.get(cacheKey),
        currentRootId,
        seasonNumber,
        0,
        anilistId
      );

      if (cached) {
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
          if (selectedSeasonIdRef.current !== targetSeasonId) return;

          const resolvedRootId = data.anime?.anilistId || currentRootId;
          const resolvedSeasonNum = data.season?.number || seasonNumber;
          const resolvedSeasonAnilistId =
            data.season?.anilistId ?? anilistId ?? targetSeasonId;

          // Guard against mismatched season numbers
          if (resolvedSeasonNum !== seasonNumber) {
            console.warn(
              `[SeasonsAndEpisodes] Received season ${resolvedSeasonNum} but requested ${seasonNumber}`
            );
            return;
          }

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

          globalEpisodesCache.set(resolvedKey, cacheEntry);
          if (resolvedRootId !== currentRootId) {
            globalEpisodesCache.set(
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
      if (seasonNumber === null) return;

      const cacheKey = buildCacheKey(currentRootId, seasonNumber, 0);

      if (
        validateCacheEntry(
          globalEpisodesCache.get(cacheKey),
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

          globalEpisodesCache.set(resolvedKey, cacheEntry);
          if (resolvedRootId !== currentRootId) {
            globalEpisodesCache.set(
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

  // Synchronize if Next.js App Router executes a shallow/soft query transition
  useEffect(() => {
    const targetId = urlSeasonParam
      ? parseInt(urlSeasonParam, 10)
      : initialSeasonId;

    if (!isNaN(targetId) && targetId !== selectedSeasonIdRef.current) {
      setSelectedSeasonId(targetId);
      selectedSeasonIdRef.current = targetId;
      loadSeasonEpisodes(targetId);
    }
  }, [urlSeasonParam, initialSeasonId, loadSeasonEpisodes]);

  // Initial independent concurrent fetches (seasons metadata + episode loading)
  useEffect(() => {
    if (initialMountFetchDoneRef.current) return;
    initialMountFetchDoneRef.current = true;

    const existingSeasons = globalSeasonsCache.get(initialSeasonId);

    // A. Seasons metadata request (if not already cached)
    if (!existingSeasons || existingSeasons.length === 0) {
      setIsLoadingSeasons(true);
      getAnimeSeasons(initialSeasonId)
        .then((data) => {
          const resolvedRoot = data.rootAnimeId || initialSeasonId;
          setRootAnimeId(resolvedRoot);
          rootAnimeIdRef.current = resolvedRoot;
          globalRootAnimeIdCache.set(initialSeasonId, resolvedRoot);
          globalRootAnimeIdCache.set(resolvedRoot, resolvedRoot);

          if (data.seasons && data.seasons.length > 0) {
            const mapped = mapSeasons(data.seasons);
            setSeasons(mapped);
            seasonsRef.current = mapped;
            globalSeasonsCache.set(initialSeasonId, mapped);
            globalSeasonsCache.set(resolvedRoot, mapped);

            for (const s of mapped) {
              if (s.anilistId) {
                globalRootAnimeIdCache.set(s.anilistId, resolvedRoot);
                globalSeasonsCache.set(s.anilistId, mapped);
              }
            }

            // If user arrived with a specific season (or direct sequel), resolve and load it now
            const targetId = selectedSeasonIdRef.current;
            loadSeasonEpisodes(targetId, mapped);
          } else {
            setIsLoadingEpisodes(false);
          }
        })
        .catch((err) => {
          console.warn("Failed to load anime seasons metadata:", err);
          setIsLoadingEpisodes(false);
        })
        .finally(() => {
          setIsLoadingSeasons(false);
        });
    } else {
      // Seasons already in global cache
      loadSeasonEpisodes(selectedSeasonIdRef.current, existingSeasons);
    }

    // Cleanup on unmount (e.g. navigating to Watch page)
    return () => {
      activeAbortControllerRef.current?.abort();
      activeEpisodeRequestIdRef.current++;
      activeBatchRequestIdRef.current++;
    };
  }, [initialSeasonId, mapSeasons, loadSeasonEpisodes]);

  // Batch changing inside the current season
  const handleBatchChange = (batchIndex: number) => {
    setActiveBatchIndex(batchIndex);
    activeBatchIndexRef.current = batchIndex;

    const currentSeasonId = selectedSeasonIdRef.current;
    const currentRootId = rootAnimeIdRef.current || initialSeasonId;
    const { seasonNumber, anilistId } = resolveSeasonInfo(
      currentSeasonId,
      seasonsRef.current
    );

    if (seasonNumber === null) return;

    const batchKey = buildCacheKey(currentRootId, seasonNumber, batchIndex);
    const cachedBatch = validateCacheEntry(
      globalEpisodesCache.get(batchKey),
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
        if (selectedSeasonIdRef.current !== currentSeasonId) return;
        if (activeBatchIndexRef.current !== batchIndex) return;

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

        globalEpisodesCache.set(batchKey, {
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

  // Determine resolved season number and status for current selected season
  const resolvedCurrentSeason = resolveSeasonInfo(selectedSeasonId, seasons);
  const currentSeasonNumber =
    resolvedCurrentSeason.seasonNumber ??
    (selectedSeasonId < 100
      ? selectedSeasonId
      : (anime?.title?.english || anime?.title?.romaji || "").match(/season\s+(\d+)/i)
      ? parseInt(
          (anime?.title?.english || anime?.title?.romaji || "").match(/season\s+(\d+)/i)![1],
          10
        )
      : 1);

  const matchedSeasonItem = seasons.find(
    (s) =>
      s.id === selectedSeasonId ||
      (resolvedCurrentSeason.anilistId && s.anilistId === resolvedCurrentSeason.anilistId) ||
      (currentSeasonNumber !== null && s.number === currentSeasonNumber)
  );

  let currentSeasonStatus = matchedSeasonItem?.status || null;

  if (!currentSeasonStatus) {
    if (resolvedCurrentSeason.anilistId && anime && resolvedCurrentSeason.anilistId === anime.id) {
      currentSeasonStatus = anime.status;
    } else if (selectedSeasonId === initialSeasonId && anime) {
      currentSeasonStatus = anime.status;
    } else if (resolvedCurrentSeason.anilistId && relations) {
      const match = relations.find((r) => r.id === resolvedCurrentSeason.anilistId);
      if (match) currentSeasonStatus = match.status;
    }

    if (!currentSeasonStatus && relations && currentSeasonNumber) {
      const match = relations.find((r) => {
        const regex = new RegExp(
          `(^|\\b)(?:season\\s*0*${currentSeasonNumber}|${currentSeasonNumber}(?:st|nd|rd|th)\\s*season)\\b`,
          "i"
        );
        return regex.test(r.title);
      });
      if (match) currentSeasonStatus = match.status;
    }
  }

  const isSeasonUnreleased = currentSeasonStatus === "NOT_YET_RELEASED";

  const rawSeasonImage =
    matchedSeasonItem?.coverImage ||
    anime?.bannerImage ||
    fallbackImage ||
    anime?.coverImage?.extraLarge ||
    anime?.coverImage?.large ||
    null;

  const currentSeasonImage = rawSeasonImage
    ? rawSeasonImage.replace("/cover/medium/", "/cover/large/")
    : null;

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
        ) : isSeasonUnreleased && episodes.length === 0 ? (
          <SeasonUnreleasedPanel
            seasonNumber={currentSeasonNumber}
            image={currentSeasonImage}
          />
        ) : (
          <Episodes
            episodes={episodes}
            fallbackImage={fallbackImage}
            seasonId={selectedSeasonId}
            totalEpisodes={totalEpisodes}
            activeBatchIndex={activeBatchIndex}
            onBatchChange={handleBatchChange}
            isLoadingBatch={isLoadingBatch}
            isUnreleased={isSeasonUnreleased}
            seasonNumber={currentSeasonNumber}
          />
        )}
      </div>
    </div>
  );
}
