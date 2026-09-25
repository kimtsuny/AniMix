import { normalizeTitle } from "./title-normalizer.js";

/**
 * Structured metadata extracted from an anime title.
 *
 * Separates the concepts of:
 * - baseTitle (the core franchise name)
 * - season numbers (explicit vs ordinal vs final)
 * - parts / cours (sub-divisions within a season)
 * - media formats (Movie, Special, OVA)
 * - release year qualifiers
 */
export interface ParsedTitleMetadata {
  rawTitle: string;
  baseTitle: string;
  normalizedBaseTitle: string;
  explicitSeasonNumber: number | null;
  ordinalSeasonNumber: number | null;
  partNumber: number | null;
  courNumber: number | null;
  isFinalSeason: boolean;
  isFinalChapters: boolean;
  isMovie: boolean;
  isSpecial: boolean;
  isOVA: boolean;
  year: number | null;
}

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

const WORD_ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
};

/**
 * Parses an anime title into structured semantic metadata.
 * Does NOT hardcode any anime titles.
 */
export function classifyTitle(rawTitle: string): ParsedTitleMetadata {
  const title = (rawTitle ?? "").trim();
  let workingTitle = title;

  // 1. Detect Year qualifier (e.g. "(2019)", "[2001]", or trailing "2019")
  let year: number | null = null;
  const yearMatch = workingTitle.match(/[([{\s](19\d{2}|20\d{2})[)\]}\s]?$/i);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    // Remove year tag from working title
    workingTitle = workingTitle.replace(yearMatch[0], " ").trim();
  }

  // 2. Detect Format markers (Movie, OVA, Special)
  let isMovie = false;
  let isSpecial = false;
  let isOVA = false;

  const movieMatch = workingTitle.match(/\b(the\s+movie|movie|gekijouban|film)\b/i);
  if (movieMatch) {
    isMovie = true;
    workingTitle = workingTitle.replace(movieMatch[0], " ").trim();
  }

  const specialMatch = workingTitle.match(/\b(specials?|sp)\b/i);
  if (specialMatch) {
    isSpecial = true;
    workingTitle = workingTitle.replace(specialMatch[0], " ").trim();
  }

  const ovaMatch = workingTitle.match(/\b(ova|oad)\b/i);
  if (ovaMatch) {
    isOVA = true;
    workingTitle = workingTitle.replace(ovaMatch[0], " ").trim();
  }

  // 3. Detect Final Chapters / Kanketsu-hen
  let isFinalChapters = false;
  const finalChaptersMatch = workingTitle.match(/\b(the\s+final\s+chapters?|final\s+chapters?|kanketsu[\s-]?hen)\b/i);
  if (finalChaptersMatch) {
    isFinalChapters = true;
    workingTitle = workingTitle.replace(finalChaptersMatch[0], " ").trim();
  }

  // 4. Detect Final Season
  let isFinalSeason = false;
  const finalSeasonMatch = workingTitle.match(/\b(the\s+final(?:\s+season)?|final\s+season)\b/i);
  if (finalSeasonMatch) {
    isFinalSeason = true;
    workingTitle = workingTitle.replace(finalSeasonMatch[0], " ").trim();
  }

  // 5. Detect Part / Cour
  let partNumber: number | null = null;
  let courNumber: number | null = null;

  // Part with digits or Roman numerals: "Part 2", "Part.2", "Part II"
  const partMatch = workingTitle.match(/\bpart(?:[\s.]+|:)?(\d+|i{1,3}|iv|v)\b/i);
  if (partMatch) {
    const rawVal = partMatch[1].toLowerCase();
    partNumber = ROMAN_NUMERALS[rawVal] ?? parseInt(rawVal, 10);
    workingTitle = workingTitle.replace(partMatch[0], " ").trim();
  }

  // Cour with digits or Roman numerals: "Cour 2", "Cour II"
  const courMatch = workingTitle.match(/\bcour\s*(\d+|i{1,3}|iv|v)\b/i);
  if (courMatch) {
    const rawVal = courMatch[1].toLowerCase();
    courNumber = ROMAN_NUMERALS[rawVal] ?? parseInt(rawVal, 10);
    workingTitle = workingTitle.replace(courMatch[0], " ").trim();
  }

  // 6. Detect Explicit Season Numbers ("Season 2", "S2", "Season II")
  let explicitSeasonNumber: number | null = null;

  const explicitSeasonMatch = workingTitle.match(/\bseason\s*(\d+|i{1,3}|iv|v|vi|vii|viii|ix|x)\b/i);
  if (explicitSeasonMatch) {
    const rawVal = explicitSeasonMatch[1].toLowerCase();
    explicitSeasonNumber = ROMAN_NUMERALS[rawVal] ?? parseInt(rawVal, 10);
    workingTitle = workingTitle.replace(explicitSeasonMatch[0], " ").trim();
  } else {
    // Check "S2" / "S02" (must be preceded by space or start, not a word like "SAKAMOTO")
    const sPrefixMatch = workingTitle.match(/(?:^|\s)s(\d{1,2})\b/i);
    if (sPrefixMatch) {
      explicitSeasonNumber = parseInt(sPrefixMatch[1], 10);
      workingTitle = workingTitle.replace(sPrefixMatch[0], " ").trim();
    }
  }

  // 7. Detect Ordinal Season Numbers ("2nd Season", "3rd Season", "Second Season")
  let ordinalSeasonNumber: number | null = null;

  const ordinalNumericMatch = workingTitle.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i);
  if (ordinalNumericMatch) {
    ordinalSeasonNumber = parseInt(ordinalNumericMatch[1], 10);
    workingTitle = workingTitle.replace(ordinalNumericMatch[0], " ").trim();
  } else {
    const wordOrdinalMatch = workingTitle.match(/\b(first|second|third|fourth|fifth|sixth)\s+season\b/i);
    if (wordOrdinalMatch) {
      ordinalSeasonNumber = WORD_ORDINALS[wordOrdinalMatch[1].toLowerCase()] ?? null;
      workingTitle = workingTitle.replace(wordOrdinalMatch[0], " ").trim();
    }
  }

  // Clean trailing punctuation or dangling colons/hyphens from workingTitle
  const baseTitle = workingTitle
    .replace(/[:\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    rawTitle,
    baseTitle: baseTitle || title,
    normalizedBaseTitle: normalizeTitle(baseTitle || title),
    explicitSeasonNumber,
    ordinalSeasonNumber,
    partNumber,
    courNumber,
    isFinalSeason,
    isFinalChapters,
    isMovie,
    isSpecial,
    isOVA,
    year,
  };
}
