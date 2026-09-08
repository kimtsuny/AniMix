"use client";

import { EpisodeList } from "./EpisodeList";
import { SeasonSelector } from "../SeasonSelector/SeasonSelector";
import type { MockEpisode } from "@/features/watch/data/mock-data";

interface Season {
  id: number;
  label: string;
  value: string;
}

interface EpisodeSelectorProps {
  episodes: MockEpisode[];
  seasons: Season[];
  selectedEpisodeNumber: number;
  selectedSeason: string;
  totalEpisodes: number;
  onEpisodeSelect: (episode: MockEpisode) => void;
  onSeasonChange: (season: string) => void;
}

export function EpisodeSelector({
  episodes,
  seasons,
  selectedEpisodeNumber,
  selectedSeason,
  totalEpisodes,
  onEpisodeSelect,
  onSeasonChange,
}: EpisodeSelectorProps) {
  return (
    <section className="py-5 md:py-6">
      {/* Header row */}
      <div className="flex items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <h2 className="text-white text-base md:text-lg font-semibold">
            Episodes
          </h2>
          <SeasonSelector
            seasons={seasons}
            selectedSeason={selectedSeason}
            onSeasonChange={onSeasonChange}
          />
        </div>
        <span className="text-white/40 text-xs md:text-sm whitespace-nowrap">
          {totalEpisodes} Episodes
        </span>
      </div>

      {/* Episode list carousel */}
      <EpisodeList
        episodes={episodes}
        selectedEpisodeNumber={selectedEpisodeNumber}
        onEpisodeSelect={onEpisodeSelect}
      />
    </section>
  );
}
