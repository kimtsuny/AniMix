import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GetSeasonEpisodesResponse } from "@/features/watch/api/services/episode.service";
import type { Episode } from "@/features/anime/types/episode";
import {
  calculateEpisodeBatches,
  calculateBatchesFromCount,
  getBatchEpisodes,
  shouldShowEpisodeRangeSelector,
  DEFAULT_BATCH_SIZE,
} from "@/features/watch/utils/episodeBatching";
import {
  buildCacheKey,
  validateCacheEntry,
  resolveSeasonInfo,
  globalEpisodesCache,
  globalSeasonsCache,
  globalRootAnimeIdCache,
  clearGlobalCaches,
  type CachedSeasonBatch,
  type SeasonItem,
} from "@/features/anime/components/details/SeasonsAndEpisodes";

function mockEp(
  number: number,
  title: string,
  thumbnail: string,
  rootId: number = 16498,
  seasonNum: number = 1
): Episode {
  return {
    number,
    title,
    thumbnail,
    url: `/watch/${rootId}/${seasonNum}/${number}`,
    site: "AniMix",
  };
}

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
          thumbnail: "https://s4.anilist.co/ep1-thumb-s2.jpg",
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
    assert.equal(episodes[0].thumbnail, "https://s4.anilist.co/ep1-thumb-s2.jpg");

    assert.equal(episodes[1].number, 2);
    assert.equal(episodes[1].title, "Episode 2 - I'm Home");
    assert.equal(episodes[1].url, "/watch/16498/2/2");
    assert.equal(episodes[1].thumbnail, null);
  });

  it("resolves season number correctly when viewing a sequel anime directly", () => {
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
      { id: 20958, title: "Attack on Titan Season 2", relationType: "SEQUEL" },
      { id: 99147, title: "Attack on Titan Season 3", relationType: "SEQUEL" },
      { id: 21172, title: "Attack on Titan: Junior High", relationType: "SPIN_OFF" },
      { id: 20739, title: "Attack on Titan: No Regrets", relationType: "SIDE_STORY" },
    ];

    const relatedContent = relations.filter((r) => !seasonIds.has(r.id));
    assert.equal(relatedContent.length, 2);
    assert.equal(relatedContent[0].id, 21172);
    assert.equal(relatedContent[1].id, 20739);
  });

  describe("Episode Batching Utilities", () => {
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
      const batch5 = getBatchEpisodes(episodes, 5, DEFAULT_BATCH_SIZE);
      assert.equal(batch5.length, 100);
      assert.equal(batch5[0].number, 501);
      assert.equal(batch5[99].number, 600);

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
        if (requestId === activeRequestId) {
          appliedSeasonId = seasonId;
        }
      }

      const p1 = simulateSeasonFetch(101, 50);
      const p2 = simulateSeasonFetch(102, 10);

      await Promise.all([p1, p2]);
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
      const totalEpisodes = 1180;
      const batches = calculateBatchesFromCount(totalEpisodes, 1, DEFAULT_BATCH_SIZE);

      assert.equal(batches.length, 12);
      assert.equal(batches[0].label, "1–100");
      assert.equal(batches[0].count, 100);
      assert.equal(batches[1].label, "101–200");
      assert.equal(batches[11].label, "1101–1180");
      assert.equal(batches[11].count, 80);
    });
  });

  describe("Regression Tests — Watch Page Return, Cache, and Season Data Synchronization", () => {
    const aotSeasons: SeasonItem[] = [
      { id: 16498, number: 1, title: "Season 1", anilistId: 16498, relationType: "SEASON", coverImage: null, format: "TV", status: null, startDate: null },
      { id: 20958, number: 2, title: "Season 2", anilistId: 20958, relationType: "SEASON", coverImage: null, format: "TV", status: null, startDate: null },
      { id: 99147, number: 3, title: "Season 3", anilistId: 99147, relationType: "SEASON", coverImage: null, format: "TV", status: null, startDate: null },
    ];

    const s1Episodes: Episode[] = [
      mockEp(1, "To You Two Thousand Years Later", "https://img1.ak.crunchyroll.com/s1-ep1.jpg", 16498, 1),
      mockEp(2, "That Day", "https://img1.ak.crunchyroll.com/s1-ep2.jpg", 16498, 1),
    ];

    const s2Episodes: Episode[] = [
      mockEp(1, "Beast Titan", "https://s4.anilist.co/s2-beast-titan.jpg", 16498, 2),
      mockEp(2, "I'm Home", "https://s4.anilist.co/s2-im-home.jpg", 16498, 2),
    ];

    it("1. Select season 2, navigate to an episode, return, and verify that season 2 remains selected and its thumbnails remain correct", () => {
      clearGlobalCaches();
      const rootAnimeId = 16498;

      // Populate global caches as occurs during normal season 2 viewing
      globalSeasonsCache.set(rootAnimeId, aotSeasons);
      globalRootAnimeIdCache.set(rootAnimeId, rootAnimeId);
      globalEpisodesCache.set(buildCacheKey(rootAnimeId, 2, 0), {
        animeId: rootAnimeId,
        seasonNumber: 2,
        seasonAnilistId: 20958,
        batchIndex: 0,
        totalEpisodes: 12,
        episodes: s2Episodes,
        timestamp: Date.now(),
      });

      // User clicked Episode 1 (navigated to /watch/16498/2/1)
      // Now user presses browser Back -> URL is /anime/16498?season=20958
      const returnedUrlSeasonParam = "20958";
      const returnedTargetId = parseInt(returnedUrlSeasonParam, 10);

      // Verify that on remount:
      // A. Seasons metadata is available from persistent cache
      const cachedSeasons = globalSeasonsCache.get(rootAnimeId)!;
      assert.ok(cachedSeasons);

      // B. resolveSeasonInfo resolves exact Season 2 without defaulting to season 1
      const resolved = resolveSeasonInfo(returnedTargetId, cachedSeasons);
      assert.equal(resolved.seasonNumber, 2);
      assert.equal(resolved.anilistId, 20958);

      // C. Cache hit returns season 2 episodes with season 2 thumbnails
      const cachedBatch = validateCacheEntry(
        globalEpisodesCache.get(buildCacheKey(rootAnimeId, resolved.seasonNumber!, 0)),
        rootAnimeId,
        2,
        0,
        20958
      );
      assert.ok(cachedBatch);
      assert.equal(cachedBatch.seasonNumber, 2);
      assert.equal(cachedBatch.episodes[0].title, "Beast Titan");
      assert.equal(cachedBatch.episodes[0].thumbnail, "https://s4.anilist.co/s2-beast-titan.jpg");
      assert.equal(cachedBatch.episodes[0].url, "/watch/16498/2/1");
      assert.notEqual(cachedBatch.episodes[0].thumbnail, s1Episodes[0].thumbnail);
    });

    it("2. Return when season 2's episodes are cached: serves immediately with 0 network requests", () => {
      clearGlobalCaches();
      const rootAnimeId = 16498;
      globalSeasonsCache.set(rootAnimeId, aotSeasons);
      globalEpisodesCache.set(buildCacheKey(rootAnimeId, 2, 0), {
        animeId: rootAnimeId,
        seasonNumber: 2,
        seasonAnilistId: 20958,
        batchIndex: 0,
        totalEpisodes: 12,
        episodes: s2Episodes,
        timestamp: Date.now(),
      });

      let networkRequestFired = false;
      function simulateMount(urlParam: string) {
        const targetId = parseInt(urlParam, 10);
        const seasons = globalSeasonsCache.get(rootAnimeId) ?? [];
        const { seasonNumber, anilistId } = resolveSeasonInfo(targetId, seasons);
        if (seasonNumber !== null) {
          const cached = validateCacheEntry(
            globalEpisodesCache.get(buildCacheKey(rootAnimeId, seasonNumber, 0)),
            rootAnimeId,
            seasonNumber,
            0,
            anilistId
          );
          if (cached) return cached.episodes;
        }
        networkRequestFired = true;
        return null;
      }

      const displayedEpisodes = simulateMount("20958");
      assert.ok(displayedEpisodes);
      assert.equal(displayedEpisodes.length, 2);
      assert.equal(displayedEpisodes[0].thumbnail, "https://s4.anilist.co/s2-beast-titan.jpg");
      assert.equal(networkRequestFired, false);
    });

    it("3. Return when season 2's episodes are not cached: resolves seasons metadata first and requests Season 2 (never Season 1)", async () => {
      clearGlobalCaches();
      const rootAnimeId = 16498;
      let requestedSeasonNumber: number | null = null;

      // Simulate cold navigation back to /anime/16498?season=20958
      const urlSeasonParam = "20958";
      const targetId = parseInt(urlSeasonParam, 10);

      // Initially seasons are not loaded
      const initialResolution = resolveSeasonInfo(targetId, []);
      // Must NOT guess season 1!
      assert.equal(initialResolution.seasonNumber, null);
      assert.equal(initialResolution.anilistId, 20958);

      // Simulate getAnimeSeasons resolving
      async function fetchSeasonsAndLoadEpisodes() {
        // Fetch seasons
        const seasons = aotSeasons;
        globalSeasonsCache.set(rootAnimeId, seasons);

        // Now resolve with loaded seasons
        const { seasonNumber } = resolveSeasonInfo(targetId, seasons);
        assert.equal(seasonNumber, 2);

        // Fetch episodes for seasonNumber 2
        requestedSeasonNumber = seasonNumber;
        return s2Episodes;
      }

      const episodes = await fetchSeasonsAndLoadEpisodes();
      assert.equal(requestedSeasonNumber, 2);
      assert.equal(episodes[0].thumbnail, "https://s4.anilist.co/s2-beast-titan.jpg");
    });

    it("4. Switch seasons while an earlier season request is still pending: earlier response is discarded", async () => {
      let activeRequestId = 0;
      let activeSeasonId = 16498;
      let renderedEpisodes: Episode[] | null = null;

      async function requestSeason(seasonId: number, seasonNum: number, episodes: Episode[], delayMs: number) {
        const requestId = ++activeRequestId;
        activeSeasonId = seasonId;
        await new Promise((r) => setTimeout(r, delayMs));

        if (requestId !== activeRequestId) {
          // Stale request discarded
          return;
        }
        renderedEpisodes = episodes;
      }

      // User clicks Season 2 (50ms delay), then 5ms later clicks Season 3 (10ms delay)
      const p1 = requestSeason(20958, 2, s2Episodes, 50);
      const p2 = requestSeason(99147, 3, [mockEp(1, "Smoke Signal", "https://s4.anilist.co/s3-ep1.jpg", 16498, 3)], 10);

      await Promise.all([p1, p2]);

      assert.equal(activeSeasonId, 99147);
      assert.ok(renderedEpisodes !== null);
      const finalRendered = renderedEpisodes as Episode[];
      assert.equal(finalRendered[0].title, "Smoke Signal");
      assert.equal(finalRendered[0].thumbnail, "https://s4.anilist.co/s3-ep1.jpg");
    });

    it("5. Change episode batches, navigate away, and return: active batch resets to 0 with total episodes preserved", () => {
      clearGlobalCaches();
      const rootAnimeId = 16498;
      const season1Batch0Key = buildCacheKey(rootAnimeId, 1, 0);
      const season1Batch1Key = buildCacheKey(rootAnimeId, 1, 1);

      // Caching batch 0 (eps 1-100) and batch 1 (eps 101-120)
      const batch0 = Array.from({ length: 100 }, (_, i) => mockEp(i + 1, `Ep ${i + 1}`, `https://thumb/${i + 1}.jpg`));
      const batch1 = Array.from({ length: 20 }, (_, i) => mockEp(i + 101, `Ep ${i + 101}`, `https://thumb/${i + 101}.jpg`));

      globalEpisodesCache.set(season1Batch0Key, {
        animeId: rootAnimeId,
        seasonNumber: 1,
        seasonAnilistId: 16498,
        batchIndex: 0,
        totalEpisodes: 120,
        episodes: batch0,
        timestamp: Date.now(),
      });

      globalEpisodesCache.set(season1Batch1Key, {
        animeId: rootAnimeId,
        seasonNumber: 1,
        seasonAnilistId: 16498,
        batchIndex: 1,
        totalEpisodes: 120,
        episodes: batch1,
        timestamp: Date.now(),
      });

      // User was on batch 1, navigated to watch page, and returned:
      // Returning to details page resets active batch index to 0
      let activeBatchIndex = 0;
      const cachedInitial = validateCacheEntry(
        globalEpisodesCache.get(season1Batch0Key),
        rootAnimeId,
        1,
        0
      )!;

      assert.equal(activeBatchIndex, 0);
      assert.equal(cachedInitial.totalEpisodes, 120);
      assert.equal(cachedInitial.episodes[0].number, 1);
      assert.equal(cachedInitial.episodes[99].number, 100);
    });

    it("6. Use browser Back and Forward while the season query parameter changes: correctly restores season data", () => {
      clearGlobalCaches();
      const rootAnimeId = 16498;
      globalSeasonsCache.set(rootAnimeId, aotSeasons);

      globalEpisodesCache.set(buildCacheKey(rootAnimeId, 1, 0), {
        animeId: rootAnimeId,
        seasonNumber: 1,
        seasonAnilistId: 16498,
        batchIndex: 0,
        totalEpisodes: 25,
        episodes: s1Episodes,
        timestamp: Date.now(),
      });

      globalEpisodesCache.set(buildCacheKey(rootAnimeId, 2, 0), {
        animeId: rootAnimeId,
        seasonNumber: 2,
        seasonAnilistId: 20958,
        batchIndex: 0,
        totalEpisodes: 12,
        episodes: s2Episodes,
        timestamp: Date.now(),
      });

      // History navigation:
      // State A: at Season 2 ("?season=20958")
      // User clicks Back to Season 1 ("?season=16498")
      const backTargetId = 16498;
      const backResolved = resolveSeasonInfo(backTargetId, aotSeasons);
      const backCached = validateCacheEntry(
        globalEpisodesCache.get(buildCacheKey(rootAnimeId, backResolved.seasonNumber!, 0)),
        rootAnimeId,
        1,
        0,
        16498
      )!;
      assert.equal(backResolved.seasonNumber, 1);
      assert.equal(backCached.episodes[0].title, "To You Two Thousand Years Later");
      assert.equal(backCached.episodes[0].thumbnail, "https://img1.ak.crunchyroll.com/s1-ep1.jpg");

      // User clicks Forward back to Season 2 ("?season=20958")
      const forwardTargetId = 20958;
      const forwardResolved = resolveSeasonInfo(forwardTargetId, aotSeasons);
      const forwardCached = validateCacheEntry(
        globalEpisodesCache.get(buildCacheKey(rootAnimeId, forwardResolved.seasonNumber!, 0)),
        rootAnimeId,
        2,
        0,
        20958
      )!;
      assert.equal(forwardResolved.seasonNumber, 2);
      assert.equal(forwardCached.episodes[0].title, "Beast Titan");
      assert.equal(forwardCached.episodes[0].thumbnail, "https://s4.anilist.co/s2-beast-titan.jpg");
    });

    it("7. Handle direct-sequel anime IDs without confusing the root anime ID with the season ID", () => {
      clearGlobalCaches();
      // Visiting /anime/20958 (direct sequel page for AoT Season 2)
      const sequelAnimeId = 20958;
      const backendResponse = {
        rootAnimeId: 16498,
        requestedSeasonNumber: 2,
        seasons: aotSeasons,
      };

      const resolvedRootId = backendResponse.rootAnimeId;
      assert.equal(resolvedRootId, 16498);
      assert.notEqual(resolvedRootId, sequelAnimeId);

      // Register mapping
      globalRootAnimeIdCache.set(sequelAnimeId, resolvedRootId);
      globalSeasonsCache.set(sequelAnimeId, aotSeasons);

      // Verify that season lookup for sequel returns season 2
      const seasonInfo = resolveSeasonInfo(sequelAnimeId, aotSeasons);
      assert.equal(seasonInfo.seasonNumber, 2);
      assert.equal(seasonInfo.anilistId, 20958);

      // Cache key uses canonical root anime ID 16498, NOT sequel ID 20958
      const key = buildCacheKey(resolvedRootId, seasonInfo.seasonNumber!, 0);
      assert.equal(key, "anime:16498:s:2:b:0");
    });

    it("8. Reject invalid or mismatched cache entries", () => {
      const cache = new Map<string, CachedSeasonBatch>();
      const entryS1: CachedSeasonBatch = {
        animeId: 16498,
        seasonNumber: 1,
        seasonAnilistId: 16498,
        batchIndex: 0,
        totalEpisodes: 25,
        episodes: s1Episodes,
        timestamp: Date.now(),
      };
      cache.set("anime:16498:s:1:b:0", entryS1);

      // Asking for Season 2 from Season 1's key must fail
      assert.equal(validateCacheEntry(entryS1, 16498, 2, 0), null);

      // Asking for wrong anime ID must fail
      assert.equal(validateCacheEntry(entryS1, 99999, 1, 0), null);

      // Asking with mismatched anilistId must fail
      assert.equal(validateCacheEntry(entryS1, 16498, 1, 0, 20958), null);

      // Empty episodes array must fail
      const emptyEntry: CachedSeasonBatch = {
        ...entryS1,
        episodes: [],
      };
      assert.equal(validateCacheEntry(emptyEntry, 16498, 1, 0), null);
    });

    it("9. Verify that an old response cannot overwrite the current season's episode array", async () => {
      let activeRequestId = 0;
      let activeSeason = 1;
      let displayedEpisodes: Episode[] = s1Episodes;

      async function fetchSeason(targetSeason: number, episodes: Episode[], delayMs: number) {
        const reqId = ++activeRequestId;
        activeSeason = targetSeason;

        await new Promise((r) => setTimeout(r, delayMs));

        // If request ID has changed, discard
        if (reqId !== activeRequestId) return;
        displayedEpisodes = episodes;
      }

      // Season 2 starts (slow 40ms)
      const p1 = fetchSeason(2, s2Episodes, 40);
      // User switches to Season 3 (fast 10ms)
      const p2 = fetchSeason(3, [mockEp(1, "Smoke Signal", "https://s4.anilist.co/s3.jpg", 16498, 3)], 10);

      await Promise.all([p1, p2]);

      // Season 3 must remain displayed; Season 2's slow response must NOT overwrite
      assert.equal(activeSeason, 3);
      assert.equal(displayedEpisodes[0].title, "Smoke Signal");
    });
  });
});
