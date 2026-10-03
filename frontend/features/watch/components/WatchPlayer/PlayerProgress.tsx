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
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPosition(ratio * 100);
        setHoverTime(time);
      }
    },
    [getTimeFromPosition, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || duration <= 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverPosition(ratio * 100);
      setHoverTime(ratio * duration);
    },
    [duration]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  }, [isDragging]);

  /* Touch handlers for mobile */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      setIsDragging(true);
      const time = getTimeFromPosition(touch.clientX);
      onSeek(time);
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        setHoverPosition(ratio * 100);
        setHoverTime(time);
      }
    },
    [getTimeFromPosition, onSeek]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPosition(ratio * 100);
        setHoverTime(time);
      }
    };
    const handleUp = () => {
      setIsDragging(false);
      setHoverPosition(null);
      setHoverTime(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const time = getTimeFromPosition(touch.clientX);
      onSeek(time);
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        setHoverPosition(ratio * 100);
        setHoverTime(time);
      }
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
      setHoverPosition(null);
      setHoverTime(null);
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
  }, [isDragging, getTimeFromPosition, onSeek]);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      >
        {/* Hover timestamp preview */}
        {hoverPosition !== null && hoverTime !== null && duration > 0 && (
          <div
            className="absolute bottom-full mb-1.5 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-white/15 text-white text-[11px] md:text-xs font-mono font-medium tracking-tight shadow-lg shadow-black/50 select-none pointer-events-none whitespace-nowrap animate-in fade-in duration-100"
            style={{
              left: `${hoverPosition}%`,
              transform: `translateX(-${hoverPosition}%)`,
            }}
          >
            {formatSeekTime(hoverTime)}
          </div>
        )}

        {/* Track background */}
        <div className="absolute w-full h-[5px] group-hover/progress:h-[7px] rounded-full bg-white/20 transition-all duration-150" />

        {/* Hover preview */}
        {hoverPosition !== null && (
          <div
            className="absolute h-[5px] group-hover/progress:h-[7px] rounded-full bg-white/30 transition-all duration-150 pointer-events-none"
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Played portion — red */}
        <div
          className="absolute h-[5px] group-hover/progress:h-[7px] rounded-full bg-[#e63946] transition-all duration-150 pointer-events-none shadow-[0_0_8px_rgba(230,57,70,0.4)]"
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
