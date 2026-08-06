"use client";

import { Heart } from "lucide-react";

interface FavoriteHeaderProps {
  totalCount: number;
}

export function FavoriteHeader({ totalCount }: FavoriteHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Heart
          className="h-6 w-6 text-red-500 shrink-0"
          fill="currentColor"
        />
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Favorites
        </h1>
      </div>
      <span className="text-sm font-medium text-neutral-400">
        <span className="text-white font-bold">{totalCount}</span>{" "}
        {totalCount === 1 ? "Title" : "Titles"}
      </span>
    </div>
  );
}
