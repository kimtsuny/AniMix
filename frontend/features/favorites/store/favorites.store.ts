"use client";

import { useState, useMemo, useCallback } from "react";
import { mockFavorites } from "../data/mock-favorites";
import type { FavoriteAnime, FavoriteFilter, FavoriteSort } from "../types/favorite.types";

export interface FavoritesStore {
  /** All favorites (source of truth) */
  favorites: FavoriteAnime[];
  /** Filtered + sorted list ready for rendering */
  filteredFavorites: FavoriteAnime[];
  /** Total count (before search/filter) */
  totalCount: number;

  /** Current search query */
  search: string;
  setSearch: (value: string) => void;

  /** Active format filter */
  selectedFilter: FavoriteFilter;
  setSelectedFilter: (filter: FavoriteFilter) => void;

  /** Active sort option */
  selectedSort: FavoriteSort;
  setSelectedSort: (sort: FavoriteSort) => void;

  /** Toggle an anime's favorite status (remove/re-add) */
  toggleFavorite: (id: number) => void;
}

export function useFavoritesStore(): FavoritesStore {
  const [favorites, setFavorites] = useState<FavoriteAnime[]>(mockFavorites);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FavoriteFilter>("All");
  const [selectedSort, setSelectedSort] = useState<FavoriteSort>("newest");

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) =>
      prev.map((anime) =>
        anime.id === id ? { ...anime, favorite: !anime.favorite } : anime
      )
    );
  }, []);

  const filteredFavorites = useMemo(() => {
    let result = favorites.filter((anime) => anime.favorite);

    // Search
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter((anime) =>
        anime.title.toLowerCase().includes(query)
      );
    }

    // Filter by format
    if (selectedFilter !== "All") {
      result = result.filter((anime) => anime.format === selectedFilter);
    }

    // Sort
    switch (selectedSort) {
      case "newest":
        result = [...result].sort(
          (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
        break;
      case "highest":
        result = [...result].sort((a, b) => b.score - a.score);
        break;
      case "alphabetical":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [favorites, search, selectedFilter, selectedSort]);

  const totalCount = useMemo(
    () => favorites.filter((a) => a.favorite).length,
    [favorites]
  );

  return {
    favorites,
    filteredFavorites,
    totalCount,
    search,
    setSearch,
    selectedFilter,
    setSelectedFilter,
    selectedSort,
    setSelectedSort,
    toggleFavorite,
  };
}
