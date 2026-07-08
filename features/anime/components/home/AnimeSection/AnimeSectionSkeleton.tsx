"use client";

import { memo } from "react";

const SKELETON_CARD_COUNT = 8;

function SkeletonCard() {
  return (
    <div className="w-full">
      {/* Card image placeholder — matches AnimeCard's aspect-[2/3] and rounded-[18px] */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[18px] bg-white/5">
        <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Text area placeholder — matches AnimeCard's pt-3 px-1 layout */}
      <div className="flex items-center justify-between gap-3 pt-3 px-1">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title line */}
          <div className="h-3.5 w-3/4 rounded-md bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-md" />
          </div>
          {/* Subtitle line */}
          <div className="h-3 w-1/2 rounded-md bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-md" />
          </div>
        </div>
        {/* Format badge placeholder */}
        <div className="shrink-0">
          <div className="h-5 w-10 rounded-full bg-white/5">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnimeSectionSkeletonProps {
  title?: string;
}

function AnimeSectionSkeleton({ title }: AnimeSectionSkeletonProps) {
  return (
    <section className="w-full space-y-5" aria-hidden="true">
      {/* Section header — matches AnimeSection header layout */}
      <div className="flex items-baseline justify-between gap-4">
        {title ? (
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
            {title}
          </h2>
        ) : (
          <div className="h-7 w-48 rounded-lg bg-white/5 sm:h-[1.7rem]">
            <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-lg" />
          </div>
        )}
        {/* "See All" placeholder */}
        <div className="h-4 w-14 rounded-md bg-white/5" />
      </div>

      {/* Cards grid — uses CSS grid to match Swiper's breakpoint layout */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-3.5 lg:grid-cols-4 lg:gap-3.5 xl:grid-cols-8 xl:gap-4">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

export default memo(AnimeSectionSkeleton);
