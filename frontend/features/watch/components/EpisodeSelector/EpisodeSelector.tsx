"use client";

import { EpisodeList } from "./EpisodeList";
import { SeasonSelector } from "../SeasonSelector/SeasonSelector";

import type {
  Episode,
  Season,
} from "@/features/watch/api/services/episode.service";

interface EpisodeSelectorProps {
  episodes: Episode[];
  seasons: Season[];
  selectedEpisodeNumber: number;
  selectedSeason: string;
  totalEpisodes: number;
  onEpisodeSelect: (episode: Episode) => void;
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

      <EpisodeList
        episodes={episodes}
        selectedEpisodeNumber={selectedEpisodeNumber}
        onEpisodeSelect={onEpisodeSelect}
      />
    </section>
  );
}