"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchStore } from "../store/search.store";
import { useSearch } from "../hooks/useSearch";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { SearchBackdrop } from "./SearchBackdrop";
import { SearchPanel } from "./SearchPanel";

export function SearchOverlay() {
  const { isOpen, closeSearch, openSearch } = useSearchStore();
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Handle clicks outside the search container
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      closeSearch();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <SearchBackdrop onClick={handleOverlayClick}>
          <div ref={overlayRef} className="absolute inset-0 z-[-1]" />
          <SearchPanel>
            <SearchInput />
            <SearchResults />
          </SearchPanel>
        </SearchBackdrop>
      )}
    </AnimatePresence>
  );
}
