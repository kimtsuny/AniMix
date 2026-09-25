"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PlayerProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function PlayerProgress({
  currentTime,
  duration,
  onSeek,
}: PlayerProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

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
      onSeek(getTimeFromPosition(e.clientX));
    },
    [getTimeFromPosition, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverPosition(ratio * 100);
    },
    []
  );

  /* Touch handlers for mobile */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      setIsDragging(true);
      onSeek(getTimeFromPosition(touch.clientX));
    },
    [getTimeFromPosition, onSeek]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      onSeek(getTimeFromPosition(e.clientX));
    };
    const handleUp = () => setIsDragging(false);

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      onSeek(getTimeFromPosition(touch.clientX));
    };
    const handleTouchEnd = () => setIsDragging(false);

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
        className="relative w-full h-5 flex items-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPosition(null)}
        onTouchStart={handleTouchStart}
      >
        {/* Track background */}
        <div className="absolute w-full h-[3px] group-hover/progress:h-[5px] rounded-full bg-white/20 transition-all duration-150" />

        {/* Hover preview */}
        {hoverPosition !== null && (
          <div
            className="absolute h-[3px] group-hover/progress:h-[5px] rounded-full bg-white/30 transition-all duration-150"
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Played portion — red */}
        <div
          className="absolute h-[3px] group-hover/progress:h-[5px] rounded-full bg-[#e63946] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb — red dot */}
        <div
          className="absolute w-3 h-3 rounded-full bg-[#e63946] shadow-lg shadow-[#e63946]/30 opacity-0 group-hover/progress:opacity-100 transition-opacity duration-150 -translate-x-1/2"
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
}
