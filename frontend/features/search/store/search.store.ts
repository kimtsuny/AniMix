"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  createElement,
  type ReactNode,
} from "react";
import type { SearchAnime, SearchStatus } from "../types/search.types";

// ─── Store shape ───

interface SearchStoreState {
  isOpen: boolean;
  query: string;
  results: SearchAnime[];
  status: SearchStatus;
  selectedIndex: number;
}

interface SearchStoreActions {
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchAnime[]) => void;
  setStatus: (status: SearchStatus) => void;
  setSelectedIndex: (index: number) => void;
  reset: () => void;
}

type SearchStore = SearchStoreState & SearchStoreActions;

// ─── Context ───

const SearchContext = createContext<SearchStore | null>(null);

// ─── Provider ───

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchAnime[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setStatus("idle");
    setSelectedIndex(-1);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setStatus("idle");
    setSelectedIndex(-1);
  }, []);

  const store = useMemo<SearchStore>(
    () => ({
      isOpen,
      query,
      results,
      status,
      selectedIndex,
      openSearch,
      closeSearch,
      setQuery,
      setResults,
      setStatus,
      setSelectedIndex,
      reset,
    }),
    [isOpen, query, results, status, selectedIndex, openSearch, closeSearch, reset]
  );

  return createElement(
    SearchContext.Provider,
    { value: store },
    children
  );
}

// ─── Consumer hook ───

export function useSearchStore(): SearchStore {
  const store = useContext(SearchContext);
  if (!store) {
    throw new Error("useSearchStore must be used within a SearchProvider");
  }
  return store;
}
