"use client";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth";
import { HttpError } from "@/shared/api/http-client";
import { getFavoriteAnime } from "../api/services/favorites.service";
import { useFavoritesStore } from "../store/favorites.store";
import { FavoriteSearch } from "./FavoriteSearch";
import { FavoriteFilters } from "./FavoriteFilters";
import { FavoriteGrid } from "./FavoriteGrid";
import { EmptyFavorites } from "./EmptyFavorites";

export function FavoriteScreen() {
  const {
    setFavorites,
    filteredFavorites,
    search,
    setSearch,
    selectedFilter,
    setSelectedFilter,
    selectedSort,
    setSelectedSort,
    toggleFavorite,
  } = useFavoritesStore();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setFavorites([]);
      return;
    }

    let isMounted = true;

    async function loadFavorites() {
      try {
        const favorites = await getFavoriteAnime();

        if (isMounted) {
          setFavorites(favorites);
        }
      } catch (error) {
        if (!isMounted) return;

        if (
          (error instanceof HttpError && error.status === 401) ||
          (error as any)?.status === 401 ||
          (error as any)?.message === "Unauthorized"
        ) {
          setFavorites([]);
          return;
        }

        console.error("Failed to load favorites:", error);
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading, setFavorites]);

  return (
    <div className="w-full mx-auto px-6 md:px-12 xl:px-20 pt-20 md:pt-24 space-y-6 md:space-y-8">
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
