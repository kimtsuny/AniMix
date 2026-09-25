"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Film, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import type { FavoriteAnime } from "../types/favorite.types";

interface FavoriteCardProps {
  anime: FavoriteAnime;
  index: number;
  onToggleFavorite?: (id: number) => void;
}

export function FavoriteCard({ anime, index }: FavoriteCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: "easeOut",
      }}
      className="group/card"
    >
      <Link href={`/anime/${anime.id}`} scroll>
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-white/5 shadow-md shadow-black/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 18vw, 15vw"
            className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.04]"
          />

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          {/* Three dots menu */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110 hover:bg-black/60 cursor-pointer opacity-0 group-hover/card:opacity-100"
            aria-label="More options"
          >
            <MoreVertical className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>

        {/* Info */}
        <div className="pt-2.5 px-0.5 space-y-1">
          {/* Title */}
          <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-white leading-snug group-hover/card:text-red-400 transition-colors duration-300">
            {anime.title}
          </h3>

          {/* Year · Format */}
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
            {anime.year} · {anime.format}
          </p>

          {/* Score */}
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500" fill="currentColor" />
            <span className="text-[11px] sm:text-xs font-bold text-yellow-500">
              {anime.score.toFixed(2)}
            </span>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {anime.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="inline-block rounded-full bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-neutral-400 leading-tight"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Episodes */}
          <div className="flex items-center gap-1 pt-0.5 text-neutral-500">
            <Film className="h-3 w-3" />
            <span className="text-[10px] sm:text-[11px] font-medium">
              {anime.episodes >= 1000 ? "1000+" : anime.episodes} Episode{anime.episodes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
