import { resolveBoundedSeriesStructure, discoverFranchiseStructure } from "../mapping/phase3-planner.js";
import { resolveAnonymousSeasonEpisodes } from "../anonymous-anime.service.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";

async function benchmarkCase(name: string, anilistId: number, seasonNumber: number) {
  let anilistFetchCount = 0;
  let anikotoRequestCount = 0;
  let apRequestCount = 0;
  let episodeFetchCount = 0;

  // Spy on global fetch for AniList and providers
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
  console.log("=== RUNNING PERFORMANCE BENCHMARK ===");

  // 1. Dragon Ball (AniList ID 223, Season 1) - Stress test
  const dbMetrics = await benchmarkCase("Dragon Ball (1986)", 223, 1);
  console.log("\n[Metrics: Dragon Ball 223]");
  console.dir(dbMetrics);

  // 2. Dragon Ball Z (AniList ID 813, Season 1) - Independent Series test
  const dbzMetrics = await benchmarkCase("Dragon Ball Z (1989)", 813, 1);
  console.log("\n[Metrics: Dragon Ball Z 813]");
  console.dir(dbzMetrics);

  // 3. Frieren (AniList ID 154587, Season 1) - Multi-season test
  const frierenMetrics = await benchmarkCase("Frieren Season 1", 154587, 1);
  console.log("\n[Metrics: Frieren 154587]");
  console.dir(frierenMetrics);

  // Compare with old franchise traversal for Dragon Ball (measuring relation nodes)
  console.log("\n[Measuring Old Franchise Traversal for Dragon Ball (223)]");
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
