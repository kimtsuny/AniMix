"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import type { SearchAnime } from "../types/search.types";
import { useSearchStore } from "../store/search.store";

interface SearchItemProps {
  anime: SearchAnime;
  isHighlighted: boolean;
  index: number;
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
} as const;

export function SearchItem({ anime, isHighlighted, index }: SearchItemProps) {
  const router = useRouter();
  const { setSelectedIndex, closeSearch } = useSearchStore();
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll into view when highlighted via keyboard
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isHighlighted]);

  const handleClick = () => {
    closeSearch();
    router.push(`/anime/${anime.id}`);
  };

  const handleMouseEnter = () => {
    setSelectedIndex(index);
  };

  return (
    <motion.div
      ref={itemRef}
      variants={itemVariants}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.08)" }}
      transition={{ duration: 0.15 }}
      className={`
        flex items-center gap-4 p-3 mx-2 my-1 rounded-xl
        cursor-pointer transition-colors duration-150
        ${
          isHighlighted
            ? "bg-white/10 ring-1 ring-white/20"
            : "bg-transparent"
        }
      `}
      role="option"
      aria-selected={isHighlighted}
      tabIndex={-1}
    >
      {/* Poster */}
      <div className="relative w-12 h-[72px] rounded-lg overflow-hidden bg-white/5 shrink-0">
        {anime.coverImage ? (
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 text-center p-1 leading-tight">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 justify-center">
        {/* Title */}
        <h4 className="text-white text-[15px] font-semibold truncate mb-1">
          {anime.title}
        </h4>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-white/50 truncate">
          {anime.seasonYear && <span>{anime.seasonYear}</span>}

          {anime.seasonYear && anime.format && (
            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
          )}

          {anime.format && <span>{anime.format}</span>}

          {anime.format && anime.episodes && (
            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
          )}

          {anime.episodes && (
            <span>
              {anime.episodes} {anime.episodes === 1 ? "Ep" : "Eps"}
            </span>
          )}

          {anime.averageScore ? (
            <>
              <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
              <div className="flex items-center gap-1 text-yellow-500/90 font-medium">
                <Star size={10} fill="currentColor" />
                <span>{anime.averageScore}%</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
