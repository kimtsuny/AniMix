"use client";

import { useState, useRef, useCallback } from "react";
import { PictureInPicture2, Settings, Maximize } from "lucide-react";
import { PlayerControls } from "./PlayerControls";

interface WatchPlayerProps {
  /** Poster / thumbnail image for the video player background */
  posterImage?: string;
  /** Video source URL (when streaming is connected) */
  videoSrc?: string;
  /** Callback for navigating to the previous episode */
  onPreviousEpisode?: () => void;
}

export function WatchPlayer({
  posterImage,
  videoSrc,
  onPreviousEpisode,
}: WatchPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(522); // 08:42 mock
  const [duration] = useState(1435); // 23:55 mock
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState("720p");
  const [playbackRate, setPlaybackRate] = useState(1);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);

  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handlePiPToggle = useCallback(() => {
    // PiP requires a real video element — placeholder for now
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden group/player cursor-pointer"
      style={{
        height: "clamp(280px, 58vh, 720px)",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onClick={(e) => {
        // Only toggle play/pause if clicking the video area, not controls
        if ((e.target as HTMLElement).closest("button")) return;
        handlePlayPause();
      }}
    >
      {/* Blurred cinematic background */}
      {posterImage && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(${posterImage})`,
            filter: "blur(30px) brightness(0.3)",
          }}
        />
      )}

      {/* Dark overlay on blurred background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Actual video area — centered with correct aspect ratio */}
      <div className="absolute inset-0 flex items-center justify-center">
        {videoSrc ? (
          <video
            className="max-w-full max-h-full object-contain"
            poster={posterImage}
            src={videoSrc}
          />
        ) : posterImage ? (
          <img
            src={posterImage}
            alt="Video poster"
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-black/60" />
        )}
      </div>

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Top-right action buttons */}
      <div
        className={`absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-2 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={handlePiPToggle}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-xs hover:bg-black/60 transition-colors"
          aria-label="Picture in Picture"
          title="Picture in Picture"
        >
          <PictureInPicture2 className="size-3.5" />
          <span>Picture in Picture</span>
        </button>
        <button
          className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:bg-black/60 transition-colors"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="size-4" />
        </button>
        <button
          onClick={handleFullscreenToggle}
          className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:bg-black/60 transition-colors"
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <Maximize className="size-4" />
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className={`transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          isFullscreen={isFullscreen}
          quality={quality}
          playbackRate={playbackRate}
          onPlayPause={handlePlayPause}
          onPreviousEpisode={onPreviousEpisode || (() => {})}
          onSeek={handleSeek}
          onVolumeChange={setVolume}
          onMuteToggle={() => setMuted((m) => !m)}
          onFullscreenToggle={handleFullscreenToggle}
          onPiPToggle={handlePiPToggle}
          onQualityChange={setQuality}
          onPlaybackRateChange={setPlaybackRate}
        />
      </div>
    </div>
  );
}
