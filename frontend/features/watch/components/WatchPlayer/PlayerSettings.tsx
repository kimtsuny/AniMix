"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Settings, Check } from "lucide-react";

interface PlayerSettingsProps {
  quality: string;
  playbackRate: number;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  /** When true, renders without its own border (used inside a shared container) */
  grouped?: boolean;
}

const QUALITIES = ["1080p", "720p", "480p", "360p"];
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerSettings({
  quality,
  playbackRate,
  onQualityChange,
  onPlaybackRateChange,
  grouped = false,
}: PlayerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "quality" | "speed">("main");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setActiveTab("main");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveTab("main");
        }}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
        aria-label="Settings"
        title="Settings"
      >
        <Settings className="size-5 text-white" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50">
          {activeTab === "main" && (
            <div className="py-1">
              <button
                onClick={() => setActiveTab("quality")}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>Quality</span>
                <span className="text-white/50 text-xs">{quality}</span>
              </button>
              <button
                onClick={() => setActiveTab("speed")}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>Speed</span>
                <span className="text-white/50 text-xs">{playbackRate}x</span>
              </button>
            </div>
          )}

          {activeTab === "quality" && (
            <div className="py-1">
              <button
                onClick={() => setActiveTab("main")}
                className="w-full px-4 py-2 text-xs text-white/50 hover:bg-white/10 transition-colors text-left"
              >
                ← Quality
              </button>
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    onQualityChange(q);
                    setIsOpen(false);
                    setActiveTab("main");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                >
                  {quality === q && <Check className="size-3.5 text-[#e63946]" />}
                  <span className={quality === q ? "text-[#e63946]" : ""}>{q}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "speed" && (
            <div className="py-1">
              <button
                onClick={() => setActiveTab("main")}
                className="w-full px-4 py-2 text-xs text-white/50 hover:bg-white/10 transition-colors text-left"
              >
                ← Speed
              </button>
              {PLAYBACK_RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onPlaybackRateChange(r);
                    setIsOpen(false);
                    setActiveTab("main");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                >
                  {playbackRate === r && <Check className="size-3.5 text-[#e63946]" />}
                  <span className={playbackRate === r ? "text-[#e63946]" : ""}>
                    {r === 1 ? "Normal" : `${r}x`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
