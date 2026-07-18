"use client";

import { memo } from "react";

/**
 * Skeleton placeholder for the HeroCarousel loading state.
 * Mirrors the exact layout of HeroSlide + HeroContent + ActionButtons + pagination dots.
 */
function HeroSkeleton() {
  return (
    <section
      className="relative w-full min-h-[670px] lg:h-[88vh] bg-black overflow-hidden"
      aria-hidden="true"
    >
      {/* Background shimmer — fills the entire hero area */}
      <div className="absolute inset-0 bg-white/[0.03]">
        <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      {/* Gradient overlays matching HeroBackground */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 via-30% to-transparent z-10" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 via-black/10 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 via-20% to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-10" />

      {/* Content area — positioned to match the bottom-left overlay */}
      <div className="absolute bottom-6 md:bottom-10 left-6 md:left-22 right-6 md:right-6 z-30 flex items-end justify-between pointer-events-none select-none">
        <div className="flex flex-col items-start gap-7 max-w-[42rem]">
          {/* Skeleton content mimicking HeroContent */}
          <div className="flex w-full flex-col items-start gap-4 sm:gap-5 md:gap-6">
            {/* Status badge placeholder */}
            <div className="h-10 w-36 rounded-full bg-white/[0.06]">
              <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-full" />
            </div>

            {/* Title placeholder — two lines */}
            <div className="flex flex-col gap-3 w-full">
              <div className="h-8 w-80 max-w-full rounded-lg bg-white/[0.06] sm:h-10 md:h-12 lg:h-14">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-lg" />
              </div>
              <div className="h-8 w-52 max-w-full rounded-lg bg-white/[0.06] sm:h-10 md:h-12 lg:h-14">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-lg" />
              </div>
            </div>

            {/* Metadata row placeholder (rating · year · type · episodes · duration) */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-12 rounded bg-white/[0.06]" />
              <div className="h-1 w-1 rounded-full bg-zinc-500/40" />
              <div className="h-4 w-10 rounded bg-white/[0.06]" />
              <div className="h-1 w-1 rounded-full bg-zinc-500/40" />
              <div className="h-5 w-10 rounded bg-white/[0.06]" />
              <div className="h-1 w-1 rounded-full bg-zinc-500/40" />
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
              <div className="h-1 w-1 rounded-full bg-zinc-500/40" />
              <div className="h-4 w-12 rounded bg-white/[0.06]" />
            </div>

            {/* Genre badges placeholder */}
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-16 rounded-full bg-white/[0.06]" />
              <div className="h-7 w-20 rounded-full bg-white/[0.06]" />
              <div className="h-7 w-14 rounded-full bg-white/[0.06]" />
              <div className="h-7 w-18 rounded-full bg-white/[0.06]" />
            </div>

            {/* Description placeholder — three lines */}
            <div className="flex flex-col gap-2 max-w-[38rem] w-full">
              <div className="h-3.5 w-full rounded bg-white/[0.06]">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded" />
              </div>
              <div className="h-3.5 w-[90%] rounded bg-white/[0.06]">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded" />
              </div>
              <div className="h-3.5 w-3/4 rounded bg-white/[0.06]">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded" />
              </div>
            </div>
          </div>

          {/* Action buttons + pagination */}
          <div className="flex flex-col items-start gap-4 w-fit">
            {/* Buttons row */}
            <div className="flex items-center gap-3">
              {/* Watch Now button placeholder */}
              <div className="h-12 w-40 rounded-full bg-white/[0.08]">
                <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-full" />
              </div>
              {/* More actions button placeholder */}
              <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
            </div>

            {/* Pagination dots placeholder */}
            <div className="flex gap-2">
              <div className="h-2 w-12 rounded-full bg-white/20" />
              <div className="h-2 w-6 rounded-full bg-white/[0.08]" />
              <div className="h-2 w-6 rounded-full bg-white/[0.08]" />
              <div className="h-2 w-6 rounded-full bg-white/[0.08]" />
              <div className="h-2 w-6 rounded-full bg-white/[0.08]" />
            </div>
          </div>
        </div>

        {/* Navigation arrows placeholder — right side, hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 -translate-x-16">
          <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
          <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </section>
  );
}

export default memo(HeroSkeleton);
