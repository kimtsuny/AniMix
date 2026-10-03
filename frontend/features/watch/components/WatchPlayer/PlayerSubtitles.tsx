"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Subtitle } from "../../api/services/stream.service";
import { LanguageMenuRow } from "./LanguageMenuRow";
import { PlayerTooltip } from "./PlayerTooltip";

/**
 * YouTube / ReAnime style Closed Captions (CC) icon matching the reference image.
 */
function CcIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
      <path d="M10 10.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0" />
      <path d="M17 10.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

interface PlayerSubtitlesProps {
  subtitles: Subtitle[];
  activeSubtitleIndex: number | null;
  onSubtitleChange: (index: number | null) => void;
}

export function PlayerSubtitles({
  subtitles,
  activeSubtitleIndex,
  onSubtitleChange,
}: PlayerSubtitlesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClickOutside]);

  // Handle Escape key to close menu
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const hasSubtitles = subtitles.length > 0;
  const isActive = activeSubtitleIndex !== null;

  if (!hasSubtitles) {
    return (
      <PlayerTooltip label="Subtitles">
        <button
          className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full flex items-center justify-center text-white/25 cursor-not-allowed flex-shrink-0"
          aria-label="Subtitles unavailable"
          disabled
        >
          <CcIcon className="size-5" />
        </button>
      </PlayerTooltip>
    );
  }

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <PlayerTooltip label="Subtitles" disabled={isOpen}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0 ${
            isOpen ? "bg-white/15 text-white" : ""
          } ${
            isActive
              ? "text-[#e63946]"
              : "text-white/90 hover:text-white"
          }`}
          aria-label="Subtitles"
        >
          <CcIcon className="size-5" />
          {isActive && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#e63946]" />
          )}
        </button>
      </PlayerTooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute bottom-full right-0 mb-3 w-[265px] sm:w-[275px] max-w-[calc(100vw-24px)] rounded-2xl bg-[#131215]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 p-1.5 z-50 overflow-hidden"
          >
            <div className="flex flex-col space-y-0.5">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/60 tracking-wider uppercase border-b border-white/[0.06] mb-0.5">
                <CcIcon className="size-4 text-white/60" />
                <span>Subtitles</span>
              </div>

              <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {/* Off option */}
                <LanguageMenuRow
                  label="Off"
                  isSelected={activeSubtitleIndex === null}
                  onClick={() => {
                    onSubtitleChange(null);
                    setIsOpen(false);
                  }}
                />

                {/* Subtitle options */}
                {subtitles.map((subtitle, index) => (
                  <LanguageMenuRow
                    key={`${subtitle.language}-${index}`}
                    label={subtitle.label}
                    language={subtitle.language}
                    isSelected={activeSubtitleIndex === index}
                    onClick={() => {
                      onSubtitleChange(index);
                      setIsOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
