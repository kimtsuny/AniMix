"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Hls from "hls.js";

import { PlayerControls } from "./PlayerControls";
import type { StreamResponse, Subtitle } from "../../api/services/stream.service";

interface WatchPlayerProps {
  posterImage?: string;
  stream: StreamResponse | null;
  isLoading?: boolean;
  isEpisodesLoading?: boolean;
  error?: string | null;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
}

type CenterAction = "play" | "pause" | null;

/**
 * Safely sanitize stream URLs to omit sensitive signed tokens from logs
 */
function sanitizeStreamUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(
      url,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost"
    );
    const paramKeys = Array.from(parsed.searchParams.keys());
    const querySummary =
      paramKeys.length > 0
        ? `?[params: ${paramKeys.join(", ")}]`
        : "";
    return `${parsed.pathname}${querySummary}`;
  } catch {
    return url.split("?")[0] || "";
  }
}

/**
 * Safely stops network loading, detaches media element, and destroys HLS instance
 */
function destroyHlsInstance(instance: Hls | null) {
  if (!instance) return;
  try {
    instance.stopLoad();
    instance.detachMedia();
    instance.destroy();
  } catch (err) {
    console.warn("[HLS] Error destroying instance:", err);
  }
}

export function WatchPlayer({
  posterImage,
  stream,
  isLoading = false,
  isEpisodesLoading = false,
  error = null,
  onPreviousEpisode,
  onNextEpisode,
}: WatchPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const controlsTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const centerActionTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const playRequestRef = useRef(0);
  const currentStreamUrlRef = useRef<string | null>(null);

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

  const [isVideoLoading, setIsVideoLoading] =
    useState(false);

  const [centerAction, setCenterAction] =
    useState<CenterAction>(null);

  const activeStream =
    stream?.streams?.[0] ?? null;

  const subtitles: Subtitle[] =
    activeStream?.subtitles ?? [];

  const hasSubtitles = subtitles.length > 0;

  const [activeSubtitleIndex, setActiveSubtitleIndex] =
    useState<number | null>(null);

  const hasStream = Boolean(activeStream);

  /*
   * --------------------------------------------------
   * Cleanup helpers
   * --------------------------------------------------
   */

  const clearCenterAction = useCallback(() => {
    if (centerActionTimeoutRef.current) {
      clearTimeout(
        centerActionTimeoutRef.current
      );

      centerActionTimeoutRef.current = null;
    }
  }, []);

  const showCenterAction = useCallback(
    (action: CenterAction) => {
      clearCenterAction();

      setCenterAction(action);

      centerActionTimeoutRef.current =
        setTimeout(() => {
          setCenterAction(null);
          centerActionTimeoutRef.current = null;
        }, 700);
    },
    [clearCenterAction]
  );

  /*
   * --------------------------------------------------
   * Initialize HLS / video source
   * --------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const source = activeStream?.url ?? null;

    /*
     * Avoid redundant destroy/re-initialization if
     * the stream URL has not changed.
     */
    if (source && source === currentStreamUrlRef.current && hlsRef.current) {
      return;
    }
    currentStreamUrlRef.current = source;

    /*
     * Every time the stream changes we start
     * from a clean video state with a new request ID.
     */
    playRequestRef.current += 1;

    const requestId = playRequestRef.current;

    /*
     * Safely tear down previous HLS instance:
     * stopLoad -> detachMedia -> destroy -> clear ref.
     */
    if (hlsRef.current) {
      destroyHlsInstance(hlsRef.current);
      hlsRef.current = null;
    }

    /*
     * Reset video state.
     */
    video.pause();

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCenterAction(null);
    setActiveSubtitleIndex(null);

    clearCenterAction();

    /*
     * No stream yet.
     */
    if (!activeStream || !source) {
      video.removeAttribute("src");
      video.load();
      setIsVideoLoading(false);
      return;
    }

    /*
     * A new stream exists.
     * We are now waiting for the video itself
     * to become playable.
     */
    setIsVideoLoading(true);

    let hlsInstance: Hls | null = null;

    /*
     * Native HLS
     */
    if (
      activeStream.isHLS &&
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = source;
      video.load();
    }

    /*
     * HLS.js
     */
    else if (
      activeStream.isHLS &&
      Hls.isSupported()
    ) {
      /*
       * Clear any previous native src attribute without calling video.load()
       * to prevent demuxer/pipeline conflicts during HLS attachment.
       */
      video.removeAttribute("src");

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,

        /*
         * Keep buffering behavior reasonable
         * for normal VOD playback.
         */
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsInstance = hls;
      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.loadSource(source);

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          if (
            requestId !==
            playRequestRef.current
          ) {
            return;
          }

          /*
           * Do not consider the video ready
           * merely because the manifest loaded.
           *
           * The video events decide when
           * playback is actually possible.
           */
        }
      );

      hls.on(
        Hls.Events.ERROR,
        (_, data) => {
          console.error(
            "[HLS] Error:",
            {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              streamUrl: sanitizeStreamUrl(source),
              streamIdentity: `${activeStream.quality || "auto"} (${sanitizeStreamUrl(source)})`,
              responseCode: data.response?.code,
            }
          );

          if (
            requestId !==
            playRequestRef.current
          ) {
            return;
          }

          /*
           * Fatal HLS errors should stop the
           * loading state.
           */
          if (data.fatal) {
            setIsVideoLoading(false);

            switch (data.type) {
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn(
                  "[HLS] Attempting media error recovery..."
                );
                hls.recoverMediaError();
                break;

              case Hls.ErrorTypes.NETWORK_ERROR:
                /*
                 * Expired AnimeParadise signed tokens (HTTP 500)
                 * cannot be fixed by retrying the stale URL.
                 */
                console.error(
                  "[HLS] Fatal network error encountered, stopping playback."
                );
                destroyHlsInstance(hls);
                if (hlsRef.current === hls) {
                  hlsRef.current = null;
                }
                break;

              default:
                console.error(
                  "[HLS] Fatal unrecoverable error, destroying HLS instance."
                );
                destroyHlsInstance(hls);
                if (hlsRef.current === hls) {
                  hlsRef.current = null;
                }
                break;
            }
          }
        }
      );
    }

    /*
     * Normal video source.
     */
    else if (!activeStream.isHLS) {
      video.src = source;
      video.load();
    }

    /*
     * Browser cannot play HLS.
     */
    else {
      console.error(
        "[Player] HLS is not supported by this browser"
      );

      setIsVideoLoading(false);
    }

    return () => {
      /*
       * Invalidate this request.
       */
      playRequestRef.current += 1;

      /*
       * Clean up this specific HLS instance safely.
       * Only clear hlsRef if it still points to this instance,
       * so we never accidentally destroy a newer HLS instance.
       */
      if (hlsInstance) {
        destroyHlsInstance(hlsInstance);
        if (hlsRef.current === hlsInstance) {
          hlsRef.current = null;
        }
      }

      /*
       * Pause before removing source.
       */
      video.pause();

      setIsPlaying(false);
      setIsVideoLoading(false);
    };
  }, [
    activeStream,
    clearCenterAction,
  ]);

  /*
   * --------------------------------------------------
   * Video events
   * --------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoadStart = () => {
      setIsVideoLoading(true);
    };

    const handleWaiting = () => {
      /*
       * waiting means the video temporarily
       * needs more data.
       */
      if (!video.paused) {
        setIsVideoLoading(true);
      }
    };

    const handleCanPlay = () => {
      /*
       * The browser has enough data to begin
       * playback.
       */
      setIsVideoLoading(false);
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsVideoLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;

      setDuration(
        Number.isFinite(videoDuration)
          ? videoDuration
          : 0
      );
    };

    const handleDurationChange = () => {
      const videoDuration = video.duration;

      if (Number.isFinite(videoDuration)) {
        setDuration(videoDuration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsVideoLoading(false);
    };

    const handleError = () => {
      const mediaError = video.error;

      console.error("[Player] Video error:", {
        code: mediaError?.code,
        message: mediaError?.message,
        currentSrc: sanitizeStreamUrl(video.currentSrc),
        readyState: video.readyState,
        networkState: video.networkState,
      });

      setIsVideoLoading(false);
      setIsPlaying(false);
    };

    video.addEventListener(
      "loadstart",
      handleLoadStart
    );

    video.addEventListener(
      "waiting",
      handleWaiting
    );

    video.addEventListener(
      "canplay",
      handleCanPlay
    );

    video.addEventListener(
      "playing",
      handlePlaying
    );

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    video.addEventListener(
      "durationchange",
      handleDurationChange
    );

    video.addEventListener(
      "play",
      handlePlay
    );

    video.addEventListener(
      "pause",
      handlePause
    );

    video.addEventListener(
      "ended",
      handleEnded
    );

    video.addEventListener(
      "error",
      handleError
    );

    return () => {
      video.removeEventListener(
        "loadstart",
        handleLoadStart
      );

      video.removeEventListener(
        "waiting",
        handleWaiting
      );

      video.removeEventListener(
        "canplay",
        handleCanPlay
      );

      video.removeEventListener(
        "playing",
        handlePlaying
      );

      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      video.removeEventListener(
        "durationchange",
        handleDurationChange
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

      video.removeEventListener(
        "pause",
        handlePause
      );

      video.removeEventListener(
        "ended",
        handleEnded
      );

      video.removeEventListener(
        "error",
        handleError
      );
    };
  }, []);

  /*
   * --------------------------------------------------
   * Automatic playback
   * --------------------------------------------------
   *
   * We do NOT wait for the entire episode.
   *
   * We only wait until the browser has enough
   * data to start playing.
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeStream) return;

    let cancelled = false;

    const startPlayback = async () => {
      try {
        /*
         * Do not start another request if the
         * video is already playing.
         */
        if (!video.paused) {
          return;
        }

        await video.play();

        if (cancelled) return;

        setIsPlaying(true);
      } catch (error) {
        /*
         * AbortError can happen when the source
         * changes while play() is pending.
         *
         * It is not necessarily a real playback
         * failure.
         */
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[Player] Failed to play:",
          error
        );
      }
    };

    /*
     * If enough data is already available,
     * start immediately.
     */
    if (video.readyState >= 3) {
      startPlayback();
    }

    /*
     * Otherwise wait for canplay.
     */
    else {
      video.addEventListener(
        "canplay",
        startPlayback,
        { once: true }
      );
    }

    return () => {
      cancelled = true;

      video.removeEventListener(
        "canplay",
        startPlayback
      );
    };
  }, [activeStream?.url]);

  /*
   * --------------------------------------------------
   * Controls visibility
   * --------------------------------------------------
   */

  const resetControlsTimeout =
    useCallback(() => {
      if (controlsTimeoutRef.current) {
        clearTimeout(
          controlsTimeoutRef.current
        );
      }

      controlsTimeoutRef.current =
        setTimeout(() => {
          if (videoRef.current?.paused === false) {
            setShowControls(false);
          }
        }, 3000);
    }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  /*
   * --------------------------------------------------
   * Play / Pause
   * --------------------------------------------------
   */

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    /*
     * If the video is currently paused,
     * request playback.
     */
    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          showCenterAction("play");
        })
        .catch((error) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          console.error(
            "[Player] Failed to play:",
            error
          );
        });

      return;
    }

    /*
     * Otherwise pause.
     */
    video.pause();

    setIsPlaying(false);
    showCenterAction("pause");
  }, [showCenterAction]);

  /*
   * --------------------------------------------------
   * Seek
   * --------------------------------------------------
   */

  const handleSeek = useCallback(
    (time: number) => {
      const video = videoRef.current;

      if (!video) return;

      const videoDuration =
        Number.isFinite(video.duration)
          ? video.duration
          : time;

      const nextTime = Math.max(
        0,
        Math.min(
          time,
          videoDuration
        )
      );

      video.currentTime = nextTime;

      setCurrentTime(nextTime);
    },
    []
  );

  /*
   * --------------------------------------------------
   * Volume
   * --------------------------------------------------
   */

  const handleVolumeChange =
    useCallback((value: number) => {
      const video = videoRef.current;

      setVolume(value);

      if (!video) return;

      video.volume = value;
      video.muted = value === 0;

      setMuted(video.muted);
    }, []);

  /*
   * --------------------------------------------------
   * Mute
   * --------------------------------------------------
   */

  const handleMuteToggle =
    useCallback(() => {
      const video = videoRef.current;

      if (!video) return;

      video.muted = !video.muted;

      setMuted(video.muted);
    }, []);

  /*
   * --------------------------------------------------
   * Playback rate
   * --------------------------------------------------
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
   * --------------------------------------------------
   * Fullscreen
   * --------------------------------------------------
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
   * --------------------------------------------------
   * Fullscreen state
   * --------------------------------------------------
   */

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setIsFullscreen(
          Boolean(
            document.fullscreenElement
          )
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
   * --------------------------------------------------
   * Picture in Picture
   * --------------------------------------------------
   */

  const handlePiPToggle =
    useCallback(async () => {
      const video = videoRef.current;

      if (!video) return;

      try {
        if (
          document.pictureInPictureElement
        ) {
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
   * --------------------------------------------------
   * Cleanup timeouts
   * --------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(
          controlsTimeoutRef.current
        );
      }

      if (centerActionTimeoutRef.current) {
        clearTimeout(
          centerActionTimeoutRef.current
        );
      }

      if (hlsRef.current) {
        destroyHlsInstance(hlsRef.current);
        hlsRef.current = null;
      }
    };
  }, []);

  /*
   * --------------------------------------------------
   * Subtitle TextTrack synchronization
   * --------------------------------------------------
   *
   * Keep the HTML5 TextTrack.mode in sync with
   * the React activeSubtitleIndex state.
   *
   * We listen for the video loadedmetadata event
   * to make sure the <track> elements are actually
   * available before trying to set their mode.
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const syncTracks = () => {
      const tracks = video.textTracks;

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];

        if (track.kind !== "subtitles") continue;

        track.mode =
          activeSubtitleIndex === i
            ? "showing"
            : "hidden";
      }
    };

    /*
     * Sync immediately in case the tracks
     * are already available.
     */
    syncTracks();

    /*
     * Also sync when tracks are added or
     * when metadata loads (which may cause
     * tracks to become available).
     */
    video.textTracks.addEventListener(
      "change",
      syncTracks
    );

    return () => {
      video.textTracks.removeEventListener(
        "change",
        syncTracks
      );
    };
  }, [activeSubtitleIndex, subtitles]);

  /*
   * --------------------------------------------------
   * Render
   * --------------------------------------------------
   */

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden group/player cursor-pointer"
      style={{
        aspectRatio: "16 / 9",
        maxHeight: isFullscreen
          ? "100vh"
          : "80vh",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (videoRef.current?.paused === false) {
          setShowControls(false);
        }
      }}
      onClick={(event) => {
        const target =
          event.target as HTMLElement;

        /*
         * Do not toggle playback when clicking
         * the bottom controls.
         */
        if (
          target.closest("button") ||
          target.closest(
            "[data-player-controls]"
          )
        ) {
          return;
        }

        handlePlayPause();
      }}
    >
      {/* 
        Cinematic background.

        It is ONLY a background now.
        The video element itself has NO poster,
        so the ugly temporary thumbnail does not
        appear inside the player.
      */}
      {posterImage && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage:
              `url(${posterImage})`,
            filter:
              "blur(30px) brightness(0.3)",
          }}
        />
      )}

      {/* Dark background overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 
        Video
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          className={`relative z-10 max-w-full max-h-full w-full h-full object-contain ${
            hasStream ? "" : "hidden"
          }`}
          playsInline
          preload="auto"
          controls={false}
          crossOrigin="anonymous"
        >
          {subtitles.map((subtitle, index) => (
            <track
              key={`${subtitle.language}-${index}`}
              kind="subtitles"
              src={subtitle.url}
              srcLang={subtitle.language}
              label={subtitle.label}
            />
          ))}
        </video>

        {!hasStream && posterImage && (
          <img
            src={posterImage}
            alt="Video poster"
            className="relative z-10 max-w-full max-h-full object-contain"
            draggable={false}
          />
        )}

        {!hasStream && !posterImage && (
          <div className="relative z-10 w-full h-full bg-black" />
        )}
      </div>

      {/* 
        --------------------------------------------------
        Loading spinner
        --------------------------------------------------

        This is a real spinner.

        It disappears when:
        - canplay fires
        - playing fires
        - fatal video/HLS error occurs
      */}
      {(isLoading ||
        (hasStream && isVideoLoading)) &&
        !error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div
              className="size-12 rounded-full border-4 border-white/20 border-t-white animate-spin"
              aria-label="Loading video"
            />
          </div>
        )}

      {/* 
        --------------------------------------------------
        Center Play / Pause feedback
        --------------------------------------------------
      */}
      {centerAction && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="size-16 md:size-20 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-150">
            {centerAction === "play" ? (
              <svg
                viewBox="0 0 24 24"
                className="size-8 md:size-10 text-white fill-white translate-x-0.5"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="size-8 md:size-10 text-white fill-white"
              >
                <rect
                  x="6"
                  y="5"
                  width="4"
                  height="14"
                  rx="1"
                />
                <rect
                  x="14"
                  y="5"
                  width="4"
                  height="14"
                  rx="1"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4 text-center">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* No stream */}
      {!isLoading &&
        !isEpisodesLoading &&
        !error &&
        !hasStream && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <p className="text-sm text-white/50">
              No stream available
            </p>
          </div>
        )}

      {/* Bottom controls */}
      <div
        data-player-controls
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
          subtitles={subtitles}
          activeSubtitleIndex={activeSubtitleIndex}
          onPlayPause={
            handlePlayPause
          }
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
          onPiPToggle={
            handlePiPToggle
          }
          onQualityChange={
            setQuality
          }
          onPlaybackRateChange={
            handlePlaybackRateChange
          }
          onSubtitleChange={
            setActiveSubtitleIndex
          }
        />
      </div>
    </div>
  );
}