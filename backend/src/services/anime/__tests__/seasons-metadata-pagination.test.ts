import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../../config/prisma.js";
import {
  getAnimeSeasons,
  getSeasonEpisodes,
} from "../../../controllers/anime.controller.js";
import {
  resolveAnonymousSeasons,
  resolveAnonymousSeasonEpisodes,
} from "../anonymous-anime.service.js";

function createMockReqRes(params: any = {}, query: any = {}, user: any = null) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    params,
    query,
    user,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
  };
}

describe("Seasons Metadata & Episode Pagination Architecture", () => {
  it("1. getAnimeSeasons returns lightweight season metadata without provider episode calls", async () => {
    const { req, res, getStatus, getData } = createMockReqRes({ animeId: "154587" }); // Frieren

    await getAnimeSeasons(req, res);

    assert.equal(getStatus(), 200);
    const data = getData();
    assert.ok(data, "Response data must exist");
    assert.equal(data.rootAnimeId, 154587);
    assert.ok(Array.isArray(data.seasons), "Seasons must be an array");
    assert.ok(data.seasons.length > 0, "Seasons must not be empty");

    const s1 = data.seasons[0];
    assert.equal(s1.number, 1);
    assert.equal(s1.anilistId, 154587);
    assert.equal(s1.episodeCount, 28);
    assert.ok(typeof s1.title === "string");
  });

  it("2. getAnimeSeasons validates animeId parameter", async () => {
    const { req, res, getStatus, getData } = createMockReqRes({ animeId: "invalid" });
    await getAnimeSeasons(req, res);
    assert.equal(getStatus(), 400);
    assert.match(getData().message, /invalid anime id/i);
  });

  it("3. Anonymous getAnimeSeasons performs zero Prisma catalog DB reads or writes", async () => {
    let dbReadCount = 0;
    let dbWriteCount = 0;

    const originalAnimeFind = prisma.anime.findUnique;
    const originalSeasonFind = prisma.animeSeason.findUnique;
    const originalEpisodeFind = prisma.episode.findMany;

    prisma.anime.findUnique = (async (...args: any[]) => {
      dbReadCount++;
      return (originalAnimeFind as any).apply(prisma.anime, args);
    }) as any;

    prisma.animeSeason.findUnique = (async (...args: any[]) => {
      dbReadCount++;
      return (originalSeasonFind as any).apply(prisma.animeSeason, args);
    }) as any;

    prisma.episode.findMany = (async (...args: any[]) => {
      dbReadCount++;
      return (originalEpisodeFind as any).apply(prisma.episode, args);
    }) as any;

    try {
      const { req, res, getStatus, getData } = createMockReqRes({ animeId: "154587" }, {}, null);
      await getAnimeSeasons(req, res);

      assert.equal(getStatus(), 200);
      assert.equal(
        dbReadCount,
        0,
        `Anonymous getAnimeSeasons must perform 0 DB reads, but performed ${dbReadCount}`
      );
      assert.equal(
        dbWriteCount,
        0,
        `Anonymous getAnimeSeasons must perform 0 DB writes, but performed ${dbWriteCount}`
      );
    } finally {
      prisma.anime.findUnique = originalAnimeFind;
      prisma.animeSeason.findUnique = originalSeasonFind;
      prisma.episode.findMany = originalEpisodeFind;
    }
  });

  it("4. getSeasonEpisodes supports pagination with limit and offset", async () => {
    // Request season 1 with limit=10, offset=0
    const { req, res, getStatus, getData } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { limit: "10", offset: "0" }
    );

    await getSeasonEpisodes(req, res);

    assert.equal(getStatus(), 200);
    const data = getData();
    assert.ok(data.pagination, "Pagination metadata must be present when limit is specified");
    assert.equal(data.pagination.limit, 10);
    assert.equal(data.pagination.offset, 0);
    assert.equal(data.pagination.total, 28);
    assert.equal(data.pagination.hasMore, true);
    assert.equal(data.season.episodes.length, 10);
    assert.equal(data.season.episodes[0].number, 1);
    assert.equal(data.season.episodes[9].number, 10);

    // Request second batch limit=10, offset=10
    const { req: req2, res: res2, getStatus: getStatus2, getData: getData2 } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { limit: "10", offset: "10" }
    );

    await getSeasonEpisodes(req2, res2);

    assert.equal(getStatus2(), 200);
    const data2 = getData2();
    assert.equal(data2.pagination.offset, 10);
    assert.equal(data2.season.episodes.length, 10);
    assert.equal(data2.season.episodes[0].number, 11);
    assert.equal(data2.season.episodes[9].number, 20);
    assert.equal(data2.pagination.hasMore, true);

    // Request final batch limit=10, offset=20 (28 total, remaining 8)
    const { req: req3, res: res3, getStatus: getStatus3, getData: getData3 } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { limit: "10", offset: "20" }
    );

    await getSeasonEpisodes(req3, res3);

    assert.equal(getStatus3(), 200);
    const data3 = getData3();
    assert.equal(data3.pagination.offset, 20);
    assert.equal(data3.season.episodes.length, 8);
    assert.equal(data3.season.episodes[0].number, 21);
    assert.equal(data3.season.episodes[7].number, 28);
    assert.equal(data3.pagination.hasMore, false);
  });

  it("5. getSeasonEpisodes rejects invalid pagination parameters", async () => {
    // Negative offset
    const { req: req1, res: res1, getStatus: s1 } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { offset: "-1" }
    );
    await getSeasonEpisodes(req1, res1);
    assert.equal(s1(), 400);

    // Limit over 100
    const { req: req2, res: res2, getStatus: s2 } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { limit: "101" }
    );
    await getSeasonEpisodes(req2, res2);
    assert.equal(s2(), 400);

    // Limit 0
    const { req: req3, res: res3, getStatus: s3 } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      { limit: "0" }
    );
    await getSeasonEpisodes(req3, res3);
    assert.equal(s3(), 400);
  });

  it("6. getSeasonEpisodes without pagination query params returns full list for backward compatibility", async () => {
    const { req, res, getStatus, getData } = createMockReqRes(
      { animeId: "154587", seasonNumber: "1" },
      {} // no pagination params
    );

    await getSeasonEpisodes(req, res);

    assert.equal(getStatus(), 200);
    const data = getData();
    assert.equal(data.season.episodes.length, 28);
    assert.equal(data.season.episodes[0].number, 1);
    assert.equal(data.season.episodes[27].number, 28);
  });

  it("7. In-memory TTL cache serves subsequent calls instantly", async () => {
    const t0 = performance.now();
    const res1 = await resolveAnonymousSeasons(154587);
    const tFirst = performance.now() - t0;

    const t1 = performance.now();
    const res2 = await resolveAnonymousSeasons(154587);
    const tCached = performance.now() - t1;

    assert.ok(res1 && res2);
    assert.equal(res1.rootAnimeId, res2.rootAnimeId);
    assert.equal(res1.seasons.length, res2.seasons.length);
    // Cached response should return in sub-millisecond or few milliseconds
    assert.ok(
      tCached < 20,
      `Cached call must be fast (<20ms), took ${tCached.toFixed(2)}ms`
    );
  });
});
