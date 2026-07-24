"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSearchStore } from "../store/search.store";
import { SearchItem } from "./SearchItem";
import { SearchLoading } from "./SearchLoading";
import { SearchEmpty } from "./SearchEmpty";
import { SearchError } from "./SearchError";

const panelVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
} as const;

export function SearchResults() {
  const { status, results, selectedIndex } = useSearchStore();

  if (status === "idle") {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="
          absolute bottom-full left-0 right-0 mb-3
          bg-zinc-950/90 backdrop-blur-2xl
          border border-white/10
          rounded-2xl
          overflow-hidden
          shadow-[0_-8px_40px_rgba(0,0,0,0.5),0_0_12px_rgba(255,255,255,0.04)]
        "
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
      </motion.div>
    </AnimatePresence>
  );
}
