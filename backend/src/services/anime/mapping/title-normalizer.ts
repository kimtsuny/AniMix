/**
 * Title normalization and string similarity utilities.
 *
 * Designed to preserve Unicode letters (Kanji, Kana, Cyrillic, accented Latin)
 * while standardizing punctuation, spacing, and symbols across data sources.
 */

/**
 * Normalizes a title for robust cross-provider comparison.
 *
 * Rules:
 * 1. Converts multiplication sign '×' (\u00D7) to ' x ' so "SPY×FAMILY" matches "SPY x FAMILY".
 * 2. Applies Unicode NFKD decomposition to normalize full-width characters and accents.
 * 3. Strips combining diacritical marks (\u0300-\u036F).
 * 4. Removes smart quotes and apostrophes to unify "Journey's" and "Journey’s".
 * 5. Replaces punctuation, brackets, hyphens, colons, and separators with a single space.
 * 6. Preserves Unicode letters (\p{L}) and numbers (\p{N}) - Kanji, Hiragana, Katakana, Latin, digits.
 * 7. Preserves distinguishing words (e.g., Brotherhood, Final, Zero, 2019, 2001).
 * 8. Collapses repeated whitespace and trims.
 */
export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "";

  return (
    title
      // 1. Unify '×' to ' x '
      .replace(/\u00D7/g, " x ")
      // 2. Unicode NFKD normalization (decomposes full-width Latin/numbers & accented letters)
      .normalize("NFKD")
      // 3. Strip combining diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // 4. Strip apostrophes/single quotes so contractions and possessives don't split
      .replace(/['’‘`]/g, "")
      // 5. Replace separators, punctuation, brackets, and symbols with spaces
      // Note: \p{L} matches any Unicode letter, \p{N} matches any number.
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      // 6. Lowercase
      .toLowerCase()
      // 7. Collapse consecutive whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Generates character bigrams for Sørensen–Dice coefficient calculation.
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculates Sørensen–Dice coefficient on character bigrams (0.0 to 1.0).
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  if (a.length < 2 || b.length < 2) return a === b ? 1.0 : 0.0;

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) {
      intersection++;
    }
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Calculates token-based Jaccard similarity (0.0 to 1.0).
 */
export function tokenJaccardSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0.0 : intersection / union;
}

/**
 * Computes an aggregate similarity score between two raw titles.
 * Normalized before comparison. Combines exact match, token overlap,
 * and character n-gram similarity.
 */
export function calculateTitleSimilarity(
  titleA: string | null | undefined,
  titleB: string | null | undefined
): number {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // Check prefix or complete containment
  const isSubstring =
    normA.includes(normB) || normB.includes(normA);

  const dice = diceCoefficient(normA, normB);
  const jaccard = tokenJaccardSimilarity(normA, normB);

  // If one title is completely contained within the other, boost token score
  const lengthRatio =
    Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);

  let score = 0.5 * dice + 0.5 * jaccard;

  if (isSubstring && lengthRatio > 0.6) {
    score = Math.max(score, 0.75 * lengthRatio + 0.25 * jaccard);
  }

  return Math.min(1.0, Math.max(0.0, score));
}
