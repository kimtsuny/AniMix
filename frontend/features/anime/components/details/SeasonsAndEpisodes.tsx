"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSeasonEpisodes } from "@/features/watch/api/services/episode.service";
import { Seasons } from "./Seasons/Seasons";
import { Episodes } from "./Episodes";
import { Relation } from "@/features/anime/types/relation";
import { Episode } from "@/features/anime/types/episode";
import { Loader2 } from "lucide-react";

interface SeasonsAndEpisodesProps {
  initialSeasonId: number;
  fallbackImage: string | null;
  initialSeasons?: (Relation & { number?: number })[];
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

  // Cache for episodes keyed by season ID (AniList ID or season number)
  const episodesCache = useRef<Record<number | string, Episode[]>>(
    initialEpisodes && initialEpisodes.length > 0
      ? { [initialSeasonId]: initialEpisodes }
      : {}
  );

  // URL derived season ID
  const urlSeasonParam = searchParams.get("season");
  const urlSeasonId = urlSeasonParam
    ? parseInt(urlSeasonParam, 10)
    : initialSeasonId;

  const [activeSeasonId, setActiveSeasonId] = useState<number>(urlSeasonId);
  const [seasons, setSeasons] = useState<(Relation & { number?: number })[]>(
    initialSeasons ?? []
  );
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes ?? []);
  const [rootAnimeId, setRootAnimeId] = useState<number>(
    propRootAnimeId ?? initialSeasonId
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialEpisodes || initialEpisodes.length === 0
  );

  const activeRequestIdRef = useRef<number>(0);
  const initialFetchInitiatedRef = useRef<boolean>(false);

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
        anilistId?: number | null;
      }>
    ): (Relation & { number?: number })[] => {
      return rawSeasons.map((s) => ({
        id: s.anilistId ?? s.id ?? s.number,
        number: s.number,
        title: s.title || `Season ${s.number}`,
        coverImage: null,
        relationType: "SEASON",
        format: "TV",
        status: null,
        startDate: null,
      }));
    },
    []
  );

  // 1. Initial season & episodes resolution (when not provided by server SSR)
  useEffect(() => {
    if (
      initialSeasons &&
      initialSeasons.length > 0 &&
      initialEpisodes &&
      initialEpisodes.length > 0
    ) {
      return;
    }
    if (initialFetchInitiatedRef.current) return;
    initialFetchInitiatedRef.current = true;

    const currentRequestId = ++activeRequestIdRef.current;
    setIsLoading(true);

    getSeasonEpisodes(initialSeasonId, 0)
      .then((data) => {
        if (currentRequestId !== activeRequestIdRef.current) return;

        const resolvedRootId = data.anime?.anilistId || initialSeasonId;
        setRootAnimeId(resolvedRootId);

        const mappedSeasons = mapSeasons(data.seasons || []);
        setSeasons(mappedSeasons);

        const currentSeasonNum = data.season?.number || 1;
        const currentSeasonAnilistId =
          data.season?.anilistId ?? initialSeasonId;

        const mappedEpisodes = mapEpisodes(
          data.season?.episodes || [],
          resolvedRootId,
          currentSeasonNum
        );

        // Populate cache
        episodesCache.current[currentSeasonAnilistId] = mappedEpisodes;
        episodesCache.current[currentSeasonNum] = mappedEpisodes;
        episodesCache.current[initialSeasonId] = mappedEpisodes;

        // If the URL requests this season (or default season), set active episodes
        if (
          urlSeasonId === currentSeasonAnilistId ||
          urlSeasonId === initialSeasonId
        ) {
          setEpisodes(mappedEpisodes);
          setActiveSeasonId(currentSeasonAnilistId);
          setIsLoading(false);
        } else {
          // If the user arrived with a specific ?season= that is different from initial
          const targetSeason = mappedSeasons.find((s) => s.id === urlSeasonId);
          const targetSeasonNumber = targetSeason?.number ?? 1;

          getSeasonEpisodes(resolvedRootId, targetSeasonNumber)
            .then((targetData) => {
              if (currentRequestId !== activeRequestIdRef.current) return;
              const targetEpisodes = mapEpisodes(
                targetData.season?.episodes || [],
                resolvedRootId,
                targetSeasonNumber
              );
              episodesCache.current[urlSeasonId] = targetEpisodes;
              episodesCache.current[targetSeasonNumber] = targetEpisodes;
              setEpisodes(targetEpisodes);
              setActiveSeasonId(urlSeasonId);
            })
            .catch((err) => {
              console.warn("Failed to load requested season episodes:", err);
            })
            .finally(() => {
              if (currentRequestId === activeRequestIdRef.current) {
                setIsLoading(false);
              }
            });
        }
      })
      .catch((err) => {
        if (currentRequestId !== activeRequestIdRef.current) return;
        console.warn("Failed to fetch AniMix season episodes:", err);
        setIsLoading(false);
      });
  }, [
    initialSeasonId,
    initialSeasons,
    initialEpisodes,
    urlSeasonId,
    mapEpisodes,
    mapSeasons,
  ]);

  // 2. Season switching effect
  useEffect(() => {
    // Skip if still in initial uninitialized state
    if (seasons.length === 0) return;

    if (episodesCache.current[urlSeasonId]) {
      setEpisodes(episodesCache.current[urlSeasonId]);
      setActiveSeasonId(urlSeasonId);
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    setIsLoading(true);

    const targetSeason = seasons.find((s) => s.id === urlSeasonId);
    const targetSeasonNumber = targetSeason?.number ?? 1;
    const targetAnimeId = rootAnimeId || initialSeasonId;

    getSeasonEpisodes(targetAnimeId, targetSeasonNumber)
      .then((data) => {
        if (currentRequestId !== activeRequestIdRef.current) return;

        const resolvedRootId = data.anime?.anilistId || targetAnimeId;
        const resolvedSeasonNum = data.season?.number || targetSeasonNumber;
        const newEpisodes = mapEpisodes(
          data.season?.episodes || [],
          resolvedRootId,
          resolvedSeasonNum
        );

        episodesCache.current[urlSeasonId] = newEpisodes;
        episodesCache.current[resolvedSeasonNum] = newEpisodes;

        setEpisodes(newEpisodes);
        setActiveSeasonId(urlSeasonId);
      })
      .catch((err) => {
        if (currentRequestId !== activeRequestIdRef.current) return;
        console.warn("Failed to load season episodes:", err);
      })
      .finally(() => {
        if (currentRequestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [urlSeasonId, seasons, rootAnimeId, initialSeasonId, mapEpisodes]);

  const handleSeasonSelect = (id: number) => {
    if (id === activeSeasonId) return;
    router.push(`?season=${id}`, { scroll: false });
  };

  return (
    <div className="space-y-3 relative">
      <Seasons
        seasons={seasons}
        activeSeasonId={activeSeasonId}
        onSeasonSelect={handleSeasonSelect}
      />

      <div
        className={`transition-opacity duration-300 relative min-h-[200px] ${
          isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <Episodes
          episodes={episodes}
          fallbackImage={fallbackImage}
          seasonId={activeSeasonId}
        />
      </div>
    </div>
  );
}
