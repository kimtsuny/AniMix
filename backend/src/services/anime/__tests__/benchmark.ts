import { resolveBoundedSeriesStructure, discoverFranchiseStructure } from "../mapping/phase3-planner.js";
import { resolveAnonymousSeasonEpisodes } from "../anonymous-anime.service.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";
import { clearAniListCache } from "../../anilist/anilist.service.js";

interface BoundedResolutionBenchmarkResult {
  name: string;
  anilistId: number;
  totalMs: number;
  anilistFullRequests: number;
  anilistBatchRequests: number;
  anilistSequentialBasicRequests: number;
  totalAniListRequests: number;
  seasonsFound: number;
  seasonIds: number[];
}

async function benchmarkBoundedResolution(
  name: string,
  anilistId: number
): Promise<BoundedResolutionBenchmarkResult> {
  clearAniListCache();
  let anilistFullRequests = 0;
  let anilistBatchRequests = 0;
  let anilistSequentialBasicRequests = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, options: any) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("anilist.co")) {
      const body = JSON.parse(options?.body || "{}");
      if (body.query?.includes("AnimeById")) anilistFullRequests++;
      else if (body.query?.includes("AnimeBasicBatch")) anilistBatchRequests++;
      else if (body.query?.includes("AnimeBasicById")) anilistSequentialBasicRequests++;
      else anilistFullRequests++;
    }
    return originalFetch(url, options);
  }) as any;

  const tStart = performance.now();
  const structure = await resolveBoundedSeriesStructure(anilistId);
  const totalMs = performance.now() - tStart;

  globalThis.fetch = originalFetch;

  return {
    name,
    anilistId,
    totalMs: parseFloat(totalMs.toFixed(1)),
    anilistFullRequests,
    anilistBatchRequests,
    anilistSequentialBasicRequests,
    totalAniListRequests:
      anilistFullRequests + anilistBatchRequests + anilistSequentialBasicRequests,
    seasonsFound: structure.seasons.length,
    seasonIds: structure.seasons.map((s) => s.anilistId),
  };
}

async function benchmarkFullWatchPath(
  name: string,
  anilistId: number,
  seasonNumber: number
) {
  clearAniListCache();
  let anilistFetchCount = 0;
  let anikotoRequestCount = 0;
  let apRequestCount = 0;
  let episodeFetchCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, options: any) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("anilist.co")) anilistFetchCount++;
    if (urlStr.includes("animeparadise.moe")) apRequestCount++;
    return originalFetch(url, options);
  }) as any;

  const originalGetEpisodes = aniKotoProvider.getEpisodes;
  aniKotoProvider.getEpisodes = async (id: string) => {
    episodeFetchCount++;
    anikotoRequestCount++;
    return originalGetEpisodes(id);
  };

  const originalApGetEpisodes = animeParadiseProvider.getEpisodes;
  animeParadiseProvider.getEpisodes = async (id: string) => {
    apRequestCount++;
    return originalApGetEpisodes(id);
  };

  const tStart = performance.now();
  const result = await resolveAnonymousSeasonEpisodes(anilistId, seasonNumber);
  const totalMs = performance.now() - tStart;

  globalThis.fetch = originalFetch;
  aniKotoProvider.getEpisodes = originalGetEpisodes;
  animeParadiseProvider.getEpisodes = originalApGetEpisodes;

  const payloadSize = JSON.stringify(result).length;

  return {
    name,
    anilistId,
    seasonNumber,
    totalMs: parseFloat(totalMs.toFixed(1)),
    anilistFetchCount,
    anikotoRequestCount,
    apRequestCount,
    episodeFetchCount,
    episodesReturned: result?.season.episodes.length ?? 0,
    seasonsReturned: result?.seasons.length ?? 0,
    payloadSizeBytes: payloadSize,
  };
}

async function runBenchmark() {
  console.log("=== BOUNDED RESOLUTION BENCHMARK (ANILIST REQUEST PROFILING) ===");

  // 1. Dragon Ball (223) - Stress Case
  const dbBounded = await benchmarkBoundedResolution("Dragon Ball (1986)", 223);
  console.log("\n[Bounded: Dragon Ball 223]");
  console.dir(dbBounded);

  // 2. Frieren (154587) - Multi-Season Correctness Case
  const frierenBounded = await benchmarkBoundedResolution("Frieren", 154587);
  console.log("\n[Bounded: Frieren 154587]");
  console.dir(frierenBounded);

  // 3. Attack on Titan (16498) - Multi-Season Split-Branch Case
  const aotBounded = await benchmarkBoundedResolution("Attack on Titan", 16498);
  console.log("\n[Bounded: Attack on Titan 16498]");
  console.dir(aotBounded);

  // 4. One Piece (21) - Vast Relation Graph Case
  const opBounded = await benchmarkBoundedResolution("One Piece", 21);
  console.log("\n[Bounded: One Piece 21]");
  console.dir(opBounded);

  console.log("\n=== FULL ANONYMOUS RESOLUTION BENCHMARK ===");
  // Full watch path resolution for the 4 core cases
  const dbWatch = await benchmarkFullWatchPath("Dragon Ball S1", 223, 1);
  console.log("\n[Watch: Dragon Ball 223]");
  console.dir(dbWatch);

  const frierenWatch = await benchmarkFullWatchPath("Frieren S1", 154587, 1);
  console.log("\n[Watch: Frieren 154587]");
  console.dir(frierenWatch);

  const aotWatch = await benchmarkFullWatchPath("Attack on Titan S1", 16498, 1);
  console.log("\n[Watch: Attack on Titan 16498]");
  console.dir(aotWatch);

  const opWatch = await benchmarkFullWatchPath("One Piece S1", 21, 1);
  console.log("\n[Watch: One Piece 21]");
  console.dir(opWatch);

  // Franchise Traversal comparison for Dragon Ball (223)
  console.log("\n[Old Franchise Traversal Comparison for Dragon Ball (223)]");
  let oldFranchiseNodes = 0;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, options: any) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("anilist.co")) oldFranchiseNodes++;
    return oldFetch(url, options);
  }) as any;

  const tOldStart = performance.now();
  const oldFranchise = await discoverFranchiseStructure(223);
  const tOldMs = performance.now() - tOldStart;
  globalThis.fetch = oldFetch;

  console.log(`Old discoverFranchiseStructure(223):`);
  console.log(`- AniList requests: ${oldFranchiseNodes}`);
  console.log(`- Latency: ${tOldMs.toFixed(1)} ms`);
  console.log(`- Franchise entries traversed: ${oldFranchise.franchiseEntries.length}`);
  console.log(`- Logical groups created: ${oldFranchise.logicalGroups.length}`);
}

runBenchmark().catch(console.error);

