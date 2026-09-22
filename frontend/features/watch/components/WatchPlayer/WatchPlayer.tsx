"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Hls from "hls.js";
import {
  PictureInPicture2,
  Settings,
  Maximize,
} from "lucide-react";

import { PlayerControls } from "./PlayerControls";
import type { StreamResponse } from "../../api/services/stream.service";

interface WatchPlayerProps {
  posterImage?: string;
  stream: StreamResponse | null;
  isLoading?: boolean;
  error?: string | null;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
}

export function WatchPlayer({
  posterImage,
  stream,
  isLoading = false,
  error = null,
  onPreviousEpisode,
  onNextEpisode,
}: WatchPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const [quality, setQuality] = useState("Auto");
  const [playbackRate, setPlaybackRate] =
    useState(1);

  /*
   * Use the first available stream for now.
   *
   * Later we can add a quality selector that
   * switches between stream.streams.
   */
  const activeStream =
    stream?.streams?.[0] ?? null;

  /*
   * Initialize / destroy HLS whenever the stream
   * changes.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeStream) {
      return;
    }

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const source = activeStream.url;

    /*
     * HLS
     */
    if (activeStream.isHLS) {
      /*
       * Safari / browsers with native HLS support
       */
      if (
        video.canPlayType(
          "application/vnd.apple.mpegurl"
        )
      ) {
        video.src = source;
      }

      /*
       * Chrome / Firefox / Edge
       */
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current = hls;

        hls.loadSource(source);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error(
            "[HLS] Error:",
            data
          );
        });
      } else {
        console.error(
          "[Player] HLS is not supported by this browser"
        );
      }
    }

    /*
     * Normal video
     */
    else {
      video.src = source;
    }

    video.load();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeAttribute("src");
      video.load();
    };
  }, [activeStream]);

  /*
   * Video events
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(
        Number.isFinite(video.duration)
          ? video.duration
          : 0
      );
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

      video.removeEventListener(
        "pause",
        handlePause
      );
    };
  }, []);

  /*
   * Show / hide controls
   */
  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(
        controlsTimeoutRef.current
      );
    }

    controlsTimeoutRef.current =
      setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
  }, [isPlaying]);

  /*
   * Play / pause
   */
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play().catch((error) => {
        console.error(
          "[Player] Failed to play:",
          error
        );
      });
    } else {
      video.pause();
    }
  }, []);

  /*
   * Seek
   */
  const handleSeek = useCallback(
    (time: number) => {
      const video = videoRef.current;

      if (!video) return;

      const nextTime = Math.max(
        0,
        Math.min(
          time,
          Number.isFinite(video.duration)
            ? video.duration
            : time
        )
      );

      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    []
  );

  /*
   * Volume
   */
  const handleVolumeChange = useCallback(
    (value: number) => {
      const video = videoRef.current;

      setVolume(value);

      if (video) {
        video.volume = value;
        video.muted = value === 0;
      }
    },
    []
  );

  /*
   * Mute
   */
  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  /*
   * Playback rate
   */
  const handlePlaybackRateChange =
    useCallback((rate: number) => {
      const video = videoRef.current;

      setPlaybackRate(rate);

      if (video) {
        video.playbackRate = rate;
      }
    }, []);

  /*
   * Fullscreen
   */
  const handleFullscreenToggle =
    useCallback(() => {
      const container =
        containerRef.current;

      if (!container) return;

      if (!document.fullscreenElement) {
        container
          .requestFullscreen?.()
          .then(() => {
            setIsFullscreen(true);
          })
          .catch((error) => {
            console.error(
              "[Player] Fullscreen error:",
              error
            );
          });
      } else {
        document
          .exitFullscreen?.()
          .then(() => {
            setIsFullscreen(false);
          })
          .catch((error) => {
            console.error(
              "[Player] Exit fullscreen error:",
              error
            );
          });
      }
    }, []);

  /*
   * Keep fullscreen state synchronized
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  /*
   * Picture in Picture
   */
  const handlePiPToggle = useCallback(async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      if (
        document.pictureInPictureEnabled &&
        !video.disablePictureInPicture
      ) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error(
        "[Player] PiP error:",
        error
      );
    }
  }, []);

  /*
   * No stream yet
   */
  const hasStream = Boolean(activeStream);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden group/player cursor-pointer"
      style={{
        height: "clamp(280px, 58vh, 720px)",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "button"
          )
        ) {
          return;
        }

        handlePlayPause();
      }}
    >
      {/* Blurred cinematic background */}
      {posterImage && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(${posterImage})`,
            filter:
              "blur(30px) brightness(0.3)",
          }}
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Video */}
      <div className="absolute inset-0 flex items-center justify-center">
        {hasStream ? (
          <video
            ref={videoRef}
            className="max-w-full max-h-full w-full h-full object-contain"
            poster={posterImage}
            playsInline
            preload="metadata"
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

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
          <div className="text-sm text-white/70">
            Loading stream...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-4 text-center">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* No stream */}
      {!isLoading &&
        !error &&
        !hasStream && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <p className="text-sm text-white/50">
              No stream available
            </p>
          </div>
        )}

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Top-right buttons */}
      <div
        className={`absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-2 transition-opacity duration-300 ${
          showControls
            ? "opacity-100"
            : "opacity-0"
        }`}
      >
        <button
          onClick={handlePiPToggle}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-xs hover:bg-black/60 transition-colors"
          aria-label="Picture in Picture"
          title="Picture in Picture"
        >
          <PictureInPicture2 className="size-3.5" />
          <span>
            Picture in Picture
          </span>
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
          showControls
            ? "opacity-100"
            : "opacity-0"
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
          onPreviousEpisode={
            onPreviousEpisode ||
            (() => {})
          }
          onNextEpisode={
            onNextEpisode ||
            (() => {})
          }
          onSeek={handleSeek}
          onVolumeChange={
            handleVolumeChange
          }
          onMuteToggle={
            handleMuteToggle
          }
          onFullscreenToggle={
            handleFullscreenToggle
          }
          onPiPToggle={handlePiPToggle}
          onQualityChange={setQuality}
          onPlaybackRateChange={
            handlePlaybackRateChange
          }
        />
      </div>
    </div>
  );
}