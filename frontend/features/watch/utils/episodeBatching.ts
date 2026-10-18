import type { Episode } from "../api/services/episode.service";

export const DEFAULT_BATCH_SIZE = 100;

/**
 * Determines whether the episode range selector should be displayed.
 * Only shown when not loading and total episodes exceed the batch size threshold (100).
 */
export function shouldShowEpisodeRangeSelector(
  episodeCount: number,
  isLoading: boolean = false
): boolean {
  return !isLoading && episodeCount > DEFAULT_BATCH_SIZE;
}

export interface EpisodeBatch {
  index: number;
  startIndex: number;
  endIndex: number;
  startEpisodeNumber: number;
  endEpisodeNumber: number;
  label: string;
  count: number;
}

/**
 * Calculates episode batches based on array indices in the complete, ordered episodes list.
 * Does not assume 1-based or contiguous numbering.
 */
export function calculateEpisodeBatches(
  episodes: Array<{ number?: number }>,
  batchSize: number = DEFAULT_BATCH_SIZE
): EpisodeBatch[] {
  if (!episodes || episodes.length === 0 || batchSize <= 0) {
    return [];
  }

  const batches: EpisodeBatch[] = [];
  const totalBatches = Math.ceil(episodes.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * batchSize;
    const endIndex = Math.min(startIndex + batchSize, episodes.length);
    const firstEpisode = episodes[startIndex];
    const lastEpisode = episodes[endIndex - 1];

    const startNum = firstEpisode.number ?? startIndex + 1;
    const endNum = lastEpisode.number ?? endIndex;

    batches.push({
      index: i,
      startIndex,
      endIndex,
      startEpisodeNumber: startNum,
      endEpisodeNumber: endNum,
      label: `${startNum}–${endNum}`,
      count: endIndex - startIndex,
    });
  }

  return batches;
}

/**
 * Determines the batch index containing the selected episode based on its
 * actual index within the complete episodes array.
 * Falls back to 0 if the episode is not found.
 */
export function findBatchIndexForEpisode(
  episodes: Array<{ number?: number }>,
  selectedEpisodeNumber: number,
  batchSize: number = DEFAULT_BATCH_SIZE
): number {
  if (!episodes || episodes.length === 0 || batchSize <= 0) {
    return 0;
  }

  const episodeIndex = episodes.findIndex(
    (ep) => ep.number === selectedEpisodeNumber
  );

  if (episodeIndex === -1) {
    return 0;
  }

  return Math.floor(episodeIndex / batchSize);
}

/**
 * Returns a stable, unique React key for an episode within a season,
 * gracefully handling null or undefined database IDs.
 */
export function getEpisodeKey(episode: Episode): string {
  const idPart =
    episode.id !== null && episode.id !== undefined
      ? String(episode.id)
      : (episode.providerId ?? "anon");
  return `ep-${episode.number}-${idPart}`;
}

/**
 * Slices the complete episode list to only the episodes belonging to the requested batch.
 */
export function getBatchEpisodes<T = Episode>(
  episodes: T[],
  batchIndex: number,
  batchSize: number = DEFAULT_BATCH_SIZE
): T[] {
  if (!episodes || episodes.length === 0) {
    return [];
  }

  const totalBatches = Math.ceil(episodes.length / batchSize);
  if (totalBatches <= 0) {
    return [];
  }

  const clampedBatchIndex = Math.max(0, Math.min(batchIndex, totalBatches - 1));
  const startIndex = clampedBatchIndex * batchSize;
  const endIndex = Math.min(startIndex + batchSize, episodes.length);

  return episodes.slice(startIndex, endIndex);
}
