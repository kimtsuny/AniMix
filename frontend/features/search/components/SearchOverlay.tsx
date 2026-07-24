"use client";

import { useEffect } from "react";
import { useSearchStore } from "../store/search.store";
import { useSearch } from "../hooks/useSearch";

/**
 * Invisible wiring component — manages the search API lifecycle
 * and global keyboard shortcuts. All visible UI is handled by
 * BottomNavigation.
 */
export function SearchOverlay() {
  const { openSearch } = useSearchStore();

  // Initialize the search hook which manages API calls
  useSearch();

  // Handle global shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K opens search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openSearch]);

  return null;
}
