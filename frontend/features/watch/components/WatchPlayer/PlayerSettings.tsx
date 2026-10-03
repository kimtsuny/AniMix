"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  PlayCircle,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Check,
  Settings,
  Languages,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Subtitle } from "../../api/services/stream.service";
import { LanguageMenuRow, parseLanguageEntry } from "./LanguageMenuRow";
import { PlayerTooltip } from "./PlayerTooltip";

/**
 * YouTube / ReAnime style Closed Captions (CC) icon
 */
function CcIcon({ className = "size-[18px]" }: { className?: string }) {
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

export interface AudioTrack {
  id: string | number;
  label: string;
  language?: string;
}

interface PlayerSettingsProps {
  quality: string;
  availableQualities?: string[];
  playbackRate: number;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  /** When true, renders without its own border (used inside a shared container) */
  grouped?: boolean;
  subtitles?: Subtitle[];
  activeSubtitleIndex?: number | null;
  onSubtitleChange?: (index: number | null) => void;
  audioTracks?: AudioTrack[];
  activeAudioTrackId?: string | number | null;
  onAudioTrackChange?: (id: string | number) => void;
}

const QUALITIES = ["1080p", "720p", "480p", "360p", "Auto"];
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

type MenuTab = "main" | "quality" | "speed" | "subtitles" | "audio";

export function PlayerSettings({
  quality,
  availableQualities,
  playbackRate,
  onQualityChange,
  onPlaybackRateChange,
  grouped = false,
  subtitles,
  activeSubtitleIndex,
  onSubtitleChange,
  audioTracks,
  activeAudioTrackId,
  onAudioTrackChange,
}: PlayerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>("main");
  const menuRef = useRef<HTMLDivElement>(null);

  const qualitiesList =
    availableQualities && availableQualities.length > 0
      ? availableQualities
      : QUALITIES;

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

  // Handle Escape key to close menu
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setActiveTab("main");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getSubtitleValueText = () => {
    if (!subtitles || subtitles.length === 0) return "Off";
    if (
      activeSubtitleIndex !== null &&
      activeSubtitleIndex !== undefined &&
      subtitles[activeSubtitleIndex]
    ) {
      return parseLanguageEntry(
        subtitles[activeSubtitleIndex].label,
        subtitles[activeSubtitleIndex].language
      ).name;
    }
    return `${subtitles.length} track${subtitles.length > 1 ? "s" : ""}`;
  };

  const getAudioTrackValueText = () => {
    if (!audioTracks || audioTracks.length === 0) return "Default";
    const current = audioTracks.find((t) => t.id === activeAudioTrackId);
    if (current) {
      return parseLanguageEntry(current.label, current.language).name;
    }
    return `${audioTracks.length} tracks`;
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <PlayerTooltip label="Settings" disabled={isOpen}>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setActiveTab("main");
          }}
          className={`w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0 ${
            isOpen ? "bg-white/15 text-white" : ""
          }`}
          aria-label="Settings"
        >
          <Settings className="size-5 text-white" />
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
            {activeTab === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col space-y-0.5"
              >
                {/* Play Speed */}
                <button
                  onClick={() => setActiveTab("speed")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors duration-150 group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayCircle className="size-[18px] text-white/70 group-hover:text-white/90 flex-shrink-0 transition-colors" />
                    <span className="text-[13px] font-medium text-white/90 group-hover:text-white truncate">
                      Play Speed
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="text-xs text-white/50 group-hover:text-white/70 tabular-nums">
                      {playbackRate === 1 ? "Normal" : `${playbackRate}x`}
                    </span>
                    <ChevronRight className="size-4 text-white/35 group-hover:text-white/60 transition-colors" />
                  </div>
                </button>

                {/* Quality */}
                <button
                  onClick={() => setActiveTab("quality")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors duration-150 group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SlidersHorizontal className="size-[18px] text-white/70 group-hover:text-white/90 flex-shrink-0 transition-colors" />
                    <span className="text-[13px] font-medium text-white/90 group-hover:text-white truncate">
                      Quality
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="text-xs text-white/50 group-hover:text-white/70 tabular-nums">
                      {quality}
                    </span>
                    <ChevronRight className="size-4 text-white/35 group-hover:text-white/60 transition-colors" />
                  </div>
                </button>

                {/* Subtitles (if available) */}
                {subtitles && subtitles.length > 0 && (
                  <button
                    onClick={() => setActiveTab("subtitles")}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors duration-150 group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CcIcon className="size-[18px] text-white/70 group-hover:text-white/90 flex-shrink-0 transition-colors" />
                      <span className="text-[13px] font-medium text-white/90 group-hover:text-white truncate">
                        Subtitles
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs text-white/50 group-hover:text-white/70 truncate max-w-[85px]">
                        {getSubtitleValueText()}
                      </span>
                      <ChevronRight className="size-4 text-white/35 group-hover:text-white/60 transition-colors" />
                    </div>
                  </button>
                )}

                {/* Audio Tracks (if available) */}
                {audioTracks && audioTracks.length > 0 && (
                  <button
                    onClick={() => setActiveTab("audio")}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors duration-150 group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Languages className="size-[18px] text-white/70 group-hover:text-white/90 flex-shrink-0 transition-colors" />
                      <span className="text-[13px] font-medium text-white/90 group-hover:text-white truncate">
                        Audio Tracks
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs text-white/50 group-hover:text-white/70 truncate max-w-[85px]">
                        {getAudioTrackValueText()}
                      </span>
                      <ChevronRight className="size-4 text-white/35 group-hover:text-white/60 transition-colors" />
                    </div>
                  </button>
                )}
              </motion.div>
            )}

            {/* Quality Submenu */}
            {activeTab === "quality" && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col space-y-0.5"
              >
                <div className="pb-1 mb-0.5 border-b border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("main")}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors text-left group"
                  >
                    <ChevronLeft className="size-4 text-white/50 group-hover:text-white transition-colors" />
                    <span>Quality</span>
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                  {qualitiesList.map((q) => {
                    const isSelected = quality === q;
                    return (
                      <button
                        key={q}
                        onClick={() => {
                          onQualityChange(q);
                          setIsOpen(false);
                          setActiveTab("main");
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors duration-150 text-left ${
                          isSelected
                            ? "bg-[#e63946]/12 text-white font-medium"
                            : "text-white/80 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <Check className="size-4 text-[#e63946] flex-shrink-0" />
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <span
                            className={`text-[13px] ${
                              isSelected ? "text-[#e63946] font-medium" : ""
                            }`}
                          >
                            {q}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Speed Submenu */}
            {activeTab === "speed" && (
              <motion.div
                key="speed"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col space-y-0.5"
              >
                <div className="pb-1 mb-0.5 border-b border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("main")}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors text-left group"
                  >
                    <ChevronLeft className="size-4 text-white/50 group-hover:text-white transition-colors" />
                    <span>Play Speed</span>
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                  {PLAYBACK_RATES.map((r) => {
                    const isSelected = playbackRate === r;
                    const label = r === 1 ? "Normal" : `${r}x`;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          onPlaybackRateChange(r);
                          setIsOpen(false);
                          setActiveTab("main");
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors duration-150 text-left ${
                          isSelected
                            ? "bg-[#e63946]/12 text-white font-medium"
                            : "text-white/80 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <Check className="size-4 text-[#e63946] flex-shrink-0" />
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <span
                            className={`text-[13px] ${
                              isSelected ? "text-[#e63946] font-medium" : ""
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Subtitles Submenu */}
            {activeTab === "subtitles" && subtitles && (
              <motion.div
                key="subtitles"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col space-y-0.5"
              >
                <div className="pb-1 mb-0.5 border-b border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("main")}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors text-left group"
                  >
                    <ChevronLeft className="size-4 text-white/50 group-hover:text-white transition-colors" />
                    <span>Subtitles</span>
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                  {/* Off Option */}
                  <LanguageMenuRow
                    label="Off"
                    isSelected={activeSubtitleIndex === null}
                    onClick={() => {
                      onSubtitleChange?.(null);
                      setIsOpen(false);
                      setActiveTab("main");
                    }}
                  />

                  {/* Tracks */}
                  {subtitles.map((sub, idx) => (
                    <LanguageMenuRow
                      key={`${sub.language}-${idx}`}
                      label={sub.label}
                      language={sub.language}
                      isSelected={activeSubtitleIndex === idx}
                      onClick={() => {
                        onSubtitleChange?.(idx);
                        setIsOpen(false);
                        setActiveTab("main");
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Audio Tracks Submenu */}
            {activeTab === "audio" && audioTracks && (
              <motion.div
                key="audio"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col space-y-0.5"
              >
                <div className="pb-1 mb-0.5 border-b border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab("main")}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors text-left group"
                  >
                    <ChevronLeft className="size-4 text-white/50 group-hover:text-white transition-colors" />
                    <span>Audio Tracks</span>
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                  {audioTracks.map((track) => (
                    <LanguageMenuRow
                      key={track.id}
                      label={track.label}
                      language={track.language}
                      isSelected={activeAudioTrackId === track.id}
                      onClick={() => {
                        onAudioTrackChange?.(track.id);
                        setIsOpen(false);
                        setActiveTab("main");
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
