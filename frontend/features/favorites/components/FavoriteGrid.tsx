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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6">
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
