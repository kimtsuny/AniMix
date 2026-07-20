"use client";

import { AlertCircle } from "lucide-react";
import { useSearchStore } from "../store/search.store";
import { searchAnime } from "../api/services/search.service";

export function SearchError() {
  const { query, setStatus, setResults } = useSearchStore();

  const handleRetry = async () => {
    setStatus("loading");
    try {
      const results = await searchAnime(query.trim());
      setResults(results);
      setStatus(results.length > 0 ? "success" : "empty");
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-red-500/10 p-4 rounded-full mb-4">
        <AlertCircle size={32} className="text-red-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-white/90 font-medium text-lg mb-2">
        Something went wrong
      </h3>
      <p className="text-white/50 text-sm mb-6 max-w-[280px]">
        We encountered an error while searching for anime. Please try again.
      </p>
      <button
        type="button"
        onClick={handleRetry}
        className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
