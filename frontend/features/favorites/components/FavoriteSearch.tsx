"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

interface FavoriteSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function FavoriteSearch({ search, onSearchChange }: FavoriteSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clearSearch = () => {
    onSearchChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex items-center w-full h-14 px-5 gap-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 focus-within:border-white/20 focus-within:bg-white/[0.07]">
      <Search className="h-5 w-5 text-white/30 shrink-0" />

      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search your favorites..."
        className="flex-1 h-full bg-transparent border-none outline-none text-white text-base placeholder:text-white/30"
      />

      {search.length > 0 && (
        <button
          type="button"
          onClick={clearSearch}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0 cursor-pointer"
          aria-label="Clear search"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
