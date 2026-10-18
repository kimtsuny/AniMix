"use client";

import { useMemo, useState } from "react";
import { Episode } from "@/features/anime/types/episode";
import { EpisodeCard } from "./EpisodeCard";
import { EpisodesSkeleton } from "./EpisodesSkeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/shared/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  DEFAULT_BATCH_SIZE,
  calculateEpisodeBatches,
  calculateBatchesFromCount,
  getBatchEpisodes,
  shouldShowEpisodeRangeSelector,
} from "@/features/watch/utils/episodeBatching";
import { EpisodeRangeSelector } from "@/features/watch/components/EpisodeSelector/EpisodeRangeSelector";

interface EpisodesProps {
  episodes: Episode[];
  fallbackImage?: string | null;
  seasonId?: number | string;
  totalEpisodes?: number;
  activeBatchIndex?: number;
  onBatchChange?: (batchIndex: number) => void;
  isLoadingBatch?: boolean;
}

export function Episodes({
  episodes,
  fallbackImage,
  seasonId,
  totalEpisodes,
  activeBatchIndex: controlledBatchIndex,
  onBatchChange,
  isLoadingBatch = false,
}: EpisodesProps) {
  const [prevSeasonId, setPrevSeasonId] = useState(seasonId);
  const [internalBatchIndex, setInternalBatchIndex] = useState(0);

  // When season changes, reset active batch index back to 0 during render
  if (seasonId !== prevSeasonId) {
    setPrevSeasonId(seasonId);
    setInternalBatchIndex(0);
  }

  const activeBatchIndex = controlledBatchIndex ?? internalBatchIndex;

  const isServerPaged =
    totalEpisodes !== undefined && totalEpisodes > episodes.length;

  const batches = useMemo(() => {
    if (isServerPaged) {
      const firstEpNum = episodes[0]?.number ?? 1;
      return calculateBatchesFromCount(
        totalEpisodes,
        firstEpNum,
        DEFAULT_BATCH_SIZE
      );
    }
    return calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
  }, [isServerPaged, totalEpisodes, episodes]);

  const clampedBatchIndex = useMemo(() => {
    if (batches.length === 0) return 0;
    return Math.max(0, Math.min(activeBatchIndex, batches.length - 1));
  }, [activeBatchIndex, batches.length]);

  const batchEpisodes = useMemo<Episode[]>(() => {
    if (isServerPaged) {
      return episodes;
    }
    if (!batches || batches.length <= 1) {
      return episodes;
    }
    return getBatchEpisodes<Episode>(
      episodes,
      clampedBatchIndex,
      DEFAULT_BATCH_SIZE
    );
  }, [isServerPaged, episodes, batches, clampedBatchIndex]);

  const showRangeSelector = shouldShowEpisodeRangeSelector(
    totalEpisodes ?? episodes?.length ?? 0
  );

  const hasEpisodes = episodes && episodes.length > 0;

  if (!hasEpisodes && !fallbackImage) {
    return null;
  }

  const handleSelectBatch = (index: number) => {
    setInternalBatchIndex(index);
    onBatchChange?.(index);
  };

  return (
    <div className="w-full">
      {showRangeSelector && (
        <EpisodeRangeSelector
          batches={batches}
          activeBatchIndex={clampedBatchIndex}
          onSelectBatch={handleSelectBatch}
        />
      )}

      {isLoadingBatch ? (
        <EpisodesSkeleton count={5} />
      ) : (
        <Carousel
          key={`carousel-${seasonId ?? "s"}-${clampedBatchIndex}`}
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full group/episodes relative"
        >
          <CarouselContent className="-ml-4">
            {hasEpisodes ? (
              batchEpisodes.map((episode, index) => (
                <CarouselItem
                  key={episode.number ?? index}
                  className="pl-4 basis-auto"
                >
                  <EpisodeCard episode={episode} />
                </CarouselItem>
              ))
            ) : (
              <CarouselItem className="pl-4 basis-auto">
                <Link
                  href="#"
                  className="group block w-[280px] md:w-[320px] shrink-0 cursor-not-allowed opacity-80"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-muted ring-1 ring-border/50">
                    <Image
                      src={fallbackImage!}
                      alt="Fallback Image"
                      fill
                      sizes="(max-width: 768px) 280px, 320px"
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                        <Play className="h-5 w-5 ml-1 fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
                      Episode 1
                    </span>
                    <h3 className="font-medium text-sm text-foreground/90">
                      Watch Full Series
                    </h3>
                  </div>
                </Link>
              </CarouselItem>
            )}
          </CarouselContent>

          <CarouselPrevious
            className={cn(
              "absolute left-4 top-1/2 z-20 -translate-y-1/2 h-10 w-10 rounded-full",
              "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
              "hover:scale-105 hover:bg-black/65",
              "opacity-0 pointer-events-none group-hover/episodes:opacity-100 group-hover/episodes:pointer-events-auto md:flex hidden items-center justify-center",
              "disabled:opacity-0 disabled:pointer-events-none"
            )}
          />
          <CarouselNext
            className={cn(
              "absolute right-4 top-1/2 z-20 -translate-y-1/2 h-10 w-10 rounded-full",
              "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
              "hover:scale-105 hover:bg-black/65",
              "opacity-0 pointer-events-none group-hover/episodes:opacity-100 group-hover/episodes:pointer-events-auto md:flex hidden items-center justify-center",
              "disabled:opacity-0 disabled:pointer-events-none"
            )}
          />
        </Carousel>
      )}
    </div>
  );
}
