"use client";

import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/shared/lib/utils";
import { RecommendationCard } from "./RecommendationCard";
import { useWatchRecommendations } from "@/features/watch/hooks/useWatchRecommendations";
import type { WatchRecommendation } from "./types";

export interface YouMightLikeProps {
  animeId?: number;
  recommendations?: WatchRecommendation[];
  isLoading?: boolean;
  error?: string | null;
  /**
   * When true, render the skeleton state even if recommendations are ready.
   * Used to keep the loading sequence ordered (episodes first, then
   * recommendations). Data is still fetched in the background.
   */
  isDeferred?: boolean;
}

/**
 * Responsive card width calculation based on available container width & horizontal gaps:
 * - Mobile (<640px): 2 cards visible -> gap 12px (0.75rem), 1 gap -> (100% - 0.75rem) / 2
 * - sm (640px-767px): 3 cards visible -> gap 12px (0.75rem), 2 gaps -> (100% - 1.5rem) / 3
 * - md (768px-1023px): 4 cards visible -> gap 14px (0.875rem), 3 gaps -> (100% - 2.625rem) / 4
 * - lg+ (1024px+ desktop): exactly 8 cards visible -> gap 14px (0.875rem), 7 gaps -> (100% - 6.125rem) / 8
 */
const CARD_BASIS =
  "shrink-0 min-w-0 basis-[calc((100%-0.75rem)/2)] sm:basis-[calc((100%-1.5rem)/3)] md:basis-[calc((100%-2.625rem)/4)] lg:basis-[calc((100%-6.125rem)/8)]";

const SECTION_CLASS = "w-full pt-4 pb-6 md:pt-5 md:pb-8 space-y-4";
const HEADING_CLASS =
  "text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]";

function SkeletonCard() {
  return (
    <div className="w-full">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-white/5">
        <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2.5 px-1">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3.5 w-3/4 rounded-md bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-md" />
          </div>
          <div className="h-3 w-1/2 rounded-md bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-md" />
          </div>
        </div>
        <div className="shrink-0">
          <div className="h-5 w-10 rounded-full bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function YouMightLike({
  animeId,
  recommendations: externalRecommendations,
  isLoading: externalIsLoading,
  error: externalError,
  isDeferred = false,
}: YouMightLikeProps) {
  // If animeId is provided and external recommendations are not supplied, fetch dynamically
  const shouldFetch =
    externalRecommendations === undefined && Boolean(animeId && animeId > 0);
  const fetched = useWatchRecommendations(shouldFetch && animeId ? animeId : 0);

  const recommendations = externalRecommendations ?? fetched.recommendations;
  const isLoading =
    isDeferred ||
    (externalIsLoading ?? (shouldFetch ? fetched.isLoading : false));
  const error = externalError ?? (shouldFetch ? fetched.error : null);

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  if (isLoading) {
    return (
      <section className={SECTION_CLASS} aria-label="You Might Like">
        <h2 className={HEADING_CLASS}>You Might Like</h2>
        <div className="overflow-hidden w-full -mx-1.5 px-1.5 py-1.5 -my-1.5">
          <div className="flex flex-nowrap gap-3 md:gap-3.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={CARD_BASIS}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={SECTION_CLASS} aria-label="You Might Like">
        <h2 className={HEADING_CLASS}>You Might Like</h2>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] py-8 text-center text-white/40 text-sm">
          Unable to load recommendations at this time.
        </div>
      </section>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <section className={SECTION_CLASS} aria-label="You Might Like">
        <h2 className={HEADING_CLASS}>You Might Like</h2>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] py-8 text-center text-white/40 text-sm">
          No recommendations found.
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("group/section relative", SECTION_CLASS)}
      aria-label="You Might Like"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={HEADING_CLASS}>You Might Like</h2>
      </div>

      {/* Embla Carousel Viewport */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full -mx-1.5 px-1.5 py-1.5 -my-1.5"
      >
        {/* Track with flex-nowrap and exact gaps matching CARD_BASIS */}
        <div className="flex flex-nowrap gap-3 md:gap-3.5">
          {recommendations.map((anime) => (
            <div key={anime.id} className={CARD_BASIS}>
              <RecommendationCard anime={anime} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
