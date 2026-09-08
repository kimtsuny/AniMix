"use client";

import {
  Play,
  Pause,
  SkipBack,
  Maximize,
  Minimize,
  PictureInPicture2,
  Subtitles,
  ChevronDown,
} from "lucide-react";
import { PlayerProgress } from "./PlayerProgress";
import { PlayerVolume } from "./PlayerVolume";
import { PlayerSettings } from "./PlayerSettings";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  quality: string;
  playbackRate: number;
  onPlayPause: () => void;
  onPreviousEpisode: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onPiPToggle: () => void;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
  onPlayPause,
  onPreviousEpisode,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPiPToggle,
  onQualityChange,
  onPlaybackRateChange,
}: PlayerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Progress bar */}
        <PlayerProgress
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 md:px-5 pb-3 pt-1">
          {/* Left controls */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={onPlayPause}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="size-6 fill-white" />
              ) : (
                <Play className="size-6 fill-white" />
              )}
            </button>

            <button
              onClick={onPreviousEpisode}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
              aria-label="Previous episode"
              title="Previous episode"
            >
              <SkipBack className="size-5 fill-white" />
            </button>

            <PlayerVolume
              volume={volume}
              muted={muted}
              onVolumeChange={onVolumeChange}
              onMuteToggle={onMuteToggle}
            />

            <span className="text-white/80 text-xs md:text-sm font-mono ml-1 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Quality selector */}
            <button
              className="hidden md:flex items-center gap-0.5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors text-white text-sm"
              aria-label="Quality"
              title="Video quality"
            >
              <span className="text-xs">{quality}</span>
              <ChevronDown className="size-3.5 text-white/60" />
            </button>

            <button
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
              aria-label="Subtitles"
              title="Subtitles"
            >
              <Subtitles className="size-5" />
            </button>

            <PlayerSettings
              quality={quality}
              playbackRate={playbackRate}
              onQualityChange={onQualityChange}
              onPlaybackRateChange={onPlaybackRateChange}
            />

            <button
              onClick={onPiPToggle}
              className="hidden md:block p-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
              aria-label="Picture in Picture"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="size-5" />
            </button>

            <button
              onClick={onFullscreenToggle}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
