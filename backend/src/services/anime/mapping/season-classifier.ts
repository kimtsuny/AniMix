import type { AniListAnime } from "../../anilist/anilist.service.js";
import { classifyTitle } from "./candidate-classifier.js";
import { calculateTitleSimilarity } from "./title-normalizer.js";

/**
 * Distinguishing franchise era / franchise spin-off keywords that indicate
 * a separate work rather than a consecutive season of the same series.
 */
const FRANCHISE_SUBTITLE_PATTERNS = [
  /\bshippu+den\b/i,
  /\bnext generations?\b/i,
  /\bthousand[\s-]?year blood war\b/i,
  /\bbrotherhood\b/i,
  /\bdaima\b/i,
  /\bgt\b/i,
  /\bsuper\b/i,
  /\bkai\b/i,
  /\bheroes\b/i,
  /\balternative\b/i,
  /\bjunior high\b/i,
];

/**
 * Determines whether a related AniList anime is genuinely another season
 * of the same logical series as primaryAnime.
 *
 * CRITICAL DOMAIN PRINCIPLES:
 * 1. SEQUEL != SEASON. A sequel can be a separate series (DBZ, DB Super, Shippuden).
 * 2. Conservative classification: False positives are worse than missing a non-critical relationship.
 * 3. Both must be episodic TV/TV_SHORT/ONA series (never movies, OVAs, specials).
 * 4. Remakes (large year gaps with no season indicator) are distinct series.
 * 5. Spin-offs, side stories, and alternate settings are never seasons.
 */
export function isSameLogicalSeriesSeason(
  primaryAnime: AniListAnime,
  relatedAnime: {
    id: number;
    type?: string;
    format?: string | null;
    status?: string | null;
    seasonYear?: number | null;
    startDate?: { year?: number | null } | null;
    episodes?: number | null;
    title: {
      english?: string | null;
      romaji?: string | null;
      native?: string | null;
    };
  },
  relationType: string
): boolean {
  // 1. Relation type must be PREQUEL or SEQUEL
  if (relationType !== "PREQUEL" && relationType !== "SEQUEL") {
    return false;
  }

  // 2. Type must be ANIME
  if (relatedAnime.type && relatedAnime.type !== "ANIME") {
    return false;
  }

  // 3. Format must be episodic series (TV, TV_SHORT, ONA)
  const nonEpisodicFormats = ["MOVIE", "OVA", "SPECIAL", "MUSIC", "MANGA", "ONE_SHOT"];
  const relatedFormat = (relatedAnime.format ?? "").toUpperCase();
  if (nonEpisodicFormats.includes(relatedFormat)) {
    return false;
  }

  const primaryFormat = (primaryAnime.format ?? "").toUpperCase();
  if (nonEpisodicFormats.includes(primaryFormat)) {
    return false;
  }

  // 4. Release year check: Check for remakes across large time gaps
  const primaryYear =
    primaryAnime.seasonYear ?? primaryAnime.startDate?.year ?? null;
  const relatedYear =
    relatedAnime.seasonYear ?? relatedAnime.startDate?.year ?? null;

  // 5. Title semantics analysis
  const primaryTitles = [
    primaryAnime.title.english,
    primaryAnime.title.romaji,
  ].filter(Boolean) as string[];

  const relatedTitles = [
    relatedAnime.title.english,
    relatedAnime.title.romaji,
  ].filter(Boolean) as string[];

  if (primaryTitles.length === 0 || relatedTitles.length === 0) {
    return false;
  }

  let bestBaseSim = 0.0;
  let hasExplicitSeasonMatch = false;
  let hasPartOrCourMatch = false;
  let hasFinalSeasonMatch = false;
  let hasFranchiseSubtitleConflict = false;

  for (const pTitle of primaryTitles) {
    const pMeta = classifyTitle(pTitle);

    for (const rTitle of relatedTitles) {
      const rMeta = classifyTitle(rTitle);

      const sim = calculateTitleSimilarity(
        pMeta.normalizedBaseTitle,
        rMeta.normalizedBaseTitle
      );
      if (sim > bestBaseSim) bestBaseSim = sim;

      const pSeason =
        pMeta.explicitSeasonNumber ?? pMeta.ordinalSeasonNumber;
      const rSeason =
        rMeta.explicitSeasonNumber ?? rMeta.ordinalSeasonNumber;

      // Check if related entry has explicit season number
      if (rSeason !== null && rSeason > 1) {
        // e.g. Season 2, Season 3, 2nd Season
        if (pSeason === null || pSeason === 1 || Math.abs(pSeason - rSeason) === 1) {
          hasExplicitSeasonMatch = true;
        }
      }

      // Check if primary is Season 2+ and related is Season 1 via PREQUEL
      if (relationType === "PREQUEL" && pSeason !== null && pSeason > 1) {
        if (rSeason === null || rSeason === pSeason - 1) {
          hasExplicitSeasonMatch = true;
        }
      }

      // Check if related is part / cour (e.g. AoT S3 Part 2, Spy x Family Part 2)
      if (
        (rMeta.partNumber !== null && rMeta.partNumber > 1) ||
        (rMeta.courNumber !== null && rMeta.courNumber > 1)
      ) {
        hasPartOrCourMatch = true;
      }

      // Check if final season
      if (rMeta.isFinalSeason || rMeta.isFinalChapters) {
        hasFinalSeasonMatch = true;
      }

      // Check if distinguishing franchise era tags exist (Z, GT, Super, Shippuden, etc.)
      const pHasSub = FRANCHISE_SUBTITLE_PATTERNS.some((re) => re.test(pTitle));
      const rHasSub = FRANCHISE_SUBTITLE_PATTERNS.some((re) => re.test(rTitle));
      if (pHasSub !== rHasSub) {
        hasFranchiseSubtitleConflict = true;
      }
    }
  }

  // If one title has a distinguishing franchise tag (like "Z" in Dragon Ball Z, or "Shippuden")
  // and the other does not, they are distinct series/eras
  if (hasFranchiseSubtitleConflict) {
    return false;
  }

  // Check explicit season / part / final continuation
  const hasSeasonSignal =
    hasExplicitSeasonMatch || hasPartOrCourMatch || hasFinalSeasonMatch;

  // Remake check: If year gap is >= 7 years and there is NO explicit season marker in title
  if (
    primaryYear !== null &&
    relatedYear !== null &&
    Math.abs(primaryYear - relatedYear) >= 7 &&
    !hasSeasonSignal
  ) {
    return false;
  }

  // Case A: Explicit season / part / final season with matching base title (>= 0.80)
  if (hasSeasonSignal && bestBaseSim >= 0.78) {
    return true;
  }

  // Case B: High base title similarity (>= 0.90) without conflicting suffixes
  // BUT conservative check:
  // If neither entry has any season number, final tag, or part tag:
  // Are they actually seasons? E.g., Dragon Ball vs Dragon Ball Z
  // Note: For Dragon Ball vs Dragon Ball Z:
  // DB base is "dragon ball", DBZ base is "dragon ball z". Title similarity is ~0.84 < 0.90!
  // And "z" is not a season number.
  // If bestBaseSim >= 0.92, neither has franchise subtitle conflict, and year gap is small (<= 4 years):
  if (
    bestBaseSim >= 0.92 &&
    primaryYear !== null &&
    relatedYear !== null &&
    Math.abs(primaryYear - relatedYear) <= 4
  ) {
    return true;
  }

  return false;
}
