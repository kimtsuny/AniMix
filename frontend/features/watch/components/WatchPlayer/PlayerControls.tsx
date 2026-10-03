"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  PictureInPicture2,
} from "lucide-react";
import { PlayerProgress } from "./PlayerProgress";
import { PlayerVolume } from "./PlayerVolume";
import { PlayerSettings } from "./PlayerSettings";
import { PlayerSubtitles } from "./PlayerSubtitles";
import { PlayerTooltip } from "./PlayerTooltip";
import type { Subtitle } from "../../api/services/stream.service";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  quality: string;
  availableQualities?: string[];
  playbackRate: number;
  subtitles: Subtitle[];
  activeSubtitleIndex: number | null;
  preferredSubtitle?: string;
  onPlayPause: () => void;
  onPreviousEpisode: () => void;
  onNextEpisode: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onPiPToggle: () => void;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSubtitleChange: (index: number | null) => void;
  onPreferenceChange?: (preference: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}



export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  isFullscreen,
  quality,
  availableQualities,
  playbackRate,
  subtitles,
  activeSubtitleIndex,
  preferredSubtitle,
  onPlayPause,
  onPreviousEpisode,
  onNextEpisode,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPiPToggle,
  onQualityChange,
  onPlaybackRateChange,
  onSubtitleChange,
  onPreferenceChange,
}: PlayerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Progress bar */}
        <PlayerProgress
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 md:px-5 pb-3.5 pt-2 gap-2">
          {/* ── Left controls pill ── */}
          <div className="inline-flex items-center h-9 md:h-[38px] px-1 md:px-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-sm shadow-black/20 gap-0.5 md:gap-1">
            {/* Play / Pause */}
            <PlayerTooltip label={isPlaying ? "Pause" : "Play"}>
              <button
                onClick={onPlayPause}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="size-5 fill-white text-white" />
                ) : (
                  <Play className="size-5 fill-white text-white translate-x-0.5" />
                )}
              </button>
            </PlayerTooltip>

            {/* Previous episode */}
            <PlayerTooltip label="Previous Episode">
              <button
                onClick={onPreviousEpisode}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
                aria-label="Previous episode"
              >
                <SkipBack className="size-5 fill-white text-white" />
              </button>
            </PlayerTooltip>

            {/* Next episode */}
            <PlayerTooltip label="Next Episode">
              <button
                onClick={onNextEpisode}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
                aria-label="Next episode"
              >
                <SkipForward className="size-5 fill-white text-white" />
              </button>
            </PlayerTooltip>

            {/* Volume */}
            <PlayerVolume
              volume={volume}
              muted={muted}
              onVolumeChange={onVolumeChange}
              onMuteToggle={onMuteToggle}
            />

            {/* Time display */}
            <div className="px-2 hidden sm:flex items-center justify-center select-none flex-shrink-0">
              <span className="text-white/85 text-xs font-mono font-medium tracking-tight tabular-nums whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* ── Right controls pill ── */}
          <div className="inline-flex items-center h-9 md:h-[38px] px-1 md:px-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-sm shadow-black/20 gap-0.5 md:gap-1 flex-shrink-0">
            {/* Subtitles / CC */}
            <PlayerSubtitles
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              preferredSubtitle={preferredSubtitle}
              onSubtitleChange={onSubtitleChange}
              onPreferenceChange={onPreferenceChange}
            />

            {/* Settings */}
            <PlayerSettings
              quality={quality}
              availableQualities={availableQualities}
              playbackRate={playbackRate}
              onQualityChange={onQualityChange}
              onPlaybackRateChange={onPlaybackRateChange}
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              preferredSubtitle={preferredSubtitle}
              onSubtitleChange={onSubtitleChange}
              onPreferenceChange={onPreferenceChange}
            />

            {/* Picture in Picture — desktop only */}
            <PlayerTooltip
              label="Picture in Picture"
              wrapperClassName="hidden md:inline-flex"
            >
              <button
                onClick={onPiPToggle}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
                aria-label="Picture in Picture"
              >
                <PictureInPicture2 className="size-5 text-white" />
              </button>
            </PlayerTooltip>

            {/* Fullscreen */}
            <PlayerTooltip
              label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              align="right"
            >
              <button
                onClick={onFullscreenToggle}
                className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="size-5 text-white" />
                ) : (
                  <Maximize className="size-5 text-white" />
                )}
              </button>
            </PlayerTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
