import {
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

console.log("--- Testing Episode Transition State Machine ---\n");

// Simulating the exact state machine of useSubtitlePreference across multiple episodes
class MockWatchSession {
  preferredSubtitle: string = "auto";
  availableSubtitles: Subtitle[] = [];

  constructor(initialPreference: string = "auto") {
    this.preferredSubtitle = initialPreference;
  }

  loadEpisode(subtitles: Subtitle[]) {
    this.availableSubtitles = subtitles;
  }

  get activeSubtitleResolution() {
    return resolveActiveSubtitle(this.availableSubtitles, this.preferredSubtitle);
  }

  selectSubtitle(index: number | null) {
    if (index === null) {
      this.preferredSubtitle = "none";
    } else {
      const sub = this.availableSubtitles[index];
      if (sub) {
        this.preferredSubtitle = getSubtitleLanguageIdentifier(sub);
      }
    }
  }

  resetToAuto() {
    this.preferredSubtitle = "auto";
  }
}

const arSub: Subtitle = { url: "ar.vtt", label: "Arabic", language: "ar", format: "vtt" };
const enSub: Subtitle = { url: "en.vtt", label: "English", language: "en", format: "vtt" };
const deSub: Subtitle = { url: "de.vtt", label: "German", language: "de", format: "vtt" };

const session = new MockWatchSession("auto");

// Episode 1
session.loadEpisode([arSub, enSub]);
assert(session.preferredSubtitle === "auto", "Episode 1: default preference is auto");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "ar", "Episode 1: active is Arabic");

// User selects English
session.selectSubtitle(1);
assert(session.preferredSubtitle === "en", "Episode 1: user selected English, preference is now en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "en", "Episode 1: active is now English");

// Episode 2 arrives (Arabic, English)
session.loadEpisode([arSub, enSub]);
assert(session.preferredSubtitle === "en", "Episode 2: preference preserved as en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "en", "Episode 2: active is English");

// Episode 3 arrives (Arabic only)
session.loadEpisode([arSub]);
assert(session.preferredSubtitle === "en", "Episode 3: preference remains en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "ar", "Episode 3: fallback temporarily to Arabic");
assert(session.preferredSubtitle === "en", "Episode 3: preference is STILL en");

// Episode 4 arrives (Arabic, English)
session.loadEpisode([arSub, enSub]);
assert(session.preferredSubtitle === "en", "Episode 4: preference remains en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "en", "Episode 4: English automatically used again");

// Episode 5 arrives (German only)
session.loadEpisode([deSub]);
assert(session.preferredSubtitle === "en", "Episode 5: preference remains en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "de", "Episode 5: fallback to German (first available)");

// Episode 6 arrives (No subtitles)
session.loadEpisode([]);
assert(session.preferredSubtitle === "en", "Episode 6: preference remains en");
assert(session.activeSubtitleResolution.activeSubtitle === null, "Episode 6: active is null when no subtitles");

// Episode 7 arrives (Arabic, English)
session.loadEpisode([arSub, enSub]);
assert(session.preferredSubtitle === "en", "Episode 7: preference remains en");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "en", "Episode 7: English active again");

// User selects Off
session.selectSubtitle(null);
assert(session.preferredSubtitle === "none", "User turned subtitles Off: preference is none");
assert(session.activeSubtitleResolution.activeSubtitle === null, "Active is null");

// Episode 8 arrives (Arabic, English)
session.loadEpisode([arSub, enSub]);
assert(session.preferredSubtitle === "none", "Episode 8: preference remains none");
assert(session.activeSubtitleResolution.activeSubtitle === null, "Episode 8: subtitles remain Off");

// User resets to Auto
session.resetToAuto();
assert(session.preferredSubtitle === "auto", "User reset to Auto");
assert(session.activeSubtitleResolution.activeSubtitle?.language === "ar", "Auto selects Arabic");

console.log(`\n========================================`);
console.log(`Hook State Machine Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
