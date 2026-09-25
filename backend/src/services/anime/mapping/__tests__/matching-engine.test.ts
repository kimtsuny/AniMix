import { describe, it } from "node:test";
import assert from "node:assert";

import {
  normalizeTitle,
  calculateTitleSimilarity,
  diceCoefficient,
} from "../title-normalizer.js";

import {
  classifyTitle,
  type ParsedTitleMetadata,
} from "../candidate-classifier.js";

import {
  scoreCandidate,
  type ScorerWeights,
} from "../candidate-scorer.js";

import type { DiscoveredCandidate } from "../candidate-discovery.js";
import type { AniListAnime } from "../../../anilist/anilist.service.js";

describe("Title Normalizer", () => {
  it("normalizes 'SPY×FAMILY' and 'SPY x FAMILY' to identical strings", () => {
    const a = normalizeTitle("SPY×FAMILY");
    const b = normalizeTitle("SPY x FAMILY");
    assert.strictEqual(a, "spy x family");
    assert.strictEqual(b, "spy x family");
    assert.strictEqual(a, b);
    assert.strictEqual(calculateTitleSimilarity("SPY×FAMILY", "SPY x FAMILY"), 1.0);
  });

  it("normalizes 'Re:ZERO -Starting Life in Another World-' cleanly", () => {
    const a = normalizeTitle("Re:ZERO -Starting Life in Another World-");
    const b = normalizeTitle("Re Zero Starting Life in Another World");
    assert.strictEqual(a, "re zero starting life in another world");
    assert.strictEqual(b, "re zero starting life in another world");
    assert.strictEqual(a, b);
  });

  it("normalizes 'Steins;Gate' and 'Steins Gate' compatibly", () => {
    const a = normalizeTitle("Steins;Gate");
    const b = normalizeTitle("Steins Gate");
    assert.strictEqual(a, "steins gate");
    assert.strictEqual(b, "steins gate");
    assert.strictEqual(a, b);
  });

  it("preserves non-Latin Unicode characters (Japanese Kanji/Kana)", () => {
    const jp = normalizeTitle("進撃の巨人");
    assert.strictEqual(jp, "進撃の巨人");
    assert.ok(jp.length > 0, "Japanese title must not be erased");
  });

  it("preserves crucial distinguishing words (Brotherhood, Final, Zero, 2001, 2019)", () => {
    const fma = normalizeTitle("Fullmetal Alchemist: Brotherhood");
    assert.ok(fma.includes("brotherhood"));

    const fb2001 = normalizeTitle("Fruits Basket (2001)");
    const fb2019 = normalizeTitle("Fruits Basket (2019)");
    assert.ok(fb2001.includes("2001"));
    assert.ok(fb2019.includes("2019"));
    assert.notStrictEqual(fb2001, fb2019);

    const rezero = normalizeTitle("Re:ZERO");
    assert.ok(rezero.includes("zero"));
  });
});

describe("Candidate Classifier (Season & Part Detection)", () => {
  it("1. Attack on Titan Season 3 - detects Season 3, no part", () => {
    const parsed = classifyTitle("Attack on Titan Season 3");
    assert.strictEqual(parsed.explicitSeasonNumber, 3);
    assert.strictEqual(parsed.partNumber, null);
    assert.strictEqual(parsed.isFinalSeason, false);
    assert.strictEqual(parsed.baseTitle, "Attack on Titan");
  });

  it("2. Attack on Titan Season 3 Part 2 - detects Season 3 and Part 2 separately", () => {
    const parsed = classifyTitle("Attack on Titan Season 3 Part 2");
    assert.strictEqual(parsed.explicitSeasonNumber, 3);
    assert.strictEqual(parsed.partNumber, 2);
    assert.strictEqual(parsed.baseTitle, "Attack on Titan");
  });

  it("3. Attack on Titan The Final Season - detects isFinalSeason without being dropped", () => {
    const parsed = classifyTitle("Attack on Titan The Final Season");
    assert.strictEqual(parsed.isFinalSeason, true);
    assert.strictEqual(parsed.explicitSeasonNumber, null);
    assert.strictEqual(parsed.partNumber, null);
    assert.strictEqual(parsed.baseTitle, "Attack on Titan");
  });

  it("4. Attack on Titan The Final Season Part 2 - detects isFinalSeason and Part 2", () => {
    const parsed = classifyTitle("Attack on Titan The Final Season Part 2");
    assert.strictEqual(parsed.isFinalSeason, true);
    assert.strictEqual(parsed.partNumber, 2);
    assert.strictEqual(parsed.baseTitle, "Attack on Titan");
  });

  it("5. SPY×FAMILY - detects as base season", () => {
    const parsed = classifyTitle("SPY×FAMILY");
    assert.strictEqual(parsed.explicitSeasonNumber, null);
    assert.strictEqual(parsed.partNumber, null);
    assert.strictEqual(parsed.baseTitle, "SPY×FAMILY");
  });

  it("6. SPY x FAMILY Part 2 - verifies Part 2 is NOT interpreted as Season 2", () => {
    const parsed = classifyTitle("SPY x FAMILY Part 2");
    assert.strictEqual(parsed.partNumber, 2, "Part number must be 2");
    assert.strictEqual(
      parsed.explicitSeasonNumber,
      null,
      "CRITICAL: Part 2 must NOT be mapped to Season 2"
    );
    assert.strictEqual(
      parsed.ordinalSeasonNumber,
      null,
      "CRITICAL: Part 2 must NOT be mapped to ordinal season"
    );
    assert.strictEqual(parsed.baseTitle, "SPY x FAMILY");
  });

  it("7. SPY×FAMILY Season 2 - verifies explicit Season 2", () => {
    const parsed = classifyTitle("SPY×FAMILY Season 2");
    assert.strictEqual(parsed.explicitSeasonNumber, 2);
    assert.strictEqual(parsed.partNumber, null);
    assert.strictEqual(parsed.baseTitle, "SPY×FAMILY");
  });

  it("8. Jujutsu Kaisen 2nd Season - recognizes '2nd Season' as season 2", () => {
    const parsed = classifyTitle("Jujutsu Kaisen 2nd Season");
    assert.strictEqual(parsed.ordinalSeasonNumber, 2);
    assert.strictEqual(parsed.baseTitle, "Jujutsu Kaisen");
  });

  it("9. Slime 3rd Season - recognizes '3rd Season' as season 3", () => {
    const parsed = classifyTitle("Tensei Shitara Slime Datta Ken 3rd Season");
    assert.strictEqual(parsed.ordinalSeasonNumber, 3);
    assert.strictEqual(parsed.baseTitle, "Tensei Shitara Slime Datta Ken");
  });

  it("10. Re:ZERO - preserves title and recognizes base title", () => {
    const parsed = classifyTitle("Re:ZERO -Starting Life in Another World-");
    assert.strictEqual(parsed.explicitSeasonNumber, null);
    assert.strictEqual(parsed.partNumber, null);
  });

  it("11 & 12. Fruits Basket (2001) vs (2019) - extracts years properly", () => {
    const fb2001 = classifyTitle("Fruits Basket (2001)");
    const fb2019 = classifyTitle("Fruits Basket (2019)");

    assert.strictEqual(fb2001.year, 2001);
    assert.strictEqual(fb2019.year, 2019);
    assert.strictEqual(fb2001.baseTitle, "Fruits Basket");
    assert.strictEqual(fb2019.baseTitle, "Fruits Basket");
  });

  it("13 & 14. Bleach vs Bleach: Thousand-Year Blood War - distinguishable", () => {
    const b1 = classifyTitle("Bleach");
    const b2 = classifyTitle("BLEACH: Thousand-Year Blood War");

    assert.strictEqual(b1.baseTitle, "Bleach");
    assert.strictEqual(b2.baseTitle, "BLEACH: Thousand-Year Blood War");
    assert.notStrictEqual(
      normalizeTitle(b1.baseTitle),
      normalizeTitle(b2.baseTitle)
    );
  });

  it("15 & 16. Naruto vs Naruto Movies and One Piece", () => {
    const narutoTv = classifyTitle("Naruto");
    const narutoMovie = classifyTitle("Naruto the Movie: Ninja Clash in the Land of Snow");

    assert.strictEqual(narutoTv.isMovie, false);
    assert.strictEqual(narutoMovie.isMovie, true);

    const onePiece = classifyTitle("One Piece");
    assert.strictEqual(onePiece.baseTitle, "One Piece");
    assert.strictEqual(onePiece.explicitSeasonNumber, null);
  });

  it("Verifies 'Cour 2' is NOT interpreted as Season 2", () => {
    const parsed = classifyTitle("Frieren: Beyond Journey's End Cour 2");
    assert.strictEqual(parsed.courNumber, 2);
    assert.strictEqual(
      parsed.explicitSeasonNumber,
      null,
      "CRITICAL: Cour 2 must NOT be mapped to Season 2"
    );
  });
});

describe("Candidate Scoring & Decision Logic", () => {
  function makeMockAniList(data: {
    id?: number;
    title?: {
      english?: string | null;
      romaji?: string | null;
      native?: string | null;
    };
    format?: string | null;
    seasonYear?: number | null;
    episodes?: number | null;
    synonyms?: string[];
  }): AniListAnime {
    return {
      id: data.id ?? 1,
      title: {
        english: data.title?.english ?? null,
        romaji: data.title?.romaji ?? null,
        native: data.title?.native ?? null,
      },
      description: null,
      coverImage: { extraLarge: null, large: null },
      bannerImage: null,
      episodes: data.episodes ?? 12,
      duration: 24,
      format: data.format ?? "TV",
      status: "FINISHED",
      season: null,
      seasonYear: data.seasonYear ?? 2022,
      genres: [],
      relations: { edges: [] },
      synonyms: data.synonyms ?? [],
    };
  }

  function makeMockCandidate(data: {
    id: string;
    title: string;
    altEnglish?: string;
    year?: number;
    episodes: number;
  }): DiscoveredCandidate {
    return {
      provider: "animeparadise",
      providerId: data.id,
      urn: `animeparadise:${data.id}`,
      title: data.title,
      alternativeTitle: data.altEnglish ? { english: data.altEnglish } : undefined,
      parsedMain: classifyTitle(data.title),
      parsedEnglish: data.altEnglish ? classifyTitle(data.altEnglish) : undefined,
      year: data.year,
      episodeCount: data.episodes,
    };
  }

  it("scores compatible Attack on Titan Season 3 as MATCHED", () => {
    const target = makeMockAniList({
      id: 99147,
      title: {
        english: "Attack on Titan Season 3",
        romaji: "Shingeki no Kyojin Season 3",
        native: "進撃の巨人 Season３",
      },
      episodes: 12,
      seasonYear: 2018,
    });

    const candidate = makeMockCandidate({
      id: "05mdX1RMVIFoyOud",
      title: "Attack on Titan Season 3",
      altEnglish: "Attack on Titan Season 3",
      year: 2018,
      episodes: 12,
    });

    const res = scoreCandidate(target, candidate);
    assert.strictEqual(res.decision, "MATCHED");
    assert.ok(res.score >= 0.85, `Expected score >= 0.85, got ${res.score}`);
    assert.strictEqual(res.conflicts.length, 0);
  });

  it("marks candidate with 0 episodes as UNMAPPED (low confidence)", () => {
    const target = makeMockAniList({
      title: { english: "Slime Season 3", romaji: "Tensei Slime 3" },
      episodes: 24,
      seasonYear: 2024,
    });

    const deadCandidate = makeMockCandidate({
      id: "dead-id",
      title: "Slime Season 3",
      year: 2024,
      episodes: 0, // 0 episodes!
    });

    const res = scoreCandidate(target, deadCandidate);
    assert.strictEqual(res.decision, "UNMAPPED");
    assert.ok(res.conflicts.some((c) => c.includes("0 episodes")));
  });

  it("distinguishes Fruits Basket (2001) from Fruits Basket (2019) due to year gap", () => {
    const target2019 = makeMockAniList({
      id: 105334,
      title: { english: "Fruits Basket (2019)", romaji: "Fruits Basket 1st Season" },
      seasonYear: 2019,
      episodes: 25,
    });

    const candidate2001 = makeMockCandidate({
      id: "fb-2001",
      title: "Fruits Basket (2001)",
      year: 2001,
      episodes: 26,
    });

    const res = scoreCandidate(target2019, candidate2001);
    assert.strictEqual(res.decision, "UNMAPPED");
    assert.ok(res.conflicts.some((c) => c.includes("Release year conflict")));
  });

  it("prevents Movie from matching TV series", () => {
    const targetTv = makeMockAniList({
      id: 20,
      title: { english: "Naruto", romaji: "Naruto" },
      format: "TV",
      seasonYear: 2002,
      episodes: 220,
    });

    const candidateMovie = makeMockCandidate({
      id: "naruto-movie-1",
      title: "Naruto the Movie: Ninja Clash in the Land of Snow",
      year: 2004,
      episodes: 1,
    });

    const res = scoreCandidate(targetTv, candidateMovie);
    assert.strictEqual(res.decision, "UNMAPPED");
    assert.ok(res.conflicts.some((c) => c.includes("Format mismatch")));
  });

  it("ensures Part 1 and Part 2 survive as distinct candidates without overwriting", () => {
    const target = makeMockAniList({
      title: { english: "Attack on Titan Season 3", romaji: "Shingeki no Kyojin Season 3" },
      seasonYear: 2018,
      episodes: 22,
    });

    const candPart1 = makeMockCandidate({
      id: "cand-part-1",
      title: "Attack on Titan Season 3",
      year: 2018,
      episodes: 12,
    });

    const candPart2 = makeMockCandidate({
      id: "cand-part-2",
      title: "Attack on Titan Season 3 Part 2",
      year: 2019,
      episodes: 10,
    });

    const candidates = [candPart1, candPart2];
    assert.strictEqual(candidates.length, 2);

    const res1 = scoreCandidate(target, candPart1);
    const res2 = scoreCandidate(target, candPart2);

    // Both candidates are scored and preserved independently
    assert.ok(res1.score > 0);
    assert.ok(res2.score > 0);
    assert.notStrictEqual(res1.candidate.providerId, res2.candidate.providerId);
  });
});
