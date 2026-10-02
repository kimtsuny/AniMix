import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../../config/prisma.js";
import { resolveAnonymousSeasonEpisodes } from "../anonymous-anime.service.js";
import { getSeasonEpisodes } from "../../../controllers/anime.controller.js";
import {
  getStream,
  getAnonymousStream,
} from "../../streaming/streaming.service.js";
import { discoverFranchiseStructure } from "../mapping/phase3-planner.js";
import { scoreCandidate } from "../mapping/candidate-scorer.js";
import { classifyTitle } from "../mapping/candidate-classifier.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";

describe("Catalog Modes Architecture: Anonymous vs Authenticated", () => {
  // ============================================================
  // TEST A: Anonymous request
  // → no JWT
  // → AniList/AniKoto discovery happens
  // → zero Anime/AnimeSeason/Episode catalog DB reads
  // → zero catalog DB writes
  // ============================================================
  it("TEST A: Anonymous mode performs live resolution without any Prisma catalog DB reads or writes", async () => {
    let dbReadCount = 0;
    let dbWriteCount = 0;

    // Spy on catalog Prisma tables
    const originalAnimeFind = prisma.anime.findUnique;
    const originalAnimeUpsert = prisma.anime.upsert;
    const originalSeasonFind = prisma.animeSeason.findUnique;
    const originalSeasonFindFirst = prisma.animeSeason.findFirst;
    const originalSeasonUpsert = prisma.animeSeason.upsert;
    const originalEpisodeFind = prisma.episode.findMany;
    const originalEpisodeUpsert = prisma.episode.upsert;

    prisma.anime.findUnique = (async (...args: any[]) => {
      dbReadCount++;
      return (originalAnimeFind as any).apply(prisma.anime, args);
    }) as any;

    prisma.animeSeason.findUnique = (async (...args: any[]) => {
      dbReadCount++;
      return (originalSeasonFind as any).apply(prisma.animeSeason, args);
    }) as any;

    prisma.animeSeason.findFirst = (async (...args: any[]) => {
      dbReadCount++;
      return (originalSeasonFindFirst as any).apply(prisma.animeSeason, args);
    }) as any;

    prisma.episode.findMany = (async (...args: any[]) => {
      dbReadCount++;
      return (originalEpisodeFind as any).apply(prisma.episode, args);
    }) as any;

    prisma.anime.upsert = (async (...args: any[]) => {
      dbWriteCount++;
      return (originalAnimeUpsert as any).apply(prisma.anime, args);
    }) as any;

    prisma.animeSeason.upsert = (async (...args: any[]) => {
      dbWriteCount++;
      return (originalSeasonUpsert as any).apply(prisma.animeSeason, args);
    }) as any;

    prisma.episode.upsert = (async (...args: any[]) => {
      dbWriteCount++;
      return (originalEpisodeUpsert as any).apply(prisma.episode, args);
    }) as any;

    try {
      // Test direct anonymous service
      // Frieren: Beyond Journey's End (AniList ID 154587, Season 1)
      const result = await resolveAnonymousSeasonEpisodes(154587, 1);

      assert.ok(result, "Anonymous resolution should return a result");
      assert.strictEqual(
        result.anime.id,
        null,
        "Anime ID must be null for anonymous visitor"
      );
      assert.strictEqual(
        result.season.id,
        null,
        "Season ID must be null for anonymous visitor"
      );
      assert.ok(
        result.season.episodes.length > 0,
        "Anonymous resolution should return episodes"
      );
      assert.strictEqual(
        result.season.episodes[0].id,
        null,
        "Episode ID must be null for anonymous visitor"
      );
      assert.ok(
        result.season.episodes[0].provider,
        "Episode must have provider"
      );
      assert.ok(
        result.season.episodes[0].providerId,
        "Episode must have providerId"
      );

      // Verify ZERO catalog DB reads and ZERO writes occurred
      assert.strictEqual(
        dbReadCount,
        0,
        `Expected 0 DB reads for anonymous resolution, got ${dbReadCount}`
      );
      assert.strictEqual(
        dbWriteCount,
        0,
        `Expected 0 DB writes for anonymous resolution, got ${dbWriteCount}`
      );
    } finally {
      prisma.anime.findUnique = originalAnimeFind;
      prisma.anime.upsert = originalAnimeUpsert;
      prisma.animeSeason.findUnique = originalSeasonFind;
      prisma.animeSeason.findFirst = originalSeasonFindFirst;
      prisma.animeSeason.upsert = originalSeasonUpsert;
      prisma.episode.findMany = originalEpisodeFind;
      prisma.episode.upsert = originalEpisodeUpsert;
    }
  });

  // ============================================================
  // TEST B: Authenticated request
  // → valid JWT (req.user is set)
  // → DB-first behavior works
  // ============================================================
  it("TEST B: Authenticated request queries DB-first via controller", async () => {
    let dbLookupAttempted = false;
    const originalAnimeFind = prisma.anime.findUnique;

    prisma.anime.findUnique = (async (...args: any[]) => {
      dbLookupAttempted = true;
      // Return a simulated DB Anime to confirm DB-first path was taken
      return {
        id: 9999,
        anilistId: 154587,
        title: "Frieren: Beyond Journey's End",
        description: "Test description",
        coverImage: "https://example.com/cover.jpg",
        bannerImage: null,
      };
    }) as any;

    const originalSeasonFind = prisma.animeSeason.findUnique;
    prisma.animeSeason.findUnique = (async () => ({
      id: 8888,
      animeId: 9999,
      number: 1,
      title: "Season 1",
      provider: "anikoto",
      providerId: "107257",
      anilistId: 154587,
    })) as any;

    const originalEpisodeFind = prisma.episode.findMany;
    prisma.episode.findMany = (async () => [
      {
        id: 7777,
        number: 1,
        title: "The Journey's End",
        thumbnail: "https://example.com/thumb.jpg",
      },
    ]) as any;

    const originalSeasonMany = prisma.animeSeason.findMany;
    prisma.animeSeason.findMany = (async () => [
      {
        id: 8888,
        number: 1,
        title: "Season 1",
        _count: { episodes: 1 },
      },
    ]) as any;

    try {
      const mockReq: any = {
        params: {
          animeId: "154587",
          seasonNumber: "1",
        },
        user: {
          id: 42,
          email: "authenticated_user@example.com",
        },
      };

      let responseStatus = 0;
      let responseBody: any = null;

      const mockRes: any = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (data: any) => {
              responseBody = data;
            },
          };
        },
        json: (data: any) => {
          responseStatus = 200;
          responseBody = data;
        },
      };

      await getSeasonEpisodes(mockReq, mockRes);

      assert.strictEqual(responseStatus, 200);
      assert.ok(dbLookupAttempted, "Authenticated request must query DB first");
      assert.strictEqual(
        responseBody.anime.id,
        9999,
        "Should return DB Anime ID"
      );
      assert.strictEqual(
        responseBody.season.id,
        8888,
        "Should return DB Season ID"
      );
      assert.strictEqual(
        responseBody.season.episodes[0].id,
        7777,
        "Should return DB Episode ID"
      );
    } finally {
      prisma.anime.findUnique = originalAnimeFind;
      prisma.animeSeason.findUnique = originalSeasonFind;
      prisma.episode.findMany = originalEpisodeFind;
      prisma.animeSeason.findMany = originalSeasonMany;
    }
  });

  // ============================================================
  // TEST C: Anonymous Dragon Ball
  // → fresh discovery
  // → all currently discoverable AniKoto franchise seasons returned
  // → not limited to stale DB seasons
  // ============================================================
  it("TEST C: Anonymous Dragon Ball discovers full franchise seasons live", async () => {
    // Dragon Ball root AniList ID: 223
    const franchise = await discoverFranchiseStructure(223);

    assert.ok(
      franchise.logicalGroups.length >= 6,
      `Expected at least 6 Dragon Ball seasons, got ${franchise.logicalGroups.length}`
    );

    const titles = franchise.logicalGroups.map((g) => g.displayTitle);
    assert.ok(
      titles.some((t) => /Dragon Ball Z/i.test(t)),
      "Must include Dragon Ball Z"
    );
    assert.ok(
      titles.some((t) => /Dragon Ball GT/i.test(t)),
      "Must include Dragon Ball GT"
    );
    assert.ok(
      titles.some((t) => /Dragon Ball Super/i.test(t)),
      "Must include Dragon Ball Super"
    );
  });

  // ============================================================
  // TEST D: Anonymous Ranma 1989 vs 2024
  // → year-aware matching remains correct
  // ============================================================
  it("TEST D: Anonymous Ranma 1989 vs 2024 year-aware matching separates remakes", () => {
    const ranma1989Anilist: any = {
      id: 210,
      title: {
        english: "Ranma ½",
        romaji: "Ranma ½",
        native: "らんま1/2",
      },
      seasonYear: 1989,
      format: "TV",
      episodes: 161,
      relations: { edges: [] },
    };

    const ranma2024Candidate: any = {
      title: "Ranma ½ (2024)",
      provider: "anikoto",
      providerId: "ranma-2024",
      year: 2024,
      parsedMain: classifyTitle("Ranma ½ (2024)"),
      source: "search",
    };

    const score = scoreCandidate(ranma1989Anilist, ranma2024Candidate);
    assert.strictEqual(
      score.decision,
      "UNMAPPED",
      "Ranma 2024 candidate must be UNMAPPED for Ranma 1989 due to year conflict"
    );
    assert.ok(
      score.conflicts.some((c) => c.includes("Release year conflict")),
      "Conflict list must include release year conflict"
    );
  });

  // ============================================================
  // TEST E: Anonymous Attack on Titan Season 1
  // → 25 episodes
  // → AniList streaming thumbnails used when available
  // → extraLarge cover is fallback
  // ============================================================
  it("TEST E: Anonymous Attack on Titan Season 1 resolves 25 episodes with AniList thumbnail hierarchy", async () => {
    // Attack on Titan AniList ID: 16498, Season 1
    const result = await resolveAnonymousSeasonEpisodes(16498, 1);

    assert.ok(result, "AoT S1 resolution must succeed");
    assert.strictEqual(
      result.season.episodes.length,
      25,
      `Expected 25 episodes for AoT S1, got ${result.season.episodes.length}`
    );

    // Verify thumbnails exist and use AniList streaming / cover fallback
    const hasThumbnails = result.season.episodes.every(
      (ep) => typeof ep.thumbnail === "string" && ep.thumbnail.length > 0
    );
    assert.ok(
      hasThumbnails,
      "Every episode must have a valid non-empty thumbnail URL"
    );

    // Verify no AnimeParadise thumbnail pattern is present
    const usesAnimeParadiseThumbnail = result.season.episodes.some((ep) =>
      ep.thumbnail?.includes("animeparadise")
    );
    assert.strictEqual(
      usesAnimeParadiseThumbnail,
      false,
      "Thumbnails must never come from AnimeParadise"
    );
  });

  // ============================================================
  // TEST F: Anonymous playback
  // → provider ID is passed directly
  // → no Prisma Episode lookup
  // → AniKoto stream resolves normally
  // ============================================================
  it("TEST F: Anonymous stream resolves directly with zero Prisma Episode lookups", async () => {
    let episodeTableQueried = false;
    const originalEpisodeFind = prisma.episode.findUnique;

    prisma.episode.findUnique = (async (...args: any[]) => {
      episodeTableQueried = true;
      return (originalEpisodeFind as any).apply(prisma.episode, args);
    }) as any;

    try {
      // Mock aniKotoProvider.getStream to avoid live external streaming network call in unit test
      const originalGetStream = aniKotoProvider.getStream;
      aniKotoProvider.getStream = async (providerId: string) => {
        return {
          type: "video",
          streams: [
            {
              sourceUrl: `https://mock.stream.proxy/master.m3u8?id=${providerId}`,
              isHLS: true,
              quality: "1080p",
              subtitles: [],
            },
          ],
        } as any;
      };

      try {
        const stream = await getAnonymousStream("anikoto", "107257");

        assert.strictEqual(
          episodeTableQueried,
          false,
          "Prisma Episode table must NEVER be queried in anonymous streaming"
        );
        assert.strictEqual(stream.type, "video");
        assert.ok(stream.streams.length > 0);
        assert.ok(stream.streams[0].url.includes("107257"));
        assert.strictEqual(stream.streams[0].isHLS, true);
      } finally {
        aniKotoProvider.getStream = originalGetStream;
      }
    } finally {
      prisma.episode.findUnique = originalEpisodeFind;
    }
  });

  // ============================================================
  // TEST G: Authenticated playback
  // → existing episode ID flow still works
  // ============================================================
  it("TEST G: Authenticated playback queries DB Episode and returns stream", async () => {
    let episodeTableQueried = false;
    const originalEpisodeFind = prisma.episode.findUnique;

    prisma.episode.findUnique = (async () => {
      episodeTableQueried = true;
      return {
        id: 12345,
        number: 1,
        season: {
          anilistId: 154587,
          anime: { anilistId: 154587 },
        },
        providerMappings: [
          {
            provider: "anikoto",
            providerId: "107257",
          },
        ],
      };
    }) as any;

    const originalGetStream = aniKotoProvider.getStream;
    aniKotoProvider.getStream = async () => {
      return {
        type: "video",
        streams: [
          {
            sourceUrl: "https://mock.stream.proxy/authenticated/master.m3u8",
            isHLS: true,
            quality: "1080p",
            subtitles: [],
          },
        ],
      } as any;
    };

    try {
      const stream = await getStream(12345);

      assert.strictEqual(
        episodeTableQueried,
        true,
        "Authenticated streaming MUST query Prisma Episode"
      );
      assert.strictEqual(stream.type, "video");
      assert.ok(stream.streams[0].url.includes("authenticated"));
    } finally {
      prisma.episode.findUnique = originalEpisodeFind;
      aniKotoProvider.getStream = originalGetStream;
    }
  });
});
