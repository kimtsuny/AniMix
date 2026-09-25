import type { AniListAnime } from "../../anilist/anilist.service.js";
import { classifyTitle, type ParsedTitleMetadata } from "./candidate-classifier.js";
import type { DiscoveredCandidate } from "./candidate-discovery.js";
import { calculateTitleSimilarity, normalizeTitle } from "./title-normalizer.js";

export interface SignalEvaluation {
  weight: number;
  score: number; // 0.0 to 1.0 (or negative for hard conflict penalty)
  reason: string;
}

export interface CandidateScoreResult {
  candidate: DiscoveredCandidate;
  score: number;
  signalBreakdown: Record<string, SignalEvaluation>;
  reasons: string[];
  conflicts: string[];
  decision: "MATCHED" | "AMBIGUOUS" | "UNMAPPED";
}

export interface ScorerWeights {
  titleSimilarity: number;
  baseTitleMatch: number;
  seasonMatch: number;
  partMatch: number;
  yearProximity: number;
  formatCompatibility: number;
  episodeCompatibility: number;
}

export const DEFAULT_SCORER_WEIGHTS: ScorerWeights = {
  titleSimilarity: 0.30,
  baseTitleMatch: 0.20,
  seasonMatch: 0.20,
  partMatch: 0.10,
  yearProximity: 0.10,
  formatCompatibility: 0.05,
  episodeCompatibility: 0.05,
};

/**
 * Analyzes target AniList anime title and relations to determine expected season/part/format.
 */
export function analyzeTargetMetadata(anime: AniListAnime): {
  parsedEnglish: ParsedTitleMetadata;
  parsedRomaji: ParsedTitleMetadata;
  targetSeasonNumber: number | null;
  targetPartNumber: number | null;
  targetCourNumber: number | null;
  isFinalSeason: boolean;
  targetYear: number | null;
  targetFormat: string | null;
  expectedEpisodes: number | null;
} {
  const parsedEnglish = classifyTitle(anime.title.english ?? "");
  const parsedRomaji = classifyTitle(anime.title.romaji ?? "");

  const targetSeasonNumber =
    parsedEnglish.explicitSeasonNumber ??
    parsedEnglish.ordinalSeasonNumber ??
    parsedRomaji.explicitSeasonNumber ??
    parsedRomaji.ordinalSeasonNumber ??
    null;

  const targetPartNumber =
    parsedEnglish.partNumber ?? parsedRomaji.partNumber ?? null;

  const targetCourNumber =
    parsedEnglish.courNumber ?? parsedRomaji.courNumber ?? null;

  const isFinalSeason =
    parsedEnglish.isFinalSeason || parsedRomaji.isFinalSeason;

  const targetYear =
    anime.seasonYear ??
    anime.startDate?.year ??
    parsedEnglish.year ??
    parsedRomaji.year ??
    null;

  const targetFormat = anime.format ? anime.format.toUpperCase() : null;
  const expectedEpisodes = anime.episodes ?? null;

  return {
    parsedEnglish,
    parsedRomaji,
    targetSeasonNumber,
    targetPartNumber,
    targetCourNumber,
    isFinalSeason,
    targetYear,
    targetFormat,
    expectedEpisodes,
  };
}

/**
 * Scores a single DiscoveredCandidate against an AniList target.
 */
export function scoreCandidate(
  target: AniListAnime,
  candidate: DiscoveredCandidate,
  weights: ScorerWeights = DEFAULT_SCORER_WEIGHTS
): CandidateScoreResult {
  const targetMeta = analyzeTargetMetadata(target);
  const reasons: string[] = [];
  const conflicts: string[] = [];
  const breakdown: Record<string, SignalEvaluation> = {};

  const candMain = candidate.parsedMain;
  const candEn = candidate.parsedEnglish ?? candMain;

  const candidateSeasonNumber =
    candMain.explicitSeasonNumber ??
    candMain.ordinalSeasonNumber ??
    candEn.explicitSeasonNumber ??
    candEn.ordinalSeasonNumber ??
    null;

  const candidatePartNumber =
    candMain.partNumber ?? candEn.partNumber ?? null;

  const candidateCourNumber =
    candMain.courNumber ?? candEn.courNumber ?? null;

  const candidateIsFinal =
    candMain.isFinalSeason || candEn.isFinalSeason;

  // ============================================================
  // 1. Title Similarity (Full Title)
  // ============================================================
  const titlesToCompareTarget = [
    target.title.english,
    target.title.romaji,
    ...(target.synonyms ?? []),
  ].filter(Boolean) as string[];

  const titlesToCompareCandidate = [
    candidate.title,
    candidate.alternativeTitle?.english,
    candidate.alternativeTitle?.romaji,
  ].filter(Boolean) as string[];

  let maxTitleSim = 0.0;
  for (const tTarget of titlesToCompareTarget) {
    for (const tCand of titlesToCompareCandidate) {
      const sim = calculateTitleSimilarity(tTarget, tCand);
      if (sim > maxTitleSim) maxTitleSim = sim;
    }
  }

  breakdown.titleSimilarity = {
    weight: weights.titleSimilarity,
    score: maxTitleSim,
    reason: `Title similarity score: ${(maxTitleSim * 100).toFixed(1)}%`,
  };
  if (maxTitleSim >= 0.85) {
    reasons.push("High title similarity match");
  }

  // ============================================================
  // 2. Base Title Match
  // ============================================================
  const normTargetBaseEn = targetMeta.parsedEnglish.normalizedBaseTitle;
  const normTargetBaseRo = targetMeta.parsedRomaji.normalizedBaseTitle;
  const normCandBaseMain = candMain.normalizedBaseTitle;
  const normCandBaseEn = candEn.normalizedBaseTitle;

  let baseTitleSim = Math.max(
    calculateTitleSimilarity(normTargetBaseEn, normCandBaseMain),
    calculateTitleSimilarity(normTargetBaseEn, normCandBaseEn),
    calculateTitleSimilarity(normTargetBaseRo, normCandBaseMain),
    calculateTitleSimilarity(normTargetBaseRo, normCandBaseEn)
  );

  breakdown.baseTitleMatch = {
    weight: weights.baseTitleMatch,
    score: baseTitleSim,
    reason: `Base title similarity: ${(baseTitleSim * 100).toFixed(1)}%`,
  };
  if (baseTitleSim >= 0.9) {
    reasons.push("Base franchise title matches");
  } else if (baseTitleSim < 0.4) {
    conflicts.push("Base title significantly differs");
  }

  // ============================================================
  // 3. Season Number Alignment
  // ============================================================
  let seasonScore = 0.5; // neutral by default
  let seasonReason = "Season not explicitly specified in target or candidate";

  if (targetMeta.targetSeasonNumber !== null && candidateSeasonNumber !== null) {
    if (targetMeta.targetSeasonNumber === candidateSeasonNumber) {
      seasonScore = 1.0;
      seasonReason = `Exact season number match (${targetMeta.targetSeasonNumber})`;
      reasons.push(seasonReason);
    } else {
      seasonScore = 0.0;
      seasonReason = `Season number mismatch: Target is Season ${targetMeta.targetSeasonNumber}, Candidate is Season ${candidateSeasonNumber}`;
      conflicts.push(seasonReason);
    }
  } else if (targetMeta.isFinalSeason && candidateIsFinal) {
    seasonScore = 1.0;
    seasonReason = "Both target and candidate are marked as Final Season";
    reasons.push(seasonReason);
  } else if (targetMeta.isFinalSeason && candidateSeasonNumber !== null) {
    seasonScore = 0.2;
    seasonReason = `Target is Final Season, candidate has numeric season ${candidateSeasonNumber}`;
    conflicts.push(seasonReason);
  } else if (targetMeta.isFinalSeason && !candidateIsFinal) {
    seasonScore = 0.1;
    seasonReason = "Target is Final Season, but candidate is not marked as Final Season";
    conflicts.push(seasonReason);
  } else if (!targetMeta.isFinalSeason && candidateIsFinal) {
    seasonScore = 0.1;
    seasonReason = "Candidate is Final Season, but target is not Final Season";
    conflicts.push(seasonReason);
  } else if (targetMeta.targetSeasonNumber === null && candidateSeasonNumber !== null) {
    // If target has no season in title (e.g. root Season 1), but candidate is Season 2+ -> conflict!
    if (candidateSeasonNumber > 1) {
      seasonScore = 0.0;
      seasonReason = `Target has no season (implied Season 1), but candidate is Season ${candidateSeasonNumber}`;
      conflicts.push(seasonReason);
    } else {
      seasonScore = 0.9;
      seasonReason = "Target is root/Season 1 and candidate matches Season 1";
      reasons.push(seasonReason);
    }
  } else if (targetMeta.targetSeasonNumber !== null && candidateSeasonNumber === null) {
    if (targetMeta.targetSeasonNumber > 1) {
      seasonScore = 0.1;
      seasonReason = `Target is Season ${targetMeta.targetSeasonNumber}, but candidate does not specify a season`;
      conflicts.push(seasonReason);
    } else {
      seasonScore = 0.9;
      seasonReason = "Target is Season 1 and candidate has no suffix (implied Season 1)";
      reasons.push(seasonReason);
    }
  } else {
    // Neither specifies season -> both implied Season 1 / Base
    seasonScore = 1.0;
    seasonReason = "Both target and candidate represent root season";
    reasons.push(seasonReason);
  }

  breakdown.seasonMatch = {
    weight: weights.seasonMatch,
    score: seasonScore,
    reason: seasonReason,
  };

  // ============================================================
  // 4. Part / Cour Alignment
  // ============================================================
  let partScore = 0.8; // neutral-positive by default
  let partReason = "No specific part/cour constraint";

  if (targetMeta.targetPartNumber !== null && candidatePartNumber !== null) {
    if (targetMeta.targetPartNumber === candidatePartNumber) {
      partScore = 1.0;
      partReason = `Exact part number match (Part ${targetMeta.targetPartNumber})`;
      reasons.push(partReason);
    } else {
      partScore = 0.0;
      partReason = `Part number mismatch: Target is Part ${targetMeta.targetPartNumber}, candidate is Part ${candidatePartNumber}`;
      conflicts.push(partReason);
    }
  } else if (targetMeta.targetCourNumber !== null && candidateCourNumber !== null) {
    if (targetMeta.targetCourNumber === candidateCourNumber) {
      partScore = 1.0;
      partReason = `Exact cour number match (Cour ${targetMeta.targetCourNumber})`;
      reasons.push(partReason);
    } else {
      partScore = 0.0;
      partReason = `Cour number mismatch: Target is Cour ${targetMeta.targetCourNumber}, candidate is Cour ${candidateCourNumber}`;
      conflicts.push(partReason);
    }
  } else if (targetMeta.targetPartNumber !== null && candidatePartNumber === null) {
    partScore = 0.3;
    partReason = `Target expects Part ${targetMeta.targetPartNumber}, but candidate has no part designation`;
    conflicts.push(partReason);
  } else if (targetMeta.targetPartNumber === null && candidatePartNumber !== null) {
    // Target is general season, candidate is specific part (e.g. S3 vs S3 Part 2)
    partScore = 0.5;
    partReason = `Candidate specifies Part ${candidatePartNumber}, target is whole season`;
  }

  breakdown.partMatch = {
    weight: weights.partMatch,
    score: partScore,
    reason: partReason,
  };

  // ============================================================
  // 5. Release Year Proximity
  // ============================================================
  let yearScore = 0.5;
  let yearReason = "Year unknown on target or candidate";

  const targetYear = targetMeta.targetYear;
  const candidateYear = candidate.year;

  if (targetYear && candidateYear) {
    const diff = Math.abs(targetYear - candidateYear);
    if (diff === 0) {
      yearScore = 1.0;
      yearReason = `Exact release year match (${targetYear})`;
      reasons.push(yearReason);
    } else if (diff === 1) {
      yearScore = 0.8;
      yearReason = `Release year compatible (Target: ${targetYear}, Candidate: ${candidateYear})`;
      reasons.push(yearReason);
    } else if (diff === 2) {
      yearScore = 0.5;
      yearReason = `Release year close (Target: ${targetYear}, Candidate: ${candidateYear})`;
    } else {
      // Discrepancy >= 3 years (e.g. Fruits Basket 2001 vs 2019)
      yearScore = 0.0;
      yearReason = `Release year conflict (Target: ${targetYear} vs Candidate: ${candidateYear})`;
      conflicts.push(yearReason);
    }
  }

  breakdown.yearProximity = {
    weight: weights.yearProximity,
    score: yearScore,
    reason: yearReason,
  };

  // ============================================================
  // 6. Format Compatibility
  // ============================================================
  let formatScore = 0.8;
  let formatReason = "Format compatible";

  if (targetMeta.targetFormat === "MOVIE" && (candMain.isMovie || candEn.isMovie)) {
    formatScore = 1.0;
    formatReason = "Both target and candidate are movies";
    reasons.push(formatReason);
  } else if (targetMeta.targetFormat === "TV" && (candMain.isMovie || candEn.isMovie)) {
    formatScore = 0.0;
    formatReason = "Format mismatch: Target is a TV series, but candidate is a Movie";
    conflicts.push(formatReason);
  } else if (targetMeta.targetFormat === "TV" && (candMain.isOVA || candEn.isOVA)) {
    formatScore = 0.1;
    formatReason = "Format mismatch: Target is a TV series, but candidate is an OVA";
    conflicts.push(formatReason);
  }

  breakdown.formatCompatibility = {
    weight: weights.formatCompatibility,
    score: formatScore,
    reason: formatReason,
  };

  // ============================================================
  // 7. Episode Count Compatibility & Validation
  // ============================================================
  let epScore = 0.5;
  let epReason = "Episode count not verifiable";

  if (candidate.episodeCount === 0) {
    epScore = 0.0;
    epReason = "Provider entry has 0 episodes in catalog";
    conflicts.push(epReason);
  } else if (targetMeta.expectedEpisodes && candidate.episodeCount > 0) {
    const exp = targetMeta.expectedEpisodes;
    const actual = candidate.episodeCount;
    const diff = Math.abs(exp - actual);

    if (diff === 0) {
      epScore = 1.0;
      epReason = `Exact episode count match (${actual} eps)`;
      reasons.push(epReason);
    } else if (diff <= 2) {
      epScore = 0.8;
      epReason = `Episode count close (Target: ${exp}, Candidate: ${actual})`;
    } else {
      epScore = 0.4;
      epReason = `Episode count difference (Target: ${exp}, Candidate: ${actual})`;
    }
  } else if (candidate.episodeCount > 0) {
    epScore = 0.8;
    epReason = `Candidate has ${candidate.episodeCount} episodes available`;
  }

  breakdown.episodeCompatibility = {
    weight: weights.episodeCompatibility,
    score: epScore,
    reason: epReason,
  };

  // ============================================================
  // Aggregate Score Calculation
  // ============================================================
  let totalWeight = 0;
  let weightedScore = 0;

  for (const signal of Object.values(breakdown)) {
    totalWeight += signal.weight;
    weightedScore += signal.weight * signal.score;
  }

  let finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Severe penalty if major conflict is present (e.g. wrong season or 0 episodes)
  const hasZeroEpisodes = candidate.episodeCount === 0;
  const hasSeasonConflict =
    seasonScore === 0.0 ||
    conflicts.some((c) => c.toLowerCase().includes("season"));
  const hasYearConflict = yearScore === 0.0 && targetYear !== null && candidateYear !== null;
  const hasFormatConflict = formatScore === 0.0;

  if (hasZeroEpisodes) {
    finalScore = Math.min(finalScore, 0.35);
  }
  if (hasSeasonConflict || hasYearConflict || hasFormatConflict) {
    finalScore = Math.min(finalScore, 0.40);
  }

  // ============================================================
  // Decision Logic
  // ============================================================
  let decision: "MATCHED" | "AMBIGUOUS" | "UNMAPPED";

  if (finalScore >= 0.72 && conflicts.length === 0) {
    decision = "MATCHED";
  } else if (finalScore >= 0.50 && !hasZeroEpisodes && !hasSeasonConflict && !hasFormatConflict) {
    decision = "AMBIGUOUS";
  } else {
    decision = "UNMAPPED";
  }

  return {
    candidate,
    score: parseFloat(finalScore.toFixed(3)),
    signalBreakdown: breakdown,
    reasons,
    conflicts,
    decision,
  };
}
