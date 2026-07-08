"use client";

import { useEffect, useRef } from "react";
import { Relation } from "@/features/anime/types/relation";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

interface SeasonsProps {
  seasons: Relation[];
  activeSeasonId: number;
  onSeasonSelect: (id: number) => void;
}

export function Seasons({ seasons, activeSeasonId, onSeasonSelect }: SeasonsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollContainerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeSeasonId]);

  if (!seasons || seasons.length === 0) {
    return null;
  }

  return (
    <SectionContainer>
      <SectionHeader title="SEASONS" />
<div className=" border-b border-white/30" />
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `,
          }}
        />

        {seasons.map((season, index) => {
          const isActive = season.id === activeSeasonId;
          const seasonNumber = index + 1;

          return (
            <button
              key={season.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSeasonSelect(season.id)}
             className={`
  flex h-14 w-14 items-center justify-center
  rounded-lg text-lg font-bold
  transition-all duration-200
  focus:outline-none
  cursor-pointer
  ${
 isActive
  ? "bg-zinc-100 text-black shadow-xl shadow-white/10"
  : "bg-transparent text-zinc-400 hover:bg-white/20 hover:text-white"
  }
`}
            >
              {seasonNumber}
            </button>
          );
        })}
      </div>
    </SectionContainer>
  );
}
