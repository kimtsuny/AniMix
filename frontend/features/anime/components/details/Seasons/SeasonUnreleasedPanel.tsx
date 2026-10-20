"use client";

import Image from "next/image";
import { useState } from "react";
import { CalendarDays, Film } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SeasonUnreleasedPanelProps {
  seasonNumber: number | string;
  image?: string | null;
  className?: string;
}

export function SeasonUnreleasedPanel({
  seasonNumber,
  image,
  className,
}: SeasonUnreleasedPanelProps) {
  const [imageError, setImageError] = useState(false);
  const resolvedImage = image
    ? image.replace("/cover/medium/", "/cover/large/")
    : null;
  const showImage = Boolean(resolvedImage && !imageError);

  return (
    <div
      className={cn(
        "relative w-full rounded-xl sm:rounded-2xl overflow-hidden border border-[#E63946]/30 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-black/95 p-3.5 sm:p-4 md:p-5 shadow-xl backdrop-blur-md",
        className
      )}
    >
      {/* Subtle atmospheric glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#E63946]/5 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-[#E63946]/[0.02] rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 md:gap-6">
        {/* Left: Compact cinematic landscape artwork */}
        <div className="relative w-full sm:w-[240px] md:w-[280px] lg:w-[300px] max-w-[340px] shrink-0 aspect-video rounded-lg sm:rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg bg-zinc-900/80">
          {showImage && resolvedImage ? (
            <>
              <Image
                src={resolvedImage}
                alt={`Season ${seasonNumber} Artwork`}
                fill
                sizes="(max-width: 640px) 100vw, 600px"
                className="object-cover object-center"
                onError={() => setImageError(true)}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800/80 via-zinc-900 to-black text-zinc-600 gap-2">
              <Film className="h-8 w-8 text-zinc-500/40" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500/60 font-medium">
                Season {seasonNumber} Artwork
              </span>
            </div>
          )}
        </div>

        {/* Right: Season status information */}
        <div className="flex flex-col justify-center w-full min-w-0 py-0.5">
          {/* Small red uppercase label */}
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E63946] mb-1 block">
            SEASON {seasonNumber}
          </span>

          {/* Main heading */}
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight leading-snug mb-1">
            This season hasn&apos;t premiered yet.
          </h3>

          {/* Supporting text */}
          <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed mb-3">
            The episodes are not available at the moment.
            <br className="hidden sm:inline" /> Stay tuned for its release on AniMix.
          </p>

          {/* Compact status container */}
          <div className="w-fit max-w-full rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm px-3 py-2 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-3">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-[#E63946] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#E63946] block">
                COMING SOON
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 block mt-0.5">
                The official release date has not been announced yet.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
