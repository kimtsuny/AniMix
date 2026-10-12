"use client";

import { useCallback, useMemo, useState } from "react";
import { EpisodeList } from "./EpisodeList";
import { EpisodeRangeSelector } from "./EpisodeRangeSelector";
import { SeasonSelector } from "../SeasonSelector/SeasonSelector";
import {
  calculateEpisodeBatches,
  findBatchIndexForEpisode,
  DEFAULT_BATCH_SIZE,
  shouldShowEpisodeRangeSelector,
} from "@/features/watch/utils/episodeBatching";

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
  isLoading?: boolean;
  onEpisodeSelect: (episode: Episode) => void;
  onSeasonChange: (season: string) => void;
}

export function EpisodeSelector({
  episodes,
  seasons,
  selectedEpisodeNumber,
  selectedSeason,
  isLoading = false,
  onEpisodeSelect,
  onSeasonChange,
}: EpisodeSelectorProps) {
  const batches = useMemo(
    () => calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE),
    [episodes]
  );

  const selectedBatchIndex = useMemo(
    () =>
      findBatchIndexForEpisode(
        episodes,
        selectedEpisodeNumber,
        DEFAULT_BATCH_SIZE
      ),
    [episodes, selectedEpisodeNumber]
  );

  // Store user-initiated range tab selection scoped to the current season and episode
  const [browsedBatch, setBrowsedBatch] = useState<{
    season: string;
    episodeNumber: number;
    batchIndex: number;
  } | null>(null);

  const handleSelectBatch = useCallback(
    (batchIndex: number) => {
      setBrowsedBatch({
        season: selectedSeason,
        episodeNumber: selectedEpisodeNumber,
        batchIndex,
      });
    },
    [selectedSeason, selectedEpisodeNumber]
  );

  const activeBatchIndex = useMemo(() => {
    const isBrowsingSameSelection =
      browsedBatch !== null &&
      browsedBatch.season === selectedSeason &&
      browsedBatch.episodeNumber === selectedEpisodeNumber;

    const rawIndex = isBrowsingSameSelection
      ? browsedBatch.batchIndex
      : selectedBatchIndex;

    if (batches.length === 0) return 0;
    return Math.max(0, Math.min(rawIndex, batches.length - 1));
  }, [
    browsedBatch,
    selectedSeason,
    selectedEpisodeNumber,
    selectedBatchIndex,
    batches.length,
  ]);

  const currentBatch = batches[activeBatchIndex];
  const batchEpisodes = useMemo(() => {
    if (!currentBatch || batches.length <= 1) {
      return episodes;
    }
    return episodes.slice(currentBatch.startIndex, currentBatch.endIndex);
  }, [episodes, currentBatch, batches.length]);

  const showRangeSelector = shouldShowEpisodeRangeSelector(
    episodes?.length ?? 0,
    isLoading
  );

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

      {/* 2. Episode Range Selector (only when episodes.length > 100) */}
      {showRangeSelector && (
        <EpisodeRangeSelector
          batches={batches}
          activeBatchIndex={activeBatchIndex}
          onSelectBatch={handleSelectBatch}
        />
      )}

      {/* 3. Episode Carousel (bounded to active batch) */}
      <EpisodeList
        key={`${selectedSeason}-${activeBatchIndex}`}
        episodes={batchEpisodes}
        selectedEpisodeNumber={selectedEpisodeNumber}
        isLoading={isLoading}
        onEpisodeSelect={onEpisodeSelect}
      />
    </section>
  );
}