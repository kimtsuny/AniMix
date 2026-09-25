"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";

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
      <button
        onClick={onMuteToggle}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white flex items-center justify-center"
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        <VolumeIcon className="size-5 text-white" />
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ width: isExpanded ? 80 : 0, opacity: isExpanded ? 1 : 0 }}
      >
        <div
          ref={sliderRef}
          className="relative w-[80px] h-5 flex items-center cursor-pointer mr-1"
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
            className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-md -translate-x-1/2"
            style={{ left: `${displayVolume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
