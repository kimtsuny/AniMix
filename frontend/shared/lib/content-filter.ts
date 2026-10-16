/**
 * Centralized Content Filter for AniMix
 *
 * Enforces global exclusion of Ecchi, Harem, and adult-only anime content.
 * Follows strict rules:
 * 1. Normalized, exact genre matching (case-insensitive, trimmed).
 * 2. Missing genre metadata is never assumed safe (uncertain results excluded).
 * 3. Adult-only anime (`isAdult: true`) strictly excluded.
 */

export const EXCLUDED_GENRES = ["Ecchi", "Harem"] as const;

export const NORMALIZED_EXCLUDED_GENRES = new Set(
  EXCLUDED_GENRES.map((genre) => genre.trim().toLowerCase())
);

export interface AnimeGenreMetadata {
  id?: number | string | null;
  genres?: string[] | null;
  isAdult?: boolean | null;
}

/**
 * Normalizes a genre name by trimming whitespace and lowercasing.
 */
export function normalizeGenre(genre: string): string {
  return genre.trim().toLowerCase();
}

/**
 * Checks if a specific genre matches an excluded genre exactly (after normalization).
 * Substring matches are intentionally not performed to prevent false positives.
 */
export function isExcludedGenre(genre: string): boolean {
  if (typeof genre !== "string") return false;
  return NORMALIZED_EXCLUDED_GENRES.has(normalizeGenre(genre));
}

/**
 * Checks if an array of genres contains any excluded genre.
 */
export function hasExcludedGenre(genres: unknown): boolean {
  if (!Array.isArray(genres)) return false;
  return genres.some((g) => typeof g === "string" && isExcludedGenre(g));
}

/**
 * Verifies that the anime has valid, checked genre metadata.
 * Missing, null, undefined, or empty genre arrays are not considered verified.
 */
export function hasVerifiedGenreMetadata(
  anime: AnimeGenreMetadata | null | undefined
): boolean {
  return Boolean(
    anime &&
      Array.isArray(anime.genres) &&
      anime.genres.length > 0 &&
      anime.genres.every((g) => typeof g === "string" && g.trim().length > 0)
  );
}

/**
 * Core validation helper:
 * Returns true ONLY if:
 * 1. Anime object is provided and not null/undefined.
 * 2. Anime is NOT adult-only (`isAdult !== true`).
 * 3. Anime has verified genre metadata (`hasVerifiedGenreMetadata(anime) === true`).
 * 4. Anime does not contain 'Ecchi' or 'Harem' (exact match after normalization).
 */
export function isAnimeAllowed(
  anime: AnimeGenreMetadata | null | undefined
): boolean {
  if (!anime) return false;
  if (anime.isAdult === true) return false;
  if (!hasVerifiedGenreMetadata(anime)) return false;

  return !hasExcludedGenre(anime.genres);
}

/**
 * Inverse predicate: returns true if the anime is excluded (adult, Ecchi, Harem, or unverified).
 */
export function isAnimeExcluded(
  anime: AnimeGenreMetadata | null | undefined
): boolean {
  return !isAnimeAllowed(anime);
}

/**
 * Filters an array of anime candidates, retaining only safe, verified anime.
 */
export function filterAllowedAnime<T extends AnimeGenreMetadata>(
  items: T[] | null | undefined
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(isAnimeAllowed);
}
