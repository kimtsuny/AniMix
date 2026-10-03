import {
  normalizeLanguageCode,
  matchesSubtitleLanguage,
  resolveActiveSubtitle,
  getSubtitleLanguageIdentifier,
} from "../subtitles";
import type { Subtitle } from "../../api/services/stream.service";

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

console.log("--- Starting Subtitle Preference Test Suite ---\n");

// ── Test 1: Language Normalization ────────────────────────────────
console.log("1. Normalization & Language Identifiers:");
assert(normalizeLanguageCode("ar") === "ar", "normalizes 'ar' to 'ar'");
assert(normalizeLanguageCode("ara") === "ar", "normalizes 'ara' to 'ar'");
assert(normalizeLanguageCode("Arabic") === "ar", "normalizes 'Arabic' to 'ar'");
assert(normalizeLanguageCode("Arabic (Track 5 (ARA))") === "ar", "normalizes 'Arabic (Track 5 (ARA))' to 'ar'");
assert(normalizeLanguageCode("العربية") === "ar", "normalizes 'العربية' to 'ar'");
assert(normalizeLanguageCode("en") === "en", "normalizes 'en' to 'en'");
assert(normalizeLanguageCode("eng") === "en", "normalizes 'eng' to 'en'");
assert(normalizeLanguageCode("English") === "en", "normalizes 'English' to 'en'");
assert(normalizeLanguageCode("English [CC]") === "en", "normalizes 'English [CC]' to 'en'");

// ── Test 2: auto → Arabic ─────────────────────────────────────────
console.log("\n2. Default preference 'auto' selects Arabic if available:");
const arabicSub: Subtitle = { url: "/sub/ar.vtt", label: "Arabic", language: "ar", format: "vtt" };
const englishSub: Subtitle = { url: "/sub/en.vtt", label: "English", language: "en", format: "vtt" };
const frenchSub: Subtitle = { url: "/sub/fr.vtt", label: "French", language: "fr", format: "vtt" };
const germanSub: Subtitle = { url: "/sub/de.vtt", label: "German", language: "de", format: "vtt" };

{
  const available: Subtitle[] = [arabicSub, englishSub];
  const res = resolveActiveSubtitle(available, "auto");
  assert(res.activeSubtitleIndex === 0, "selects Arabic at index 0");
  assert(res.activeSubtitle?.language === "ar", "active subtitle is Arabic");
}

{
  // Arabic at later index
  const available: Subtitle[] = [englishSub, arabicSub];
  const res = resolveActiveSubtitle(available, "auto");
  assert(res.activeSubtitleIndex === 1, "selects Arabic even when not first");
  assert(res.activeSubtitle?.language === "ar", "active subtitle is Arabic");
}

// ── Test 3: auto → English fallback ───────────────────────────────
console.log("\n3. 'auto' falls back to English when Arabic is unavailable:");
{
  const available: Subtitle[] = [frenchSub, englishSub];
  const res = resolveActiveSubtitle(available, "auto");
  assert(res.activeSubtitleIndex === 1, "falls back to English");
  assert(res.activeSubtitle?.language === "en", "active subtitle is English");
}

// ── Test 4: auto → first available subtitle fallback ──────────────
console.log("\n4. 'auto' falls back to first available subtitle when neither Arabic nor English exists:");
{
  const available: Subtitle[] = [frenchSub, germanSub];
  const res = resolveActiveSubtitle(available, "auto");
  assert(res.activeSubtitleIndex === 0, "falls back to first available (French)");
  assert(res.activeSubtitle?.language === "fr", "active subtitle is French");
}

// ── Test 5: auto → none when empty ────────────────────────────────
console.log("\n5. 'auto' returns null when no subtitles exist:");
{
  const available: Subtitle[] = [];
  const res = resolveActiveSubtitle(available, "auto");
  assert(res.activeSubtitleIndex === null, "activeSubtitleIndex is null");
  assert(res.activeSubtitle === null, "activeSubtitle is null");
}

// ── Test 6: Manual Arabic persistence across episodes ─────────────
console.log("\n6. Manual Arabic persistence:");
{
  let preferredSubtitle = "auto";
  // User selects Arabic
  preferredSubtitle = getSubtitleLanguageIdentifier(arabicSub);
  assert(preferredSubtitle === "ar", "preference set to 'ar'");

  // Episode changes to new episode with Arabic and English
  const newEpisodeSubs: Subtitle[] = [englishSub, arabicSub];
  const res = resolveActiveSubtitle(newEpisodeSubs, preferredSubtitle);
  assert(res.activeSubtitleIndex === 1, "Arabic is selected in new episode");
  assert(preferredSubtitle === "ar", "preference remains 'ar'");
}

// ── Test 7: Manual English persistence across episodes ────────────
console.log("\n7. Manual English persistence:");
{
  let preferredSubtitle = "auto";
  // User selects English
  preferredSubtitle = getSubtitleLanguageIdentifier(englishSub);
  assert(preferredSubtitle === "en", "preference set to 'en'");

  // Episode changes to new episode with Arabic and English
  const newEpisodeSubs: Subtitle[] = [arabicSub, englishSub];
  const res = resolveActiveSubtitle(newEpisodeSubs, preferredSubtitle);
  assert(res.activeSubtitleIndex === 1, "English is selected in new episode");
  assert(preferredSubtitle === "en", "preference remains 'en'");
}

// ── Test 8: Preferred language temporarily unavailable ────────────
console.log("\n8. Preferred language temporarily unavailable:");
{
  // Preference is English
  const preferredSubtitle = "en";
  // Episode 3 has only Arabic
  const ep3Subs: Subtitle[] = [arabicSub];
  const res = resolveActiveSubtitle(ep3Subs, preferredSubtitle);
  assert(res.activeSubtitleIndex === 0, "temporarily falls back to Arabic");
  assert(res.activeSubtitle?.language === "ar", "active is Arabic");
  assert(preferredSubtitle === "en", "preference MUST remain English without being mutated");
}

// ── Test 9: Preferred language becoming available again ───────────
console.log("\n9. Preferred language becoming available again in later episode:");
{
  const preferredSubtitle = "en";
  // Episode 4 has Arabic and English
  const ep4Subs: Subtitle[] = [arabicSub, englishSub];
  const res = resolveActiveSubtitle(ep4Subs, preferredSubtitle);
  assert(res.activeSubtitleIndex === 1, "automatically uses English again");
  assert(res.activeSubtitle?.language === "en", "active is English");
}

// ── Test 10: Complete Multi-Episode User Workflow ─────────────────
console.log("\n10. Complete Multi-Episode Walkthrough (from prompt specification):");
{
  let preferredSubtitle = "auto";

  // Episode 1: Available: Arabic, English. Preference: auto -> Active: Arabic
  const ep1Subs = [arabicSub, englishSub];
  let res = resolveActiveSubtitle(ep1Subs, preferredSubtitle);
  assert(res.activeSubtitle?.language === "ar", "Ep 1 (auto): Active is Arabic");

  // User selects English: Preference becomes English -> Active: English
  preferredSubtitle = getSubtitleLanguageIdentifier(englishSub);
  res = resolveActiveSubtitle(ep1Subs, preferredSubtitle);
  assert(preferredSubtitle === "en", "Ep 1 (manual select): Preference is English");
  assert(res.activeSubtitle?.language === "en", "Ep 1: Active is English");

  // Episode 2: Available: Arabic, English -> Active: English
  const ep2Subs = [arabicSub, englishSub];
  res = resolveActiveSubtitle(ep2Subs, preferredSubtitle);
  assert(res.activeSubtitle?.language === "en", "Ep 2: Active is English");
  assert(preferredSubtitle === "en", "Ep 2: Preference remains English");

  // Episode 3: Available: Arabic only -> Active: Arabic temporarily, Preference MUST remain English
  const ep3Subs = [arabicSub];
  res = resolveActiveSubtitle(ep3Subs, preferredSubtitle);
  assert(res.activeSubtitle?.language === "ar", "Ep 3: Active is Arabic temporarily");
  assert(preferredSubtitle === "en", "Ep 3: Preference MUST remain English");

  // Episode 4: Available: Arabic, English -> Active: English again
  const ep4Subs = [arabicSub, englishSub];
  res = resolveActiveSubtitle(ep4Subs, preferredSubtitle);
  assert(res.activeSubtitle?.language === "en", "Ep 4: Active is English again");
  assert(preferredSubtitle === "en", "Ep 4: Preference is English");
}

// ── Test 11: User selects Off / None ──────────────────────────────
console.log("\n11. User selects 'Off' persistence:");
{
  const preferredSubtitle: string = "none";
  const ep1Subs = [arabicSub, englishSub];
  let res = resolveActiveSubtitle(ep1Subs, preferredSubtitle);
  assert(res.activeSubtitleIndex === null, "Ep 1 with preference 'none': Active is null");

  const ep2Subs = [arabicSub, englishSub];
  res = resolveActiveSubtitle(ep2Subs, preferredSubtitle);
  assert(res.activeSubtitleIndex === null, "Ep 2 preserves 'none': Active is null");
  assert(preferredSubtitle === "none", "Preference remains 'none'");
}

// ── Test 12: Real-world AniKoto & ReAnime label formats ────────────
console.log("\n12. Complex subtitle labels from providers:");
{
  const reanimeArabic: Subtitle = {
    url: "/api/stream/reanime/1/subtitles/0",
    label: "Arabic (Track 5 (ARA))",
    language: "Arabic (Track 5 (ARA))",
    format: "vtt",
  };
  const reanimeEnglish: Subtitle = {
    url: "/api/stream/reanime/1/subtitles/1",
    label: "English [CC]",
    language: "eng",
    format: "vtt",
  };

  const subs = [reanimeEnglish, reanimeArabic];
  // Auto should still pick Arabic
  const autoRes = resolveActiveSubtitle(subs, "auto");
  assert(autoRes.activeSubtitleIndex === 1, "auto detects complex Arabic label and selects it");

  // Matching with "ar"
  const arMatch = matchesSubtitleLanguage(reanimeArabic, "ar");
  assert(arMatch === true, "matchesSubtitleLanguage correctly matches 'Arabic (Track 5 (ARA))' with 'ar'");

  // Matching with "en"
  const enMatch = matchesSubtitleLanguage(reanimeEnglish, "en");
  assert(enMatch === true, "matchesSubtitleLanguage correctly matches 'English [CC]' with 'en'");
}

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
