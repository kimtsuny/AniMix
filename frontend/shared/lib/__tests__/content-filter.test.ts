import {
  EXCLUDED_GENRES,
  NORMALIZED_EXCLUDED_GENRES,
  normalizeGenre,
  isExcludedGenre,
  hasExcludedGenre,
  hasVerifiedGenreMetadata,
  isAnimeAllowed,
  isAnimeExcluded,
  filterAllowedAnime,
} from "../content-filter";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

console.log("--- Running Centralized Content Filter Unit Tests ---\n");

// 1. Excluded genres constants
{
  assert(EXCLUDED_GENRES.includes("Ecchi"), "EXCLUDED_GENRES contains Ecchi");
  assert(EXCLUDED_GENRES.includes("Harem"), "EXCLUDED_GENRES contains Harem");
  assert(NORMALIZED_EXCLUDED_GENRES.has("ecchi"), "NORMALIZED contains lowercase ecchi");
  assert(NORMALIZED_EXCLUDED_GENRES.has("harem"), "NORMALIZED contains lowercase harem");
}

// 2. Normalization & exact genre matching
{
  assert(normalizeGenre("Ecchi") === "ecchi", "normalizes mixed case Ecchi");
  assert(normalizeGenre("  HAREM  ") === "harem", "normalizes whitespace and uppercase HAREM");
  assert(isExcludedGenre("Ecchi"), "isExcludedGenre('Ecchi') is true");
  assert(isExcludedGenre("ecchi"), "isExcludedGenre('ecchi') is true");
  assert(isExcludedGenre("ECCHI"), "isExcludedGenre('ECCHI') is true");
  assert(isExcludedGenre(" Harem "), "isExcludedGenre(' Harem ') is true");
  assert(isExcludedGenre("harem"), "isExcludedGenre('harem') is true");
  assert(isExcludedGenre("HAREM"), "isExcludedGenre('HAREM') is true");
  assert(!isExcludedGenre("Action"), "isExcludedGenre('Action') is false");
  assert(!isExcludedGenre("Romance"), "isExcludedGenre('Romance') is false");
  // Substring checks MUST NOT match
  assert(!isExcludedGenre("Ecchiness"), "No substring match for Ecchiness");
  assert(!isExcludedGenre("Reverse-Harem"), "Exact match prevents unrelated substrings");
  assert(!isExcludedGenre(""), "Empty string is not excluded genre");
}

// 3. hasExcludedGenre
{
  assert(hasExcludedGenre(["Action", "Ecchi"]), "detects Ecchi in genres array");
  assert(hasExcludedGenre(["Harem", "Comedy"]), "detects Harem in genres array");
  assert(hasExcludedGenre(["Action", "Harem", "Ecchi"]), "detects both genres simultaneously");
  assert(!hasExcludedGenre(["Action", "Adventure", "Fantasy"]), "clean genres return false");
  assert(!hasExcludedGenre([]), "empty array returns false");
  assert(!hasExcludedGenre(null), "null returns false");
  assert(!hasExcludedGenre(undefined), "undefined returns false");
}

// 4. Missing genre metadata handling (Requirement 6)
{
  assert(!hasVerifiedGenreMetadata(null), "null anime is not verified");
  assert(!hasVerifiedGenreMetadata(undefined), "undefined anime is not verified");
  assert(!hasVerifiedGenreMetadata({}), "missing genres field is not verified");
  assert(!hasVerifiedGenreMetadata({ genres: null }), "null genres is not verified");
  assert(!hasVerifiedGenreMetadata({ genres: undefined }), "undefined genres is not verified");
  assert(!hasVerifiedGenreMetadata({ genres: [] }), "empty genres array is not verified");
  assert(!hasVerifiedGenreMetadata({ genres: [""] }), "whitespace-only genre is not verified");
  assert(hasVerifiedGenreMetadata({ genres: ["Action"] }), "valid non-empty genres is verified");
}

// 5. isAnimeAllowed / isAnimeExcluded
{
  // Ecchi exclusion
  const ecchiAnime = { id: 1, isAdult: false, genres: ["Action", "Ecchi"] };
  assert(!isAnimeAllowed(ecchiAnime), "Ecchi anime is not allowed");
  assert(isAnimeExcluded(ecchiAnime), "Ecchi anime is excluded");

  // Harem exclusion
  const haremAnime = { id: 2, isAdult: false, genres: ["Comedy", "Harem"] };
  assert(!isAnimeAllowed(haremAnime), "Harem anime is not allowed");
  assert(isAnimeExcluded(haremAnime), "Harem anime is excluded");

  // Both genres present simultaneously
  const bothAnime = { id: 3, isAdult: false, genres: ["Ecchi", "Harem", "Romance"] };
  assert(!isAnimeAllowed(bothAnime), "Both genres simultaneously is not allowed");
  assert(isAnimeExcluded(bothAnime), "Both genres simultaneously is excluded");

  // Case normalization & whitespace
  const mixedCaseAnime = { id: 4, isAdult: false, genres: ["  eCChI  "] };
  assert(!isAnimeAllowed(mixedCaseAnime), "Mixed-case & padded Ecchi is excluded");

  // Ordinary anime remaining visible
  const ordinaryAnime = { id: 5, isAdult: false, genres: ["Action", "Adventure", "Fantasy"] };
  assert(isAnimeAllowed(ordinaryAnime), "Ordinary anime remains visible");
  assert(!isAnimeExcluded(ordinaryAnime), "Ordinary anime is not excluded");

  // Adult-only anime remaining excluded
  const adultAnime = { id: 6, isAdult: true, genres: ["Action", "Adventure"] };
  assert(!isAnimeAllowed(adultAnime), "Adult-only anime is excluded even with safe genres");
  assert(isAnimeExcluded(adultAnime), "Adult-only anime is excluded");

  // Missing genre metadata safe handling
  const noGenresAnime = { id: 7, isAdult: false };
  assert(!isAnimeAllowed(noGenresAnime), "Anime with missing genres is excluded");
  const nullGenresAnime = { id: 8, isAdult: false, genres: null };
  assert(!isAnimeAllowed(nullGenresAnime), "Anime with null genres is excluded");
  const emptyGenresAnime = { id: 9, isAdult: false, genres: [] };
  assert(!isAnimeAllowed(emptyGenresAnime), "Anime with empty genres array is excluded");
}

// 6. filterAllowedAnime
{
  const candidates = [
    { id: 1, isAdult: false, genres: ["Action", "Ecchi"] }, // Ecchi
    { id: 2, isAdult: false, genres: ["Adventure"] }, // Safe
    { id: 3, isAdult: true, genres: ["Comedy"] }, // Adult
    { id: 4, isAdult: false, genres: ["Harem", "Romance"] }, // Harem
    { id: 5, isAdult: false, genres: null }, // Missing
    { id: 6, isAdult: false, genres: ["Sci-Fi", "Drama"] }, // Safe
    { id: 7, isAdult: false, genres: ["ecchi", "harem"] }, // Both
  ];

  const allowed = filterAllowedAnime(candidates);
  assert(allowed.length === 2, "Filters candidates leaving exactly 2 safe items");
  assert(allowed[0].id === 2, "Candidate 2 retained");
  assert(allowed[1].id === 6, "Candidate 6 retained");
  assert(filterAllowedAnime(null).length === 0, "filterAllowedAnime(null) returns empty array");
  assert(filterAllowedAnime([]).length === 0, "filterAllowedAnime([]) returns empty array");
}

console.log(`\n========================================`);
console.log(`Content Filter Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
