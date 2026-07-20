"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useSearchStore } from "../store/search.store";

export function SearchInput() {
  const { query, setQuery, results, selectedIndex, setSelectedIndex, closeSearch, status } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    // Small timeout ensures focus works correctly after framer-motion mount
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }

    if (status !== "success" || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(selectedIndex < results.length - 1 ? selectedIndex + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        // Find the selected item's DOM node and trigger a click
        // This is a simple way to reuse the routing logic in SearchItem
        const items = document.querySelectorAll('[role="option"]');
        if (items[selectedIndex]) {
          (items[selectedIndex] as HTMLElement).click();
        }
      }
    }
  };

  const clearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex items-center w-full h-14 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 shadow-lg focus-within:border-white/30 focus-within:bg-zinc-900/90 transition-all duration-200">
      <Search
        size={22}
        className="text-white/40 shrink-0"
        strokeWidth={2}
      />
      
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search anime..."
        className="w-full h-full bg-transparent border-none outline-none text-white text-lg px-4 placeholder:text-white/30"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="search-results"
        aria-activedescendant={selectedIndex >= 0 ? `search-item-${selectedIndex}` : undefined}
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={clearQuery}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0"
          aria-label="Clear search"
        >
          <X size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
