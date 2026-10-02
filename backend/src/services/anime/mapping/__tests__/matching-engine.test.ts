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
import { groupIntoLogicalSeasons } from "../phase3-planner.js";

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

  it("1. Attack on Titan: separates Season 3 (Part 1 & 2) from Final Season", () => {
    const s3Target = makeMockAniList({
      id: 99147,
      title: { english: "Attack on Titan Season 3", romaji: "Shingeki no Kyojin Season 3" },
      episodes: 22,
      seasonYear: 2018,
    });

    const s3Part1Cand = makeMockCandidate({
      id: "aot-s3-p1",
      title: "Attack on Titan Season 3",
      year: 2018,
      episodes: 12,
    });
    const s3Part2Cand = makeMockCandidate({
      id: "aot-s3-p2",
      title: "Attack on Titan Season 3 Part 2",
      year: 2019,
      episodes: 10,
    });
    const finalCand = makeMockCandidate({
      id: "aot-final",
      title: "Attack on Titan The Final Season",
      year: 2020,
      episodes: 16,
    });

    assert.strictEqual(scoreCandidate(s3Target, s3Part1Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s3Target, s3Part2Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s3Target, finalCand).decision, "UNMAPPED");
  });

  it("2. SPY x FAMILY: matches Part 1 and Part 2, rejects Season 2", () => {
    const s1Target = makeMockAniList({
      id: 140960,
      title: { english: "SPY x FAMILY", romaji: "SPY×FAMILY" },
      episodes: 12,
      seasonYear: 2022,
    });

    const part1 = makeMockCandidate({
      id: "sxf-p1",
      title: "SPY×FAMILY",
      year: 2022,
      episodes: 12,
    });
    const part2 = makeMockCandidate({
      id: "sxf-p2",
      title: "SPY x FAMILY Part 2",
      year: 2022,
      episodes: 13,
    });
    const season2 = makeMockCandidate({
      id: "sxf-s2",
      title: "SPY×FAMILY Season 2",
      year: 2023,
      episodes: 12,
    });

    assert.strictEqual(scoreCandidate(s1Target, part1).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s1Target, part2).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s1Target, season2).decision, "UNMAPPED");
  });

  it("3. Demon Slayer: distinguishes Season 1 from named sequel arcs and movie", () => {
    const s1Target = makeMockAniList({
      id: 101922,
      title: {
        english: "Demon Slayer: Kimetsu no Yaiba",
        romaji: "Kimetsu no Yaiba",
        native: "鬼滅の刃",
      },
      episodes: 26,
      seasonYear: 2019,
    });

    const s1Cand = makeMockCandidate({
      id: "ds-s1",
      title: "Demon Slayer: Kimetsu no Yaiba",
      altEnglish: "Demon Slayer: Kimetsu no Yaiba",
      year: 2019,
      episodes: 26,
    });
    const entertainmentCand = makeMockCandidate({
      id: "ds-entertainment",
      title: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc",
      year: 2021,
      episodes: 11,
    });
    const swordsmithCand = makeMockCandidate({
      id: "ds-swordsmith",
      title: "Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc",
      year: 2023,
      episodes: 11,
    });
    const hashiraCand = makeMockCandidate({
      id: "ds-hashira",
      title: "Demon Slayer: Kimetsu no Yaiba Hashira Training Arc",
      year: 2024,
      episodes: 8,
    });
    const movieCand = makeMockCandidate({
      id: "ds-mugen-movie",
      title: "Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train",
      year: 2020,
      episodes: 1,
    });

    // S1 target must only match S1 candidate
    assert.strictEqual(scoreCandidate(s1Target, s1Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s1Target, entertainmentCand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(s1Target, swordsmithCand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(s1Target, hashiraCand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(s1Target, movieCand).decision, "UNMAPPED");

    // Named Arc Target: Entertainment District Arc
    const entertainmentTarget = makeMockAniList({
      id: 129874,
      title: {
        english: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc",
        romaji: "Kimetsu no Yaiba: Yuukaku-hen",
      },
      episodes: 11,
      seasonYear: 2021,
    });

    assert.strictEqual(scoreCandidate(entertainmentTarget, entertainmentCand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(entertainmentTarget, s1Cand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(entertainmentTarget, swordsmithCand).decision, "UNMAPPED");
  });

  it("4. Jujutsu Kaisen: distinguishes Season 1, Season 2, and Movie", () => {
    const s1Target = makeMockAniList({
      id: 113415,
      title: { english: "Jujutsu Kaisen", romaji: "Jujutsu Kaisen" },
      episodes: 24,
      seasonYear: 2020,
    });

    const s1Cand = makeMockCandidate({
      id: "jjk-s1",
      title: "Jujutsu Kaisen",
      year: 2020,
      episodes: 24,
    });
    const s2Cand = makeMockCandidate({
      id: "jjk-s2",
      title: "Jujutsu Kaisen 2nd Season",
      year: 2023,
      episodes: 23,
    });
    const movieCand = makeMockCandidate({
      id: "jjk-movie",
      title: "Jujutsu Kaisen 0 the Movie",
      year: 2021,
      episodes: 1,
    });

    assert.strictEqual(scoreCandidate(s1Target, s1Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s1Target, s2Cand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(s1Target, movieCand).decision, "UNMAPPED");

    const s2Target = makeMockAniList({
      id: 145064,
      title: { english: "Jujutsu Kaisen Season 2", romaji: "Jujutsu Kaisen 2nd Season" },
      episodes: 23,
      seasonYear: 2023,
    });

    assert.strictEqual(scoreCandidate(s2Target, s2Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(s2Target, s1Cand).decision, "UNMAPPED");
  });

  it("5. Fruits Basket: distinguishes 2001 and 2019 versions cleanly", () => {
    const fb2001Target = makeMockAniList({
      id: 120,
      title: { english: "Fruits Basket (2001)", romaji: "Fruits Basket" },
      episodes: 26,
      seasonYear: 2001,
    });
    const fb2019Cand = makeMockCandidate({
      id: "fb-2019",
      title: "Fruits Basket (2019)",
      year: 2019,
      episodes: 25,
    });
    const fb2001Cand = makeMockCandidate({
      id: "fb-2001",
      title: "Fruits Basket",
      year: 2001,
      episodes: 26,
    });

    assert.strictEqual(scoreCandidate(fb2001Target, fb2001Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(fb2001Target, fb2019Cand).decision, "UNMAPPED");
  });

  it("6. Bleach: distinguishes original series from Thousand-Year Blood War", () => {
    const originalTarget = makeMockAniList({
      id: 269,
      title: { english: "Bleach", romaji: "Bleach" },
      episodes: 366,
      seasonYear: 2004,
    });
    const tybwTarget = makeMockAniList({
      id: 114446,
      title: {
        english: "Bleach: Thousand-Year Blood War",
        romaji: "Bleach: Sennen Kessen-hen",
      },
      episodes: 13,
      seasonYear: 2022,
    });

    const originalCand = makeMockCandidate({
      id: "bleach-orig",
      title: "Bleach",
      year: 2004,
      episodes: 366,
    });
    const tybwCand = makeMockCandidate({
      id: "bleach-tybw",
      title: "Bleach: Thousand-Year Blood War",
      year: 2022,
      episodes: 13,
    });

    assert.strictEqual(scoreCandidate(originalTarget, originalCand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(originalTarget, tybwCand).decision, "UNMAPPED");

    assert.strictEqual(scoreCandidate(tybwTarget, tybwCand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(tybwTarget, originalCand).decision, "UNMAPPED");
  });

  it("7. Naruto: separates original from Shippuden and prevents movies from becoming TV seasons", () => {
    const narutoTarget = makeMockAniList({
      id: 20,
      title: { english: "Naruto", romaji: "Naruto" },
      episodes: 220,
      seasonYear: 2002,
    });

    const narutoCand = makeMockCandidate({
      id: "naruto-orig",
      title: "Naruto",
      year: 2002,
      episodes: 220,
    });
    const shippudenCand = makeMockCandidate({
      id: "naruto-shippuden",
      title: "Naruto: Shippuden",
      year: 2007,
      episodes: 500,
    });
    const movieCand = makeMockCandidate({
      id: "naruto-movie",
      title: "Naruto the Movie: Ninja Clash in the Land of Snow",
      year: 2004,
      episodes: 1,
    });

    assert.strictEqual(scoreCandidate(narutoTarget, narutoCand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(narutoTarget, shippudenCand).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(narutoTarget, movieCand).decision, "UNMAPPED");
  });

  it("8. Dragon Ball franchise: matches target seasons accurately and excludes movies/other series", () => {
    // Target: Dragon Ball (1986, 153 eps)
    const db1986Target = makeMockAniList({
      id: 223,
      title: { english: "Dragon Ball", romaji: "Dragon Ball" },
      episodes: 153,
      seasonYear: 1986,
    });

    // Target: Dragon Ball Z (1989, 291 eps)
    const dbzTarget = makeMockAniList({
      id: 813,
      title: { english: "Dragon Ball Z", romaji: "Dragon Ball Z" },
      episodes: 291,
      seasonYear: 1989,
    });

    // Target: Dragon Ball GT (1996, 64 eps)
    const dbgtTarget = makeMockAniList({
      id: 225,
      title: { english: "Dragon Ball GT", romaji: "Dragon Ball GT" },
      episodes: 64,
      seasonYear: 1996,
    });

    // Target: Dragon Ball Super (2015, 131 eps)
    const dbsTarget = makeMockAniList({
      id: 21175,
      title: { english: "Dragon Ball Super", romaji: "Dragon Ball Super" },
      episodes: 131,
      seasonYear: 2015,
    });

    const candDB = makeMockCandidate({
      id: "db-1232",
      title: "Dragon Ball",
      year: 1986,
      episodes: 153,
    });
    const candDBZ = makeMockCandidate({
      id: "dbz-1456",
      title: "Dragon Ball Z",
      year: 1989,
      episodes: 291,
    });
    const candDBGT = makeMockCandidate({
      id: "dbgt-3954",
      title: "Dragon Ball GT",
      year: 1996,
      episodes: 64,
    });
    const candDBS = makeMockCandidate({
      id: "dbs-132",
      title: "Dragon Ball Super",
      year: 2015,
      episodes: 131,
    });
    const candMovieBroly = makeMockCandidate({
      id: "db-movie-broly",
      title: "Dragon Ball Super: Broly",
      year: 2018,
      episodes: 1,
    });

    // Dragon Ball 1986 matching
    assert.strictEqual(scoreCandidate(db1986Target, candDB).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(db1986Target, candDBZ).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(db1986Target, candDBGT).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(db1986Target, candDBS).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(db1986Target, candMovieBroly).decision, "UNMAPPED");

    // Dragon Ball Z matching
    assert.strictEqual(scoreCandidate(dbzTarget, candDBZ).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(dbzTarget, candDB).decision, "UNMAPPED");
    assert.strictEqual(scoreCandidate(dbzTarget, candDBGT).decision, "UNMAPPED");

    // Dragon Ball GT matching
    assert.strictEqual(scoreCandidate(dbgtTarget, candDBGT).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(dbgtTarget, candDBZ).decision, "UNMAPPED");

    // Dragon Ball Super matching
    assert.strictEqual(scoreCandidate(dbsTarget, candDBS).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(dbsTarget, candMovieBroly).decision, "UNMAPPED");
  });

  it("9. Ranma ½ 1989 vs Ranma ½ 2024: release year strictly prevents cross-matching", () => {
    // Target 1: Ranma ½ (1989 classic)
    const ranma1989Target = makeMockAniList({
      id: 210,
      title: { english: "Ranma ½", romaji: "Ranma ½" },
      episodes: 18,
      seasonYear: 1989,
    });

    // Target 2: Ranma1/2 (2024 remake)
    const ranma2024Target = makeMockAniList({
      id: 178533,
      title: { english: "Ranma1/2 (2024)", romaji: "Ranma 1/2 (2024)" },
      episodes: 12,
      seasonYear: 2024,
    });

    // AniKoto Candidates
    const candRanma1989 = makeMockCandidate({
      id: "ranma-831",
      title: "Ranma ½",
      altEnglish: "Ranma ½",
      year: 1989,
      episodes: 161, // complete TV run on AniKoto
    });

    const candRanma2024 = makeMockCandidate({
      id: "ranma-6625",
      title: "Ranma 1/2",
      altEnglish: "Ranma ½ (2024)",
      year: 2024,
      episodes: 12,
    });

    const candRanma2024S2 = makeMockCandidate({
      id: "ranma-8190",
      title: "Ranma ½ (2024) 2nd Season",
      altEnglish: "Ranma ½ (2024) 2nd Season",
      year: 2025,
      episodes: 12,
    });

    // Ranma 1989 target must MATCH 1989 candidate and REJECT 2024 candidates
    const res1989_for_1989 = scoreCandidate(ranma1989Target, candRanma1989);
    assert.strictEqual(res1989_for_1989.decision, "MATCHED");
    assert.strictEqual(res1989_for_1989.conflicts.length, 0);

    const res1989_for_2024 = scoreCandidate(ranma1989Target, candRanma2024);
    assert.strictEqual(res1989_for_2024.decision, "UNMAPPED");
    assert.ok(
      res1989_for_2024.conflicts.some((c) => c.includes("Release year conflict")),
      "Ranma 1989 must reject Ranma 2024 due to 35-year release gap"
    );

    // Ranma 2024 target must MATCH 2024 candidate and REJECT 1989 candidate
    const res2024_for_2024 = scoreCandidate(ranma2024Target, candRanma2024);
    assert.strictEqual(res2024_for_2024.decision, "MATCHED");
    assert.strictEqual(res2024_for_2024.conflicts.length, 0);

    const res2024_for_1989 = scoreCandidate(ranma2024Target, candRanma1989);
    assert.strictEqual(res2024_for_1989.decision, "UNMAPPED");
    assert.ok(
      res2024_for_1989.conflicts.some((c) => c.includes("Release year conflict")),
      "Ranma 2024 must reject Ranma 1989 due to 35-year release gap"
    );

    // Ranma 2024 S2 candidate must be rejected for S1 target
    assert.strictEqual(scoreCandidate(ranma2024Target, candRanma2024S2).decision, "UNMAPPED");
  });

  it("10. Remakes: separates Shaman King (2001) from (2021) and FMA (2003) from Brotherhood", () => {
    const sk2001Target = makeMockAniList({
      id: 154,
      title: { english: "Shaman King", romaji: "Shaman King" },
      episodes: 64,
      seasonYear: 2001,
    });
    const sk2021Cand = makeMockCandidate({
      id: "sk-2021",
      title: "Shaman King (2021)",
      year: 2021,
      episodes: 52,
    });
    const sk2001Cand = makeMockCandidate({
      id: "sk-2001",
      title: "Shaman King",
      year: 2001,
      episodes: 64,
    });

    assert.strictEqual(scoreCandidate(sk2001Target, sk2001Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(sk2001Target, sk2021Cand).decision, "UNMAPPED");

    const fma2003Target = makeMockAniList({
      id: 121,
      title: { english: "Fullmetal Alchemist", romaji: "Fullmetal Alchemist" },
      episodes: 51,
      seasonYear: 2003,
    });
    const fmaBrotherhoodCand = makeMockCandidate({
      id: "fma-brotherhood",
      title: "Fullmetal Alchemist: Brotherhood",
      year: 2009,
      episodes: 64,
    });
    const fma2003Cand = makeMockCandidate({
      id: "fma-2003",
      title: "Fullmetal Alchemist",
      year: 2003,
      episodes: 51,
    });

    assert.strictEqual(scoreCandidate(fma2003Target, fma2003Cand).decision, "MATCHED");
    assert.strictEqual(scoreCandidate(fma2003Target, fmaBrotherhoodCand).decision, "UNMAPPED");
  });

  it("11. Year Proximity: evaluates exact year, close year, neutral missing year, and gap conflicts", () => {
    const target = makeMockAniList({
      title: { english: "Show A", romaji: "Show A" },
      seasonYear: 2020,
      episodes: 12,
    });

    // Exact match: 2020
    const exact = makeMockCandidate({ id: "1", title: "Show A", year: 2020, episodes: 12 });
    assert.strictEqual(scoreCandidate(target, exact).decision, "MATCHED");

    // 1 year difference (e.g. broadcast spanned or delayed) -> compatible
    const oneYear = makeMockCandidate({ id: "2", title: "Show A", year: 2021, episodes: 12 });
    assert.strictEqual(scoreCandidate(target, oneYear).decision, "MATCHED");

    // Missing candidate year -> neutral, does NOT automatically reject
    const missingYear = makeMockCandidate({ id: "3", title: "Show A", episodes: 12 });
    const missingRes = scoreCandidate(target, missingYear);
    assert.strictEqual(missingRes.decision, "MATCHED");
    assert.strictEqual(missingRes.signalBreakdown.yearProximity.score, 0.5);

    // Large discrepancy (>= 3 years) -> conflict penalty
    const conflictYear = makeMockCandidate({ id: "4", title: "Show A", year: 2010, episodes: 12 });
    const conflictRes = scoreCandidate(target, conflictYear);
    assert.strictEqual(conflictRes.decision, "UNMAPPED");
    assert.ok(conflictRes.conflicts.some((c) => c.includes("Release year conflict")));
  });

  it("12. Chronological Season Ordering for Franchises without Season numbers", () => {
    const db1 = makeMockAniList({
      id: 223,
      title: { english: "Dragon Ball", romaji: "Dragon Ball" },
      seasonYear: 1986,
    });
    db1.startDate = { year: 1986, month: 2, day: 26 };

    const db2 = makeMockAniList({
      id: 813,
      title: { english: "Dragon Ball Z", romaji: "Dragon Ball Z" },
      seasonYear: 1989,
    });
    db2.startDate = { year: 1989, month: 4, day: 26 };

    const db3 = makeMockAniList({
      id: 225,
      title: { english: "Dragon Ball GT", romaji: "Dragon Ball GT" },
      seasonYear: 1996,
    });
    db3.startDate = { year: 1996, month: 2, day: 7 };

    const db4 = makeMockAniList({
      id: 21175,
      title: { english: "Dragon Ball Super", romaji: "Dragon Ball Super" },
      seasonYear: 2015,
    });
    db4.startDate = { year: 2015, month: 7, day: 5 };

    const db5 = makeMockAniList({
      id: 170083,
      title: { english: "Dragon Ball DAIMA", romaji: "Dragon Ball DAIMA" },
      seasonYear: 2024,
    });
    db5.startDate = { year: 2024, month: 10, day: 11 };

    // Pass in random order to test deterministic chronological sorting
    const unordered = [db4, db2, db5, db1, db3];
    const groups = groupIntoLogicalSeasons(unordered);

    assert.strictEqual(groups.length, 5);
    assert.strictEqual(groups[0].logicalSeasonNumber, 1);
    assert.strictEqual(groups[0].primaryAnilistAnime.id, 223);
    assert.strictEqual(groups[0].displayTitle, "Dragon Ball");

    assert.strictEqual(groups[1].logicalSeasonNumber, 2);
    assert.strictEqual(groups[1].primaryAnilistAnime.id, 813);
    assert.strictEqual(groups[1].displayTitle, "Dragon Ball Z");

    assert.strictEqual(groups[2].logicalSeasonNumber, 3);
    assert.strictEqual(groups[2].primaryAnilistAnime.id, 225);
    assert.strictEqual(groups[2].displayTitle, "Dragon Ball GT");

    assert.strictEqual(groups[3].logicalSeasonNumber, 4);
    assert.strictEqual(groups[3].primaryAnilistAnime.id, 21175);
    assert.strictEqual(groups[3].displayTitle, "Dragon Ball Super");

    assert.strictEqual(groups[4].logicalSeasonNumber, 5);
    assert.strictEqual(groups[4].primaryAnilistAnime.id, 170083);
    assert.strictEqual(groups[4].displayTitle, "Dragon Ball DAIMA");
  });
});

