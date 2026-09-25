"use client";

import { AnimatePresence } from "framer-motion";
import { FavoriteCard } from "./FavoriteCard";
import type { FavoriteAnime } from "../types/favorite.types";

interface FavoriteGridProps {
  favorites: FavoriteAnime[];
  onToggleFavorite: (id: number) => void;
}

export function FavoriteGrid({ favorites, onToggleFavorite }: FavoriteGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 sm:gap-4 lg:gap-4.5 xl:gap-5">
      <AnimatePresence mode="popLayout">
        {favorites.map((anime, index) => (
          <FavoriteCard
            key={anime.id}
            anime={anime}
            index={index}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
