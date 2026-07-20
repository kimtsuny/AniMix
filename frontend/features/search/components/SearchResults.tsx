"use client";

import { useSearchStore } from "../store/search.store";
import { SearchItem } from "./SearchItem";
import { SearchLoading } from "./SearchLoading";
import { SearchEmpty } from "./SearchEmpty";
import { SearchError } from "./SearchError";

export function SearchResults() {
  const { status, results, selectedIndex } = useSearchStore();

  if (status === "idle") {
    return null;
  }

  return (
    <div
      className="mt-2 w-full bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      role="listbox"
      id="search-results"
    >
      <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
        {status === "loading" && <SearchLoading />}
        
        {status === "error" && <SearchError />}
        
        {status === "empty" && <SearchEmpty />}
        
        {status === "success" && (
          <div className="py-2">
            {results.map((anime, index) => (
              <SearchItem
                key={anime.id}
                anime={anime}
                index={index}
                isHighlighted={index === selectedIndex}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
