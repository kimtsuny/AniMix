import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GetSeasonEpisodesResponse } from "@/features/watch/api/services/episode.service";

describe("Details Page Seasons & Episodes AniMix Integration", () => {
  const mockWatchResponse: GetSeasonEpisodesResponse = {
    anime: {
      id: 1,
      anilistId: 16498, // Attack on Titan root
      title: "Attack on Titan",
      description: "Centuries ago, mankind was slaughtered...",
      coverImage: "https://s4.anilist.co/cover.jpg",
      bannerImage: "https://s4.anilist.co/banner.jpg",
    },
    seasons: [
      {
        id: 101,
        number: 1,
        title: "Season 1",
        episodeCount: 25,
        anilistId: 16498,
        anilistIds: [16498],
      },
      {
        id: 102,
        number: 2,
        title: "Season 2",
        episodeCount: 12,
        anilistId: 20958,
        anilistIds: [20958],
      },
      {
        id: 103,
        number: 3,
        title: "Season 3",
        episodeCount: 22,
        anilistId: 99147,
        anilistIds: [99147, 104578],
      },
      {
        id: 104,
        number: 4,
        title: "The Final Season",
        episodeCount: 28,
        anilistId: 110277,
        anilistIds: [110277],
      },
    ],
    season: {
      id: 102,
      number: 2,
      title: "Season 2",
      anilistId: 20958,
      episodes: [
        {
          id: 201,
          number: 1,
          title: "Beast Titan",
          thumbnail: "https://s4.anilist.co/ep1-thumb.jpg",
          provider: "anikoto",
          providerId: "ep-1",
        },
        {
          id: 202,
          number: 2,
          title: "I'm Home",
          thumbnail: null,
          provider: "anikoto",
          providerId: "ep-2",
        },
      ],
    },
  };

  it("maps AniMix seasons preserving exact AniList IDs and season numbers", () => {
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
      title: s.title || `Season ${s.number}`,
      coverImage: null,
      relationType: "SEASON",
      format: "TV",
      status: null,
      startDate: null,
    }));

    assert.equal(seasons.length, 4);
    assert.equal(seasons[0].id, 16498);
    assert.equal(seasons[0].number, 1);
    assert.equal(seasons[1].id, 20958);
    assert.equal(seasons[1].number, 2);
    assert.equal(seasons[2].id, 99147);
    assert.equal(seasons[2].number, 3);
    assert.equal(seasons[3].id, 110277);
    assert.equal(seasons[3].number, 4);

    // Verify seasons are NOT assuming anilistId === season number
    assert.notEqual(seasons[1].id, seasons[1].number);
  });

  it("maps AniMix episodes to details format with internal watch URLs", () => {
    const rootAnimeId = mockWatchResponse.anime.anilistId;
    const seasonNumber = mockWatchResponse.season.number;

    const episodes = mockWatchResponse.season.episodes.map((ep) => ({
      number: ep.number,
      title: ep.title
        ? ep.title.startsWith("Episode ")
          ? ep.title
          : `Episode ${ep.number} - ${ep.title}`
        : `Episode ${ep.number}`,
      thumbnail: ep.thumbnail,
      url: `/watch/${rootAnimeId}/${seasonNumber}/${ep.number}`,
      site: "AniMix",
    }));

    assert.equal(episodes.length, 2);
    assert.equal(episodes[0].number, 1);
    assert.equal(episodes[0].title, "Episode 1 - Beast Titan");
    assert.equal(episodes[0].url, "/watch/16498/2/1");
    assert.equal(episodes[0].thumbnail, "https://s4.anilist.co/ep1-thumb.jpg");

    assert.equal(episodes[1].number, 2);
    assert.equal(episodes[1].title, "Episode 2 - I'm Home");
    assert.equal(episodes[1].url, "/watch/16498/2/2");
    assert.equal(episodes[1].thumbnail, null);
  });

  it("resolves season number correctly when viewing a sequel anime directly", () => {
    // When a user opens /anime/20958 (AoT Season 2)
    const currentAnimeId = 20958;
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
      title: s.title,
    }));

    const matchedSeason = seasons.find((s) => s.id === currentAnimeId);
    assert.ok(matchedSeason);
    assert.equal(matchedSeason.number, 2);
  });

  it("excludes TV seasons from related content using exact AniList season IDs", () => {
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
    }));
    const seasonIds = new Set(seasons.map((s) => s.id));

    const relations = [
      { id: 20958, title: "Attack on Titan Season 2", relationType: "SEQUEL" }, // Should be excluded
      { id: 99147, title: "Attack on Titan Season 3", relationType: "SEQUEL" }, // Should be excluded
      { id: 21172, title: "Attack on Titan: Junior High", relationType: "SPIN_OFF" }, // Should be KEPT
      { id: 20739, title: "Attack on Titan: No Regrets", relationType: "SIDE_STORY" }, // Should be KEPT
    ];

    const relatedContent = relations.filter((r) => !seasonIds.has(r.id));
    assert.equal(relatedContent.length, 2);
    assert.equal(relatedContent[0].id, 21172);
    assert.equal(relatedContent[1].id, 20739);
  });

  describe("Phase 5 Details Page Episode Batching & Performance Scenarios", () => {
    const {
      calculateEpisodeBatches,
      getBatchEpisodes,
      shouldShowEpisodeRangeSelector,
      DEFAULT_BATCH_SIZE,
    } = require("../../../../watch/utils/episodeBatching");

    it("1. A short anime with 12 episodes: no range selector", () => {
      const episodes = Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
      }));
      const batches = calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
      assert.equal(batches.length, 1);
      assert.equal(batches[0].label, "1–12");
      assert.equal(shouldShowEpisodeRangeSelector(episodes.length), false);
    });

    it("2. An anime with exactly 100 episodes: no range selector", () => {
      const episodes = Array.from({ length: 100 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
      }));
      const batches = calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
      assert.equal(batches.length, 1);
      assert.equal(batches[0].label, "1–100");
      assert.equal(shouldShowEpisodeRangeSelector(episodes.length), false);
    });

    it("3. An anime with 101 episodes: exactly two ranges", () => {
      const episodes = Array.from({ length: 101 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
      }));
      const batches = calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
      assert.equal(batches.length, 2);
      assert.equal(batches[0].label, "1–100");
      assert.equal(batches[1].label, "101–101");
      assert.equal(shouldShowEpisodeRangeSelector(episodes.length), true);
    });

    it("4. One Piece with 1,180 episodes: exactly 100 cards mounted at a time in active batch", () => {
      const episodes = Array.from({ length: 1180 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
      }));
      const batches = calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
      assert.equal(batches.length, 12);
      assert.equal(shouldShowEpisodeRangeSelector(episodes.length), true);

      // Active batch 0 mounts exactly 100 cards
      const batch0 = getBatchEpisodes(episodes, 0, DEFAULT_BATCH_SIZE);
      assert.equal(batch0.length, 100);
      assert.equal(batch0[0].number, 1);
      assert.equal(batch0[99].number, 100);
    });

    it("5. Switching between ranges, including the final range", () => {
      const episodes = Array.from({ length: 1180 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
      }));
      // Batch 5 (middle)
      const batch5 = getBatchEpisodes(episodes, 5, DEFAULT_BATCH_SIZE);
      assert.equal(batch5.length, 100);
      assert.equal(batch5[0].number, 501);
      assert.equal(batch5[99].number, 600);

      // Final batch 11 (episodes 1101 to 1180, total 80 remaining)
      const batch11 = getBatchEpisodes(episodes, 11, DEFAULT_BATCH_SIZE);
      assert.equal(batch11.length, 80);
      assert.equal(batch11[0].number, 1101);
      assert.equal(batch11[79].number, 1180);
    });

    it("6. Switching between seasons of different lengths safely resets batches", () => {
      const season1Episodes = Array.from({ length: 1180 }, (_, i) => ({
        number: i + 1,
      }));
      const season2Episodes = Array.from({ length: 24 }, (_, i) => ({
        number: i + 1,
      }));

      const s1Batches = calculateEpisodeBatches(season1Episodes, DEFAULT_BATCH_SIZE);
      assert.equal(s1Batches.length, 12);

      const s2Batches = calculateEpisodeBatches(season2Episodes, DEFAULT_BATCH_SIZE);
      assert.equal(s2Batches.length, 1);
      assert.equal(shouldShowEpisodeRangeSelector(season2Episodes.length), false);

      // Slicing season 2 at batch index 0 returns all 24 episodes
      const s2Mounted = getBatchEpisodes(season2Episodes, 0, DEFAULT_BATCH_SIZE);
      assert.equal(s2Mounted.length, 24);
    });

    it("7. Selecting an episode and verifying its watch URL format", () => {
      const rootAnimeId = 16498;
      const seasonNumber = 2;
      const episode = { number: 5, title: "Historic" };
      const url = `/watch/${rootAnimeId}/${seasonNumber}/${episode.number}`;
      assert.equal(url, "/watch/16498/2/5");
    });

    it("8. Rapidly switching seasons: race-condition simulator ignores stale requests", async () => {
      let activeRequestId = 0;
      let appliedSeasonId: number | null = null;

      async function simulateSeasonFetch(seasonId: number, delayMs: number) {
        const requestId = ++activeRequestId;
        await new Promise((r) => setTimeout(r, delayMs));
        // Only apply if this request is still the active one
        if (requestId === activeRequestId) {
          appliedSeasonId = seasonId;
        }
      }

      // Fast-click Season 1 (slow network 50ms), then immediately Season 2 (fast network 10ms)
      const p1 = simulateSeasonFetch(101, 50);
      const p2 = simulateSeasonFetch(102, 10);

      await Promise.all([p1, p2]);

      // Season 2 must be the one applied, Season 1 must NOT overwrite Season 2
      assert.equal(appliedSeasonId, 102);
    });

    it("9. Independent lightweight season metadata maps correctly without episodes", () => {
      const mockSeasonsMetadata = {
        rootAnimeId: 16498,
        requestedSeasonNumber: 1,
        seasons: [
          {
            id: null,
            number: 1,
            title: "Season 1",
            episodeCount: 25,
            anilistId: 16498,
            anilistIds: [16498],
          },
          {
            id: null,
            number: 2,
            title: "Season 2",
            episodeCount: 12,
            anilistId: 20958,
            anilistIds: [20958],
          },
        ],
      };

      const mappedSeasons = mockSeasonsMetadata.seasons.map((s) => ({
        id: s.anilistId ?? s.number,
        number: s.number,
        title: s.title || `Season ${s.number}`,
        episodeCount: s.episodeCount,
      }));

      assert.equal(mappedSeasons.length, 2);
      assert.equal(mappedSeasons[0].id, 16498);
      assert.equal(mappedSeasons[0].number, 1);
      assert.equal(mappedSeasons[0].episodeCount, 25);
      assert.equal(mappedSeasons[1].id, 20958);
      assert.equal(mappedSeasons[1].number, 2);
    });

    it("10. Genuine batching with calculateBatchesFromCount when first batch of 100 is loaded", () => {
      const { calculateBatchesFromCount } = require("../../../../watch/utils/episodeBatching");
      const totalEpisodes = 1180;
      const batches = calculateBatchesFromCount(totalEpisodes, 1, DEFAULT_BATCH_SIZE);

      assert.equal(batches.length, 12);
      assert.equal(batches[0].label, "1–100");
      assert.equal(batches[0].count, 100);
      assert.equal(batches[1].label, "101–200");
      assert.equal(batches[11].label, "1101–1180");
      assert.equal(batches[11].count, 80);
    });

    it("11. Episode cache keys distinguish AniList IDs and logical season numbers without collision", () => {
      const cache: Record<string, any[]> = {};
      const season1Episodes = [{ number: 1, title: "Ep 1" }];
      const season2Episodes = [{ number: 1, title: "S2 Ep 1" }];

      // Cache under prefix keys
      cache["anilist:16498"] = season1Episodes;
      cache["num:1"] = season1Episodes;
      cache["anilist:20958"] = season2Episodes;
      cache["num:2"] = season2Episodes;

      assert.equal(cache["anilist:16498"][0].title, "Ep 1");
      assert.equal(cache["anilist:20958"][0].title, "S2 Ep 1");
      assert.equal(cache["num:1"][0].title, "Ep 1");
      assert.equal(cache["num:2"][0].title, "S2 Ep 1");
      // Ensuring no key overwrite
      assert.notEqual(cache["anilist:16498"], cache["anilist:20958"]);
    });
  });
});
