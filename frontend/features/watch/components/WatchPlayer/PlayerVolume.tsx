"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import { PlayerTooltip } from "./PlayerTooltip";

interface PlayerVolumeProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export function PlayerVolume({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}: PlayerVolumeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const displayVolume = muted ? 0 : volume;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const getVolumeFromPosition = useCallback((clientX: number) => {
    if (!sliderRef.current) return volume;
    const rect = sliderRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [volume]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => onVolumeChange(getVolumeFromPosition(e.clientX));
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, getVolumeFromPosition, onVolumeChange]);

  return (
    <div
      className="flex items-center"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsExpanded(false);
      }}
    >
      <PlayerTooltip label="Volume" disabled={isDragging}>
        <button
          onClick={onMuteToggle}
          className="w-8 h-8 md:w-8.5 md:h-8.5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors flex-shrink-0"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <VolumeIcon className="size-5 text-white" />
        </button>
      </PlayerTooltip>

      <div
        className="overflow-hidden transition-all duration-200 flex items-center"
        style={{ width: isExpanded ? 72 : 0, opacity: isExpanded ? 1 : 0 }}
      >
        <div
          ref={sliderRef}
          className="relative w-[60px] h-5 flex items-center cursor-pointer ml-1 mr-2"
          onMouseDown={(e) => {
            setIsDragging(true);
            onVolumeChange(getVolumeFromPosition(e.clientX));
          }}
        >
          <div className="absolute w-full h-[3px] rounded-full bg-white/20" />
          <div
            className="absolute h-[3px] rounded-full bg-white"
            style={{ width: `${displayVolume * 100}%` }}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-md shadow-black/40 -translate-x-1/2"
            style={{ left: `${displayVolume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
