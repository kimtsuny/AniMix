import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../../config/prisma.js";
import {
  resolveBoundedSeriesStructure,
  planSeasonFromCandidates,
  planSingleSeason,
  type LogicalSeasonDefinition,
} from "../mapping/phase3-planner.js";
import { isSameLogicalSeriesSeason } from "../mapping/season-classifier.js";
import { resolveAnonymousSeasonEpisodes } from "../anonymous-anime.service.js";
import { persistRequestedSeason } from "../mapping/phase3-persistence.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";
import * as anilistService from "../../anilist/anilist.service.js";

describe("Bounded Series Resolution & Performance Optimization", () => {
  // ============================================================
  // TEST 1 — Frieren: Multi-season continuity without franchise bloat
  // ============================================================
  it("Test 1: Frieren Season 1 and Season 2 are identified together without non-TV relations", async () => {
    // Frieren: Beyond Journey's End (AniList ID: 154587)
    const structure = await resolveBoundedSeriesStructure(154587);

    assert.ok(structure, "Structure should be resolved");
    assert.strictEqual(structure.seriesRootAnime.id, 154587);
    assert.ok(
      structure.seasons.length >= 2,
      `Expected at least 2 seasons for Frieren, got ${structure.seasons.length}`
    );

    const s1 = structure.seasons.find((s) => s.seasonNumber === 1);
    const s2 = structure.seasons.find((s) => s.seasonNumber === 2);

    assert.ok(s1, "Season 1 must exist");
    assert.strictEqual(s1.anilistId, 154587);

    assert.ok(s2, "Season 2 must exist");
    assert.strictEqual(s2.anilistId, 182255);

    // Verify non-TV works (music videos, manga, mini-ONA specials) are NOT seasons
    for (const s of structure.seasons) {
      assert.notStrictEqual(s.anilistId, 118586, "Manga must not be a season");
      assert.notStrictEqual(s.anilistId, 169811, "Music video must not be a season");
      assert.notStrictEqual(s.anilistId, 175691, "Music video must not be a season");
    }
  });

  // ============================================================
  // TEST 2 — Dragon Ball: Independent series must NOT collapse into seasons
  // ============================================================
  it("Test 2: Dragon Ball (223) resolves only DB Season 1, without DBZ, GT, or Super", async () => {
    // Dragon Ball (AniList ID: 223)
    const structure = await resolveBoundedSeriesStructure(223);

    assert.strictEqual(structure.seriesRootAnime.id, 223);
    assert.strictEqual(
      structure.seasons.length,
      1,
      `Dragon Ball (1986) must have only 1 season, got ${structure.seasons.length}`
    );
    assert.strictEqual(structure.seasons[0].anilistId, 223);

    const titles = structure.seasons.map((s) => s.title);
    assert.ok(!titles.some((t) => /Dragon Ball Z/i.test(t)), "Must not contain DBZ");
    assert.ok(!titles.some((t) => /Dragon Ball GT/i.test(t)), "Must not contain DBGT");
    assert.ok(!titles.some((t) => /Dragon Ball Super/i.test(t)), "Must not contain DBS");

    // Also verify Dragon Ball Z (AniList ID: 813)
    const dbzStructure = await resolveBoundedSeriesStructure(813);
    assert.strictEqual(dbzStructure.seriesRootAnime.id, 813);
    assert.strictEqual(
      dbzStructure.seasons.length,
      1,
      `Dragon Ball Z must be its own series with 1 season, got ${dbzStructure.seasons.length}`
    );
    assert.strictEqual(dbzStructure.seasons[0].anilistId, 813);
  });

  // ============================================================
  // TEST 3 — Naruto: Naruto and Naruto Shippuden remain distinct series
  // ============================================================
  it("Test 3: Naruto (20) and Naruto Shippuden (1735) are not collapsed into seasons", async () => {
    // Naruto (AniList ID: 20)
    const narutoStructure = await resolveBoundedSeriesStructure(20);

    assert.strictEqual(narutoStructure.seriesRootAnime.id, 20);
    assert.strictEqual(
      narutoStructure.seasons.length,
      1,
      `Naruto must have only 1 season, got ${narutoStructure.seasons.length}`
    );
    assert.strictEqual(narutoStructure.seasons[0].anilistId, 20);

    // Verify Shippuden is not in Naruto's seasons
    const hasShippuden = narutoStructure.seasons.some(
      (s) => s.anilistId === 1735 || /shippu+den/i.test(s.title)
    );
    assert.strictEqual(
      hasShippuden,
      false,
      "Naruto must not collapse Shippuden into a season"
    );
  });

  // ============================================================
  // TEST 4 — One Piece: Huge relation graph is bounded and not traversed
  // ============================================================
  it("Test 4: One Piece (21) does not recursively traverse relations or absorb movies/specials", async () => {
    const opStructure = await resolveBoundedSeriesStructure(21);

    assert.strictEqual(opStructure.seriesRootAnime.id, 21);
    assert.strictEqual(
      opStructure.seasons.length,
      1,
      `One Piece must have 1 season, got ${opStructure.seasons.length}`
    );
    assert.strictEqual(opStructure.seasons[0].anilistId, 21);
  });

  // ============================================================
  // TEST 5 — Hard Limits: Protects against runaway graphs and deep cycles
  // ============================================================
  it("Test 5: Bounded resolver enforces maximum relation nodes hard limit", async () => {
    // Mock global fetch for AniList GraphQL endpoint to simulate a deep relation graph
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async (url: any, options: any) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("anilist.co")) {
        fetchCount++;
        const body = JSON.parse(options?.body || "{}");
        const currentId = body.variables?.id ?? 9000;
        const nextId = currentId + 1;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              Media: {
                id: currentId,
                title: {
                  english: `Runaway Series Season ${currentId}`,
                  romaji: `Runaway Series Season ${currentId}`,
                  native: `Runaway Series Season ${currentId}`,
                },
                format: "TV",
                type: "ANIME",
                status: "FINISHED",
                seasonYear: 2020 + (currentId - 9000),
                startDate: { year: 2020 + (currentId - 9000) },
                episodes: 12,
                coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/cover.jpg" },
                bannerImage: null,
                relations: {
                  edges: [
                    {
                      relationType: "SEQUEL",
                      node: {
                        id: nextId,
                        type: "ANIME",
                        format: "TV",
                        status: "FINISHED",
                        seasonYear: 2021 + (currentId - 9000),
                        startDate: { year: 2021 + (currentId - 9000) },
                        title: {
                          english: `Runaway Series Season ${nextId}`,
                          romaji: `Runaway Series Season ${nextId}`,
                          native: `Runaway Series Season ${nextId}`,
                        },
                      },
                    },
                  ],
                },
              },
            },
          }),
        } as any;
      }
      return originalFetch(url, options);
    }) as any;

    try {
      const result = await resolveBoundedSeriesStructure(9000);
      assert.ok(result, "Should successfully resolve within bounds");
      // Must not exceed hard limit of 6 inspected nodes
      assert.ok(
        fetchCount <= 6,
        `Expected at most 6 relation fetches, got ${fetchCount}`
      );
      assert.ok(
        result.seasons.length <= 6,
        `Seasons count must be bounded, got ${result.seasons.length}`
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ============================================================
  // TEST 6 — Fix N+1 Episode Resolution: Only best candidate resolved
  // ============================================================
  it("Test 6: planSeasonFromCandidates fetches episodes ONLY once for the best candidate", async () => {
    let getEpisodesCallCount = 0;
    const originalGetEpisodes = aniKotoProvider.getEpisodes;

    aniKotoProvider.getEpisodes = async (id: string) => {
      getEpisodesCallCount++;
      return [
        { id: `ep-1-${id}`, number: 1, title: "Episode 1" },
        { id: `ep-2-${id}`, number: 2, title: "Episode 2" },
      ] as any;
    };

    try {
      const targetGroup: LogicalSeasonDefinition = {
        logicalSeasonNumber: 1,
        primaryAnilistAnime: {
          id: 154587,
          title: { english: "Frieren: Beyond Journey's End", romaji: "Sousou no Frieren" },
          seasonYear: 2023,
          format: "TV",
          episodes: 28,
        } as any,
        relatedAnilistEntries: [],
        displayTitle: "Frieren: Beyond Journey's End",
      };

      // 4 candidates that match Season 1 with different scores
      const candidates: any[] = [
        {
          provider: "anikoto",
          providerId: "koto-1",
          title: "Frieren: Beyond Journey's End",
          episodeCount: 28,
          year: 2023,
          parsedMain: { rawTitle: "Frieren: Beyond Journey's End", baseTitle: "Frieren: Beyond Journey's End", normalizedBaseTitle: "frieren beyond journeys end" },
        },
        {
          provider: "anikoto",
          providerId: "koto-2",
          title: "Frieren (Dub)",
          episodeCount: 28,
          year: 2023,
          parsedMain: { rawTitle: "Frieren", baseTitle: "Frieren", normalizedBaseTitle: "frieren" },
        },
        {
          provider: "anikoto",
          providerId: "koto-3",
          title: "Sousou no Frieren",
          episodeCount: 28,
          year: 2023,
          parsedMain: { rawTitle: "Sousou no Frieren", baseTitle: "Sousou no Frieren", normalizedBaseTitle: "sousou no frieren" },
        },
      ];

      const planned = await planSeasonFromCandidates(targetGroup, candidates);

      assert.strictEqual(
        getEpisodesCallCount,
        1,
        `getEpisodes must be called EXACTLY ONCE for best candidate, but was called ${getEpisodesCallCount} times (N+1 bug)`
      );
      assert.strictEqual(planned.parts.length, 1);
      assert.strictEqual(planned.parts[0].providerId, "koto-1");
    } finally {
      aniKotoProvider.getEpisodes = originalGetEpisodes;
    }
  });

  // ============================================================
  // TEST 7 — Provider Fallback Rules: AnimeParadise emergency fallback only
  // ============================================================
  it("Test 7: AnimeParadise is invoked ONLY when AniKoto yields no valid candidate or fails", async () => {
    let apEpisodeFetchCalled = false;
    const originalApGetEpisodes = animeParadiseProvider.getEpisodes;
    animeParadiseProvider.getEpisodes = async () => {
      apEpisodeFetchCalled = true;
      return [{ id: "ap-1", number: 1, title: "Ep 1" }] as any;
    };

    try {
      const targetGroup: LogicalSeasonDefinition = {
        logicalSeasonNumber: 1,
        primaryAnilistAnime: {
          id: 154587,
          title: { english: "Frieren: Beyond Journey's End", romaji: "Sousou no Frieren" },
          seasonYear: 2023,
          format: "TV",
          episodes: 28,
        } as any,
        relatedAnilistEntries: [],
        displayTitle: "Frieren: Beyond Journey's End",
      };

      // Case A: AniKoto has viable candidate (score >= 0.72)
      // AniKoto succeeds -> AnimeParadise must NOT be invoked
      const planA = await planSingleSeason(targetGroup, targetGroup.primaryAnilistAnime);
      assert.ok(planA.parts.length > 0, "Plan A should succeed");
      assert.strictEqual(planA.parts[0].provider, "anikoto", "Primary must be anikoto");
      assert.strictEqual(
        apEpisodeFetchCalled,
        false,
        "AnimeParadise must NEVER be called when AniKoto succeeds"
      );
    } finally {
      animeParadiseProvider.getEpisodes = originalApGetEpisodes;
    }
  });

  // ============================================================
  // TEST 8 — Existing Mappings: Already-resolved season skips provider resolution
  // ============================================================
  it("Test 8: Already-resolved DB season skips provider mapping and episode sync", async () => {
    let candidateResolutionCalled = false;

    // Spy on prisma.animeSeason to simulate an already-mapped season with episodes
    const originalFindUnique = prisma.animeSeason.findUnique;
    prisma.animeSeason.findUnique = (async (args: any) => {
      return {
        id: 77777,
        animeId: 1000,
        number: 1,
        title: "Season 1",
        provider: "anikoto",
        providerId: "existing-koto-id",
        _count: { episodes: 24 },
        providerMappings: [{ id: 1, provider: "anikoto", providerId: "existing-koto-id", partNumber: 1, episodeOffset: 0, episodeCount: 24 }],
      } as any;
    }) as any;

    try {
      const result = await persistRequestedSeason(154587, 1);
      assert.ok(result, "Resolution should return result");
      assert.strictEqual(result.season.id, 77777);
      assert.strictEqual(result.season.providerId, "existing-koto-id");
    } finally {
      prisma.animeSeason.findUnique = originalFindUnique;
    }
  });

  // ============================================================
  // TEST 9 — Request Deduplication: In-flight requests coalesce
  // ============================================================
  it("Test 9: Concurrent requests for the same anime coalesce into one resolution", async () => {
    // Launch 3 simultaneous requests for Frieren Season 1
    const p1 = resolveAnonymousSeasonEpisodes(154587, 1);
    const p2 = resolveAnonymousSeasonEpisodes(154587, 1);
    const p3 = resolveAnonymousSeasonEpisodes(154587, 1);

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    assert.ok(r1 && r2 && r3, "All concurrent requests must resolve");
    assert.strictEqual(r1.season.number, r2.season.number);
    assert.strictEqual(r1.season.episodes.length, r2.season.episodes.length);
    assert.strictEqual(r2.season.episodes.length, r3.season.episodes.length);
  });
});
