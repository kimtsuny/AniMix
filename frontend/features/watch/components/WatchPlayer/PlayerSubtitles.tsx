"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import type { Subtitle } from "../../api/services/stream.service";

/**
 * YouTube-style Closed Captions (CC) icon matching the reference image.
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

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [isOpen, handleClickOutside]);

  const hasSubtitles = subtitles.length > 0;
  const isActive = activeSubtitleIndex !== null;

  if (!hasSubtitles) {
    return (
      <button
        className="p-2 rounded-lg transition-colors text-white/30 flex items-center justify-center cursor-not-allowed"
        aria-label="Subtitles unavailable"
        title="No subtitles available"
        disabled
      >
        <CcIcon className="size-5" />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ${
          isActive
            ? "text-[#e63946]"
            : "text-white"
        }`}
        aria-label="Subtitles"
        title="Subtitles"
      >
        <CcIcon className="size-5" />
        {isActive && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#e63946]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50">
          <div className="py-1">
            {/* Header */}
            <div className="px-4 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">
              Subtitles
            </div>

            {/* Off option */}
            <button
              onClick={() => {
                onSubtitleChange(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              {activeSubtitleIndex === null && (
                <Check className="size-3.5 text-[#e63946]" />
              )}
              <span
                className={
                  activeSubtitleIndex === null
                    ? "text-[#e63946]"
                    : ""
                }
              >
                Off
              </span>
            </button>

            {/* Subtitle options */}
            {subtitles.map((subtitle, index) => (
              <button
                key={`${subtitle.language}-${index}`}
                onClick={() => {
                  onSubtitleChange(index);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
              >
                {activeSubtitleIndex === index && (
                  <Check className="size-3.5 text-[#e63946]" />
                )}
                <span
                  className={
                    activeSubtitleIndex === index
                      ? "text-[#e63946]"
                      : ""
                  }
                >
                  {subtitle.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
