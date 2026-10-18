"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAnimeSeasons,
  getSeasonEpisodes,
} from "@/features/watch/api/services/episode.service";
import { Seasons } from "./Seasons/Seasons";
import { Episodes, EpisodesSkeleton } from "./Episodes";
import { Relation } from "@/features/anime/types/relation";
import { Episode } from "@/features/anime/types/episode";
import { DEFAULT_BATCH_SIZE } from "@/features/watch/utils/episodeBatching";

type SeasonItem = Relation & {
  number?: number;
  anilistId?: number | null;
  episodeCount?: number;
};

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cache for episodes keyed by structured keys: `anilist:${id}`, `num:${seasonNumber}`, `batch:${season}:${batch}`
  const episodesCache = useRef<Record<string, Episode[]>>(
    initialEpisodes && initialEpisodes.length > 0
      ? {
          [`anilist:${initialSeasonId}`]: initialEpisodes,
          [`id:${initialSeasonId}`]: initialEpisodes,
          [`num:1`]: initialEpisodes,
          [`batch:1:0`]: initialEpisodes,
        }
      : {}
  );

  // URL derived season ID
  const urlSeasonParam = searchParams.get("season");
  const urlSeasonId = urlSeasonParam
    ? parseInt(urlSeasonParam, 10)
    : initialSeasonId;

  const [activeSeasonId, setActiveSeasonId] = useState<number>(urlSeasonId);
  const [seasons, setSeasons] = useState<SeasonItem[]>(
    initialSeasons ?? []
  );
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes ?? []);
  const [totalEpisodes, setTotalEpisodes] = useState<number | undefined>(
    initialEpisodes?.length
  );
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);
  const [rootAnimeId, setRootAnimeId] = useState<number>(
    propRootAnimeId ?? initialSeasonId
  );

  // Independent loading states
  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(
    !initialSeasons || initialSeasons.length === 0
  );
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(
    !initialEpisodes || initialEpisodes.length === 0
  );
  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);

  const activeEpisodeRequestIdRef = useRef<number>(0);
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

  // 1. Initial independent concurrent fetches (seasons metadata + first episode batch)
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
          }
          if (data.seasons && data.seasons.length > 0) {
            const mapped = mapSeasons(data.seasons);
            setSeasons(mapped);
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
    if (!initialEpisodes || initialEpisodes.length === 0) {
      const currentRequestId = ++activeEpisodeRequestIdRef.current;
      setIsLoadingEpisodes(true);

      // If user came with ?season=X, resolve that season, otherwise resolve default (0)
      const targetSeasonParam = urlSeasonParam ? urlSeasonId : 0;

      getSeasonEpisodes(initialSeasonId, targetSeasonParam, {
        offset: 0,
        limit: DEFAULT_BATCH_SIZE,
      })
        .then((data) => {
          if (currentRequestId !== activeEpisodeRequestIdRef.current) return;

          const resolvedRootId = data.anime?.anilistId || initialSeasonId;
          setRootAnimeId(resolvedRootId);

          const resolvedSeasonNum = data.season?.number || 1;
          const resolvedSeasonAnilistId =
            data.season?.anilistId ?? initialSeasonId;

          const mappedEpisodes = mapEpisodes(
            data.season?.episodes || [],
            resolvedRootId,
            resolvedSeasonNum
          );

          const total =
            data.pagination?.total ??
            data.season?.episodes?.length ??
            mappedEpisodes.length;
          setTotalEpisodes(total);

          // Populate cache
          episodesCache.current[`anilist:${resolvedSeasonAnilistId}`] =
            mappedEpisodes;
          episodesCache.current[`num:${resolvedSeasonNum}`] = mappedEpisodes;
          episodesCache.current[`id:${resolvedSeasonAnilistId}`] =
            mappedEpisodes;
          episodesCache.current[`batch:${resolvedSeasonNum}:0`] =
            mappedEpisodes;

          setEpisodes(mappedEpisodes);
          setActiveSeasonId(resolvedSeasonAnilistId);
          setActiveBatchIndex(0);
        })
        .catch((err) => {
          if (currentRequestId !== activeEpisodeRequestIdRef.current) return;
          console.warn("Failed to fetch initial anime episodes:", err);
          setEpisodes([]);
        })
        .finally(() => {
          if (currentRequestId === activeEpisodeRequestIdRef.current) {
            setIsLoadingEpisodes(false);
          }
        });
    }
  }, [
    initialSeasonId,
    initialSeasons,
    initialEpisodes,
    urlSeasonId,
    urlSeasonParam,
    mapEpisodes,
    mapSeasons,
  ]);

  // 2. Season switching effect
  useEffect(() => {
    // Skip if seasons are not loaded yet or activeSeasonId matches urlSeasonId already
    if (seasons.length === 0) return;
    if (activeSeasonId === urlSeasonId && episodes.length > 0) return;

    const targetSeason = seasons.find(
      (s) => s.id === urlSeasonId || s.number === urlSeasonId
    );
    const targetSeasonNumber = targetSeason?.number ?? (urlSeasonId < 100 ? urlSeasonId : 1);
    const targetAnilistId =
      targetSeason?.anilistId ?? (urlSeasonId > 100 ? urlSeasonId : undefined);

    // Check cache
    const cached =
      (targetAnilistId
        ? episodesCache.current[`anilist:${targetAnilistId}`]
        : undefined) ??
      episodesCache.current[`num:${targetSeasonNumber}`] ??
      episodesCache.current[`id:${urlSeasonId}`];

    if (cached) {
      setEpisodes(cached);
      setActiveSeasonId(urlSeasonId);
      setActiveBatchIndex(0);
      setIsLoadingEpisodes(false);
      return;
    }

    const currentRequestId = ++activeEpisodeRequestIdRef.current;
    setActiveSeasonId(urlSeasonId);
    setActiveBatchIndex(0);
    setIsLoadingEpisodes(true);
    setEpisodes([]); // Clear previous season episodes to prevent showing stale cards under new button

    const targetAnimeId = rootAnimeId || initialSeasonId;

    getSeasonEpisodes(targetAnimeId, targetSeasonNumber, {
      offset: 0,
      limit: DEFAULT_BATCH_SIZE,
    })
      .then((data) => {
        if (currentRequestId !== activeEpisodeRequestIdRef.current) return;

        const resolvedRootId = data.anime?.anilistId || targetAnimeId;
        const resolvedSeasonNum = data.season?.number || targetSeasonNumber;
        const resolvedSeasonAnilistId =
          data.season?.anilistId ?? targetAnilistId ?? urlSeasonId;

        const newEpisodes = mapEpisodes(
          data.season?.episodes || [],
          resolvedRootId,
          resolvedSeasonNum
        );

        const total =
          data.pagination?.total ??
          data.season?.episodes?.length ??
          newEpisodes.length;
        setTotalEpisodes(total);

        // Populate cache
        episodesCache.current[`anilist:${resolvedSeasonAnilistId}`] =
          newEpisodes;
        episodesCache.current[`num:${resolvedSeasonNum}`] = newEpisodes;
        episodesCache.current[`id:${urlSeasonId}`] = newEpisodes;
        episodesCache.current[`batch:${resolvedSeasonNum}:0`] = newEpisodes;

        setEpisodes(newEpisodes);
      })
      .catch((err) => {
        if (currentRequestId !== activeEpisodeRequestIdRef.current) return;
        console.warn("Failed to load season episodes:", err);
        setEpisodes([]);
      })
      .finally(() => {
        if (currentRequestId === activeEpisodeRequestIdRef.current) {
          setIsLoadingEpisodes(false);
        }
      });
  }, [
    urlSeasonId,
    seasons,
    activeSeasonId,
    episodes.length,
    rootAnimeId,
    initialSeasonId,
    mapEpisodes,
  ]);

  const handleSeasonSelect = (id: number) => {
    if (id === activeSeasonId) return;
    router.push(`?season=${id}`, { scroll: false });
  };

  const handleBatchChange = (batchIndex: number) => {
    setActiveBatchIndex(batchIndex);

    const targetSeason = seasons.find(
      (s) => s.id === activeSeasonId || s.number === activeSeasonId
    );
    const targetSeasonNumber = targetSeason?.number ?? 1;

    const batchKey = `batch:${targetSeasonNumber}:${batchIndex}`;
    const cachedBatch = episodesCache.current[batchKey];

    if (cachedBatch) {
      setEpisodes(cachedBatch);
      return;
    }

    setIsLoadingBatch(true);
    const currentRequestId = ++activeEpisodeRequestIdRef.current;
    const targetAnimeId = rootAnimeId || initialSeasonId;

    getSeasonEpisodes(targetAnimeId, targetSeasonNumber, {
      offset: batchIndex * DEFAULT_BATCH_SIZE,
      limit: DEFAULT_BATCH_SIZE,
    })
      .then((data) => {
        if (currentRequestId !== activeEpisodeRequestIdRef.current) return;

        const resolvedRootId = data.anime?.anilistId || targetAnimeId;
        const mappedBatch = mapEpisodes(
          data.season?.episodes || [],
          resolvedRootId,
          targetSeasonNumber
        );

        episodesCache.current[batchKey] = mappedBatch;
        setEpisodes(mappedBatch);
      })
      .catch((err) => {
        if (currentRequestId !== activeEpisodeRequestIdRef.current) return;
        console.warn("Failed to load episode batch:", err);
      })
      .finally(() => {
        if (currentRequestId === activeEpisodeRequestIdRef.current) {
          setIsLoadingBatch(false);
        }
      });
  };

  return (
    <div className="space-y-3 relative">
      <Seasons
        seasons={seasons}
        activeSeasonId={activeSeasonId}
        onSeasonSelect={handleSeasonSelect}
        isLoading={isLoadingSeasons}
      />

      <div className="relative min-h-[200px]">
        {isLoadingEpisodes ? (
          <EpisodesSkeleton count={5} />
        ) : (
          <Episodes
            episodes={episodes}
            fallbackImage={fallbackImage}
            seasonId={activeSeasonId}
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
