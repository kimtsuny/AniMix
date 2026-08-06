"use client";

import { ChevronDown } from "lucide-react";
import type { FavoriteSort as FavoriteSortType } from "../types/favorite.types";

interface FavoriteSortProps {
  selectedSort: FavoriteSortType;
  onSortChange: (sort: FavoriteSortType) => void;
}

const sortLabels: Record<FavoriteSortType, string> = {
  newest: "Newest Added",
  highest: "Highest Rated",
  alphabetical: "Alphabetical",
};

export function FavoriteSort({ selectedSort, onSortChange }: FavoriteSortProps) {
  return (
    <div className="relative flex items-center gap-2 shrink-0">
      <span className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider hidden sm:block">
        Sort by
      </span>

      <div className="relative">
        <select
          value={selectedSort}
          onChange={(e) => onSortChange(e.target.value as FavoriteSortType)}
          className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-white backdrop-blur-md outline-none cursor-pointer transition-all duration-300 hover:bg-white/10 focus:border-white/20"
        >
          {(Object.keys(sortLabels) as FavoriteSortType[]).map((key) => (
            <option key={key} value={key} className="bg-neutral-900 text-white">
              {sortLabels[key]}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
      </div>
    </div>
  );
}
