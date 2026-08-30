"use client";
import { useEffect } from "react";
import { getFavoriteAnime } from "../api/services/favorites.service";import { AnimatePresence } from "framer-motion";
import { useFavoritesStore } from "../store/favorites.store";
import { FavoriteHeader } from "./FavoriteHeader";
import { FavoriteSearch } from "./FavoriteSearch";
import { FavoriteFilters } from "./FavoriteFilters";
import { FavoriteGrid } from "./FavoriteGrid";
import { EmptyFavorites } from "./EmptyFavorites";

export function FavoriteScreen() {
  const {
    setFavorites,
    filteredFavorites,
    totalCount,
    search,
    setSearch,
    selectedFilter,
    setSelectedFilter,
    selectedSort,
    setSelectedSort,
    toggleFavorite,
  } = useFavoritesStore();
  
  useEffect(() => {
  async function loadFavorites() {
    try {
      const favorites = await getFavoriteAnime();

      console.log("Favorite anime:", favorites);

      setFavorites(favorites);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }

  loadFavorites();
}, [setFavorites]);
  return (
<div className="w-full mx-auto px-6 md:px-12 xl:px-20 pt-24 md:pt-28 space-y-6 md:space-y-8">      <FavoriteHeader totalCount={totalCount} />

      <FavoriteSearch search={search} onSearchChange={setSearch} />

      <FavoriteFilters
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />

      <AnimatePresence mode="wait">
        {filteredFavorites.length > 0 ? (
          <FavoriteGrid
            key="grid"
            favorites={filteredFavorites}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <EmptyFavorites key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}
