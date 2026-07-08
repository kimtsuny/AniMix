"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSeasonEpisodes } from "@/features/anime/api/actions/details.actions";
import { Seasons } from "./Seasons/Seasons";
import { Episodes } from "./Episodes";
import { Relation } from "@/features/anime/types/relation";
import { Episode } from "@/features/anime/types/episode";
import { Loader2 } from "lucide-react";

interface SeasonsAndEpisodesProps {
  seasons: Relation[];
  initialEpisodes: Episode[];
  initialSeasonId: number;
  fallbackImage: string | null;
}

export function SeasonsAndEpisodes({ seasons, initialEpisodes, initialSeasonId, fallbackImage }: SeasonsAndEpisodesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cache for episodes
  const episodesCache = useRef<Record<number, Episode[]>>({ [initialSeasonId]: initialEpisodes });

  // URL derived season ID
  const urlSeasonParam = searchParams.get("season");
  const urlSeasonId = urlSeasonParam ? parseInt(urlSeasonParam, 10) : initialSeasonId;

  const [activeSeasonId, setActiveSeasonId] = useState<number>(urlSeasonId);
  const [episodes, setEpisodes] = useState<Episode[]>(episodesCache.current[urlSeasonId] || initialEpisodes);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (urlSeasonId !== activeSeasonId) {
      if (episodesCache.current[urlSeasonId]) {
        setEpisodes(episodesCache.current[urlSeasonId]);
        setActiveSeasonId(urlSeasonId);
      } else {
        setIsLoading(true);
        fetchSeasonEpisodes(urlSeasonId).then((newEpisodes) => {
          episodesCache.current[urlSeasonId] = newEpisodes;
          // Ensure the user hasn't navigated away while we were fetching
          const currentUrlSeason = parseInt(new URLSearchParams(window.location.search).get("season") || initialSeasonId.toString(), 10);
          if (currentUrlSeason === urlSeasonId) {
            setEpisodes(newEpisodes);
            setActiveSeasonId(urlSeasonId);
          }
        }).finally(() => {
          setIsLoading(false);
        });
      }
    }
  }, [urlSeasonId, activeSeasonId, initialSeasonId]);

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

      <div className={`transition-opacity duration-300 relative min-h-[200px] ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <Episodes episodes={episodes} fallbackImage={fallbackImage} />
      </div>
    </div>
  );
}
