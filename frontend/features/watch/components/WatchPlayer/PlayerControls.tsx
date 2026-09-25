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
import type { Subtitle } from "../../api/services/stream.service";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  quality: string;
  playbackRate: number;
  subtitles: Subtitle[];
  activeSubtitleIndex: number | null;
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
  playbackRate,
  subtitles,
  activeSubtitleIndex,
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
}: PlayerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Progress bar */}
        <PlayerProgress
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 md:px-4 pb-3 pt-1.5 gap-2">
          {/* ── Left controls ── */}
          <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
            {/* Play / Pause */}
            <button
              onClick={onPlayPause}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="size-5 fill-white text-white" />
              ) : (
                <Play className="size-5 fill-white text-white" />
              )}
            </button>

            {/* Previous + Next group */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onPreviousEpisode}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
                aria-label="Previous episode"
                title="Previous episode"
              >
                <SkipBack className="size-5 fill-white text-white" />
              </button>
              <button
                onClick={onNextEpisode}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
                aria-label="Next episode"
                title="Next episode"
              >
                <SkipForward className="size-5 fill-white text-white" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center">
              <PlayerVolume
                volume={volume}
                muted={muted}
                onVolumeChange={onVolumeChange}
                onMuteToggle={onMuteToggle}
              />
            </div>

            {/* Time display */}
            <div className="flex items-center rounded-lg px-2 py-1 hidden sm:flex select-none">
              <span className="text-white/90 text-xs md:text-sm font-normal tabular-nums whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            {/* Subtitles / CC */}
            <PlayerSubtitles
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              onSubtitleChange={onSubtitleChange}
            />

            {/* Settings */}
            <PlayerSettings
              quality={quality}
              playbackRate={playbackRate}
              onQualityChange={onQualityChange}
              onPlaybackRateChange={onPlaybackRateChange}
            />

            {/* Picture in Picture — desktop only */}
            <button
              onClick={onPiPToggle}
              className="hidden md:flex p-2 rounded-lg hover:bg-white/10 transition-colors text-white items-center justify-center"
              aria-label="Picture in Picture"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="size-5 text-white" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onFullscreenToggle}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="size-5 text-white" />
              ) : (
                <Maximize className="size-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
