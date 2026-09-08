"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

interface Season {
  id: number;
  label: string;
  value: string;
}

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  onSeasonChange,
}: SeasonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    seasons.find((s) => s.value === selectedSeason)?.label || "Season 1";

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/90 text-sm hover:bg-white/10 transition-colors"
        aria-label="Select season"
        aria-expanded={isOpen}
      >
        <span className="text-xs md:text-sm font-medium">{selectedLabel}</span>
        <ChevronDown
          className={`size-3.5 text-white/50 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-36 rounded-lg bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50">
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => {
                onSeasonChange(season.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                selectedSeason === season.value
                  ? "text-[#e63946] bg-white/5"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {season.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
