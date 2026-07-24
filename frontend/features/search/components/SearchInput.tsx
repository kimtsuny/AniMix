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
    }, 100);
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
    <div className="relative flex items-center w-full h-full px-4 gap-3">
      <Search
        size={20}
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
        className="w-full h-full bg-transparent border-none outline-none text-white text-base placeholder:text-white/30"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="search-results"
        aria-activedescendant={selectedIndex >= 0 ? `search-item-${selectedIndex}` : undefined}
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={clearQuery}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0 cursor-pointer"
          aria-label="Clear search"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
