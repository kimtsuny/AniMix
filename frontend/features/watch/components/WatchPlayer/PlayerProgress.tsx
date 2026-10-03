"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PlayerProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatSeekTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlayerProgress({
  currentTime,
  duration,
  onSeek,
}: PlayerProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoverBarRef = useRef<HTMLDivElement>(null);
  const hoverTimestampRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const trackRectRef = useRef<DOMRect | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getTrackRect = useCallback((): DOMRect | null => {
    if (!trackRectRef.current && trackRef.current) {
      trackRectRef.current = trackRef.current.getBoundingClientRect();
    }
    return trackRectRef.current;
  }, []);

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      const rect = getTrackRect();
      if (!rect || rect.width <= 0 || durationRef.current <= 0) return 0;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * durationRef.current;
    },
    [getTrackRect]
  );

  /**
   * Immediate synchronous DOM update with ZERO transition and ZERO animation delay.
   * Directly sets CSS variables and content on the exact same frame as the mouse event.
   */
  const updateHoverImmediate = useCallback((clientX: number) => {
    if (!trackRef.current || durationRef.current <= 0) return;
    const rect = trackRectRef.current || trackRef.current.getBoundingClientRect();
    trackRectRef.current = rect;
    if (rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const percent = ratio * 100;
    const time = ratio * durationRef.current;

    trackRef.current.style.setProperty("--hover-percent", `${percent}%`);

    if (hoverTimestampRef.current) {
      hoverTimestampRef.current.textContent = formatSeekTime(time);
      hoverTimestampRef.current.style.opacity = "1";
    }
    if (hoverBarRef.current) {
      hoverBarRef.current.style.opacity = "1";
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (trackRef.current) {
      trackRectRef.current = trackRef.current.getBoundingClientRect();
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (durationRef.current <= 0) return;
      updateHoverImmediate(e.clientX);
    },
    [updateHoverImmediate]
  );

  const handleMouseLeave = useCallback(() => {
    trackRectRef.current = null;
    if (!isDraggingRef.current) {
      if (hoverBarRef.current) hoverBarRef.current.style.opacity = "0";
      if (hoverTimestampRef.current) hoverTimestampRef.current.style.opacity = "0";
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      isDraggingRef.current = true;
      if (trackRef.current) {
        trackRectRef.current = trackRef.current.getBoundingClientRect();
      }
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      updateHoverImmediate(e.clientX);
    },
    [getTimeFromPosition, onSeek, updateHoverImmediate]
  );

  /* Touch handlers for mobile */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      setIsDragging(true);
      isDraggingRef.current = true;
      if (trackRef.current) {
        trackRectRef.current = trackRef.current.getBoundingClientRect();
      }
      const time = getTimeFromPosition(touch.clientX);
      onSeek(time);
      updateHoverImmediate(touch.clientX);
    },
    [getTimeFromPosition, onSeek, updateHoverImmediate]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      updateHoverImmediate(e.clientX);
    };

    const handleUp = (e: MouseEvent) => {
      setIsDragging(false);
      isDraggingRef.current = false;
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (!isInside) {
          trackRectRef.current = null;
          if (hoverBarRef.current) hoverBarRef.current.style.opacity = "0";
          if (hoverTimestampRef.current) hoverTimestampRef.current.style.opacity = "0";
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const time = getTimeFromPosition(touch.clientX);
      onSeek(time);
      updateHoverImmediate(touch.clientX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      trackRectRef.current = null;
      if (hoverBarRef.current) hoverBarRef.current.style.opacity = "0";
      if (hoverTimestampRef.current) hoverTimestampRef.current.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, getTimeFromPosition, onSeek, updateHoverImmediate]);

  return (
    <div
      className="group/progress w-full px-3 md:px-5 cursor-pointer select-none"
      role="slider"
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <div
        ref={trackRef}
        className="relative w-full h-7 flex items-center py-1.5"
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      >
        {/* Hover timestamp preview — NO transition on position, updates synchronously with cursor */}
        <div
          ref={hoverTimestampRef}
          className="absolute bottom-full mb-1.5 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-white/15 text-white text-[11px] md:text-xs font-mono font-medium tracking-tight shadow-lg shadow-black/50 select-none pointer-events-none whitespace-nowrap opacity-0"
          style={{
            left: "var(--hover-percent, 0%)",
            transform: "translateX(calc(-1 * var(--hover-percent, 0%)))",
            transition: "none",
          }}
        >
          0:00
        </div>

        {/* Track background */}
        <div className="absolute w-full h-[5px] group-hover/progress:h-[7px] rounded-full bg-white/20 transition-[height] duration-150" />

        {/* Hover preview — NO transition on width or position, strictly instantaneous */}
        <div
          ref={hoverBarRef}
          className="absolute h-[5px] group-hover/progress:h-[7px] rounded-full bg-white/30 pointer-events-none opacity-0"
          style={{
            width: "var(--hover-percent, 0%)",
            transition: "none",
          }}
        />

        {/* Played portion — red (tied purely to actual video playback currentTime) */}
        <div
          className="absolute h-[5px] group-hover/progress:h-[7px] rounded-full bg-[#e63946] transition-[height] duration-150 pointer-events-none shadow-[0_0_8px_rgba(230,57,70,0.4)]"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb — polished rounded knob */}
        <div
          className={`absolute w-4 h-4 rounded-full bg-white border-2 border-[#e63946] shadow-md shadow-black/60 transition-transform duration-150 -translate-x-1/2 pointer-events-none ${
            isDragging
              ? "scale-100 opacity-100 ring-2 ring-[#e63946]/40"
              : "scale-0 opacity-0 group-hover/progress:scale-100 group-hover/progress:opacity-100"
          }`}
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
}
