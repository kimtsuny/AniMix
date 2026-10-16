import Image from "next/image";
import { memo } from "react";
import type { SectionAnime } from "../../../types/section-anime";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

interface AnimeCardProps {
  anime: SectionAnime;
  /**
   * "default" is the catalog size. "compact" is a smaller variant used in
   * denser contexts (e.g. the watch page's You Might Like row) where the card
   * is rendered at a fixed ~130–165px width.
   */
  size?: "default" | "compact";
}

function AnimeCard({ anime, size = "default" }: AnimeCardProps) {
  const compact = size === "compact";

  return (
    <Link
      href={`/anime/${anime.id}`}
      scroll={true}
      className="group/card block"
    >
      <div
        className={cn(
          "relative aspect-[2/3] w-full overflow-hidden bg-white/5 shadow-md shadow-black/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60",
          compact ? "rounded-[14px]" : "rounded-[18px]"
        )}
      >
        {anime.coverImage ? (
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes={
              compact
                ? "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 12.5vw"
                : "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 12.5vw"
            }
            className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
            No Image
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      </div>

      <div
        className={cn(
          "flex items-center justify-between px-1",
          compact ? "gap-2 pt-2.5" : "gap-3 pt-3"
        )}
      >
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "line-clamp-2 font-bold text-white leading-snug group-hover/card:text-[#e53946] transition-colors duration-300",
              compact ? "text-[13px]" : "text-sm"
            )}
          >
            {anime.title}
          </h3>
          <p
            className={cn(
              "mt-1 text-neutral-400 font-medium",
              compact ? "text-[11px] truncate" : "text-xs"
            )}
          >
            {[anime.season, anime.seasonYear].filter(Boolean).join(" ")}
          </p>
        </div>
        {anime.format && (
          <div className="shrink-0">
            <span
              className={cn(
                "inline-block rounded-full bg-white/5 border border-white/10 py-0.5 font-semibold text-neutral-300 uppercase tracking-wider",
                compact ? "px-2 text-[9px]" : "px-2.5 text-[10px]"
              )}
            >
              {anime.format}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default memo(AnimeCard);