"use client";

import { Heart } from "lucide-react";
import type { FavoriteFilter, FavoriteSort as FavoriteSortType } from "../types/favorite.types";
import { FavoriteSort } from "./FavoriteSort";

interface FavoriteFiltersProps {
  selectedFilter: FavoriteFilter;
  onFilterChange: (filter: FavoriteFilter) => void;
  selectedSort: FavoriteSortType;
  onSortChange: (sort: FavoriteSortType) => void;
}

const filters: FavoriteFilter[] = ["All", "TV", "Movie", "OVA", "ONA"];

export function FavoriteFilters({
  selectedFilter,
  onFilterChange,
  selectedSort,
  onSortChange,
}: FavoriteFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => {
          const isActive = selectedFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}

        {/* Decorative "Favorites" chip */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-neutral-400">
          <Heart className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
          Favorites
        </div>
      </div>

      {/* Sort dropdown */}
      <FavoriteSort selectedSort={selectedSort} onSortChange={onSortChange} />
    </div>
  );
}
