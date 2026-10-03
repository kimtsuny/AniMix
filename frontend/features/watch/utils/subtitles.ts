import type { Subtitle } from "../api/services/stream.service";

export type SubtitlePreference = "auto" | "none" | string;

export interface SubtitleResolutionResult {
  activeSubtitleIndex: number | null;
  activeSubtitle: Subtitle | null;
}

/**
 * Normalizes a language code or label to a canonical ISO-639-1 code if known,
 * or returns a trimmed lowercase string.
 */
export function normalizeLanguageCode(val?: string | null): string {
  if (!val) return "";
  const clean = val.trim().toLowerCase();

  // Arabic checks
  if (
    clean === "ar" ||
    clean === "ara" ||
    clean === "arabic" ||
    clean.startsWith("ar-") ||
    clean.startsWith("ar_") ||
    clean.startsWith("arabic") ||
    clean.includes("العربية") ||
    clean.includes("عربي") ||
    /\b(ar|ara|arabic)\b/i.test(clean)
  ) {
    return "ar";
  }

  // English checks
  if (
    clean === "en" ||
    clean === "eng" ||
    clean === "english" ||
    clean.startsWith("en-") ||
    clean.startsWith("en_") ||
    clean.startsWith("english") ||
    /\b(en|eng|english)\b/i.test(clean)
  ) {
    return "en";
  }

  // Spanish checks
  if (
    clean === "es" ||
    clean === "spa" ||
    clean === "spanish" ||
    clean === "español" ||
    clean.startsWith("es-") ||
    clean.startsWith("es_") ||
    clean.startsWith("spanish") ||
    clean.startsWith("español") ||
    /\b(es|spa|spanish|español)\b/i.test(clean)
  ) {
    return "es";
  }

  // French checks
  if (
    clean === "fr" ||
    clean === "fre" ||
    clean === "fra" ||
    clean === "french" ||
    clean === "français" ||
    clean.startsWith("fr-") ||
    clean.startsWith("fr_") ||
    clean.startsWith("french") ||
    /\b(fr|fre|fra|french|français)\b/i.test(clean)
  ) {
    return "fr";
  }

  // German checks
  if (
    clean === "de" ||
    clean === "ger" ||
    clean === "deu" ||
    clean === "german" ||
    clean === "deutsch" ||
    clean.startsWith("de-") ||
    clean.startsWith("de_") ||
    /\b(de|ger|deu|german|deutsch)\b/i.test(clean)
  ) {
    return "de";
  }

  // Italian checks
  if (
    clean === "it" ||
    clean === "ita" ||
    clean === "italian" ||
    clean === "italiano" ||
    clean.startsWith("it-") ||
    clean.startsWith("it_") ||
    /\b(it|ita|italian|italiano)\b/i.test(clean)
  ) {
    return "it";
  }

  // Portuguese checks
  if (
    clean === "pt" ||
    clean === "por" ||
    clean === "portuguese" ||
    clean === "português" ||
    clean.startsWith("pt-") ||
    clean.startsWith("pt_") ||
    /\b(pt|por|portuguese|português)\b/i.test(clean)
  ) {
    return "pt";
  }

  // Russian checks
  if (
    clean === "ru" ||
    clean === "rus" ||
    clean === "russian" ||
    clean === "русский" ||
    clean.startsWith("ru-") ||
    clean.startsWith("ru_") ||
    /\b(ru|rus|russian)\b/i.test(clean)
  ) {
    return "ru";
  }

  // Japanese checks
  if (
    clean === "ja" ||
    clean === "jpn" ||
    clean === "japanese" ||
    clean === "日本語" ||
    clean.startsWith("ja-") ||
    clean.startsWith("ja_") ||
    /\b(ja|jpn|japanese)\b/i.test(clean)
  ) {
    return "ja";
  }

  // Korean checks
  if (
    clean === "ko" ||
    clean === "kor" ||
    clean === "korean" ||
    clean === "한국어" ||
    clean.startsWith("ko-") ||
    clean.startsWith("ko_") ||
    /\b(ko|kor|korean)\b/i.test(clean)
  ) {
    return "ko";
  }

  // Chinese checks
  if (
    clean === "zh" ||
    clean === "chi" ||
    clean === "zho" ||
    clean === "chinese" ||
    clean === "中文" ||
    clean.startsWith("zh-") ||
    clean.startsWith("zh_") ||
    /\b(zh|chi|zho|chinese)\b/i.test(clean)
  ) {
    return "zh";
  }

  // Default fallback: extract primary code/word
  const firstWord = clean.split(/[\s\(\[\-_]/)[0];
  return firstWord || clean;
}

/**
 * Returns the persistent language identifier for a subtitle track.
 * For Arabic, returns "ar". For English, returns "en", etc.
 */
export function getSubtitleLanguageIdentifier(subtitle: Subtitle): string {
  const fromLang = normalizeLanguageCode(subtitle.language);
  if (fromLang) return fromLang;
  const fromLabel = normalizeLanguageCode(subtitle.label);
  if (fromLabel) return fromLabel;
  return (subtitle.language || subtitle.label || "").toLowerCase().trim();
}

/**
 * Determines if a Subtitle matches a target language preference.
 */
export function matchesSubtitleLanguage(
  subtitle: Subtitle,
  targetPreference: string
): boolean {
  if (!targetPreference || targetPreference === "auto" || targetPreference === "none") {
    return false;
  }

  const normTarget = normalizeLanguageCode(targetPreference);

  // Check normalized language code
  const subLangNorm = normalizeLanguageCode(subtitle.language);
  if (subLangNorm && subLangNorm === normTarget) {
    return true;
  }

  // Check normalized label code
  const subLabelNorm = normalizeLanguageCode(subtitle.label);
  if (subLabelNorm && subLabelNorm === normTarget) {
    return true;
  }

  // Direct string match against language or label
  const cleanTarget = targetPreference.trim().toLowerCase();
  const cleanLang = (subtitle.language || "").trim().toLowerCase();
  const cleanLabel = (subtitle.label || "").trim().toLowerCase();

  if (cleanLang === cleanTarget || cleanLabel === cleanTarget) {
    return true;
  }

  // Substring / word boundary match
  const regex = new RegExp(`\\b${cleanTarget}\\b`, "i");
  return regex.test(cleanLang) || regex.test(cleanLabel);
}

/**
 * Resolves the active subtitle given the available subtitles of the current episode
 * and the persistent user preference.
 *
 * Rules:
 * 1. If availableSubtitles is empty -> null
 * 2. If preferredSubtitle === "none" -> null
 * 3. If preferredSubtitle is a concrete language (e.g. "ar", "en"):
 *    - If available in current episode -> select it
 *    - If unavailable -> temporarily fall back to normal fallback chain without changing preference
 * 4. Normal fallback chain (used for "auto" or when preferred language is unavailable):
 *    - Arabic if available
 *    - English if available
 *    - First available subtitle
 *    - null if no subtitles exist
 */
export function resolveActiveSubtitle(
  availableSubtitles: Subtitle[],
  preferredSubtitle: SubtitlePreference = "auto"
): SubtitleResolutionResult {
  if (!availableSubtitles || availableSubtitles.length === 0) {
    return { activeSubtitleIndex: null, activeSubtitle: null };
  }

  if (preferredSubtitle === "none") {
    return { activeSubtitleIndex: null, activeSubtitle: null };
  }

  // 1. If preferredSubtitle is a concrete language, try to find a match
  if (preferredSubtitle !== "auto") {
    const matchedIndex = availableSubtitles.findIndex((sub) =>
      matchesSubtitleLanguage(sub, preferredSubtitle)
    );
    if (matchedIndex !== -1) {
      return {
        activeSubtitleIndex: matchedIndex,
        activeSubtitle: availableSubtitles[matchedIndex],
      };
    }
    // If the preferred language is unavailable in the new episode,
    // temporarily fall back to the normal fallback chain without changing the saved preference.
  }

  // 2. Normal fallback chain:
  // Step a: Arabic if available
  const arabicIndex = availableSubtitles.findIndex((sub) =>
    matchesSubtitleLanguage(sub, "ar")
  );
  if (arabicIndex !== -1) {
    return {
      activeSubtitleIndex: arabicIndex,
      activeSubtitle: availableSubtitles[arabicIndex],
    };
  }

  // Step b: English if available
  const englishIndex = availableSubtitles.findIndex((sub) =>
    matchesSubtitleLanguage(sub, "en")
  );
  if (englishIndex !== -1) {
    return {
      activeSubtitleIndex: englishIndex,
      activeSubtitle: availableSubtitles[englishIndex],
    };
  }

  // Step c: First available subtitle
  return {
    activeSubtitleIndex: 0,
    activeSubtitle: availableSubtitles[0],
  };
}
