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
    <section className="py-5 md:py-6" aria-label="Episodes section">
      {/* 1. Season / Anime-Part Selector */}
      {seasons && seasons.length > 0 && (
        <div className="mb-4">
          <SeasonSelector
            seasons={seasons}
            selectedSeason={selectedSeason}
            onSeasonChange={onSeasonChange}
          />
        </div>
      )}

      {/* 2. Episode Carousel */}
      <EpisodeList
        episodes={episodes}
        selectedEpisodeNumber={selectedEpisodeNumber}
        onEpisodeSelect={onEpisodeSelect}
      />
    </section>
  );
}