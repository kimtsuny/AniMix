import {
  AnimeParadiseProvider,
  AllmangaProvider,
  HttpClient,
} from "anime-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize HTTP client and providers
const http = new HttpClient({
  timeoutMs: 25000,
});

const animeParadise = new AnimeParadiseProvider(http);
const allManga = new AllmangaProvider(http, { defaultLanguage: "sub" });

interface AnimeTestCase {
  id: number; // AniList ID
  name: string;
  category: "long_running" | "modern" | "older" | "sequel" | "niche" | "movie";
  expectedEpisodes?: number;
  format?: string;
}

const TEST_DATASET: AnimeTestCase[] = [
  // 1. Popular long-running
  { id: 21, name: "One Piece", category: "long_running" },
  { id: 20, name: "Naruto", category: "long_running", expectedEpisodes: 220 },
  { id: 269, name: "Bleach", category: "long_running", expectedEpisodes: 366 },
  { id: 223, name: "Dragon Ball", category: "long_running", expectedEpisodes: 153 },
  { id: 235, name: "Detective Conan", category: "long_running" },

  // 2. Popular modern
  { id: 101922, name: "Demon Slayer: Kimetsu no Yaiba", category: "modern", expectedEpisodes: 26 },
  { id: 113415, name: "Jujutsu Kaisen", category: "modern", expectedEpisodes: 24 },
  { id: 16498, name: "Attack on Titan", category: "modern", expectedEpisodes: 25 },
  { id: 21459, name: "My Hero Academia", category: "modern", expectedEpisodes: 13 },
  { id: 151807, name: "Solo Leveling", category: "modern", expectedEpisodes: 12 },

  // 3. Older anime
  { id: 1535, name: "Death Note", category: "older", expectedEpisodes: 37 },
  { id: 19, name: "Monster", category: "older", expectedEpisodes: 74 },
  { id: 245, name: "Great Teacher Onizuka", category: "older", expectedEpisodes: 43 },
  { id: 1575, name: "Code Geass: Lelouch of the Rebellion", category: "older", expectedEpisodes: 25 },
  { id: 5114, name: "Fullmetal Alchemist: Brotherhood", category: "older", expectedEpisodes: 64 },

  // 4. Multiple-season / sequel anime
  { id: 104578, name: "Attack on Titan Season 3 Part 2", category: "sequel", expectedEpisodes: 10 },
  { id: 114446, name: "Bleach: Thousand-Year Blood War", category: "sequel", expectedEpisodes: 13 },
  { id: 101338, name: "Mob Psycho 100 II", category: "sequel", expectedEpisodes: 13 },
  { id: 136430, name: "Vinland Saga Season 2", category: "sequel", expectedEpisodes: 24 },
  { id: 125367, name: "Kaguya-sama: Love is War - Ultra Romantic", category: "sequel", expectedEpisodes: 13 },

  // 5. Less mainstream / niche
  { id: 131447, name: "Odd Taxi", category: "niche", expectedEpisodes: 13 },
  { id: 132126, name: "Sonny Boy", category: "niche", expectedEpisodes: 12 },
  { id: 20607, name: "Ping Pong the Animation", category: "niche", expectedEpisodes: 11 },
  { id: 20973, name: "Shouwa Genroku Rakugo Shinjuu", category: "niche", expectedEpisodes: 12 },
  { id: 2246, name: "Mononoke", category: "niche", expectedEpisodes: 12 },

  // 6. Movies
  { id: 199, name: "Spirited Away", category: "movie", expectedEpisodes: 1, format: "MOVIE" },
  { id: 21519, name: "Your Name.", category: "movie", expectedEpisodes: 1, format: "MOVIE" },
  { id: 20954, name: "A Silent Voice", category: "movie", expectedEpisodes: 1, format: "MOVIE" },
  { id: 164, name: "Princess Mononoke", category: "movie", expectedEpisodes: 1, format: "MOVIE" },
  { id: 142470, name: "Suzume", category: "movie", expectedEpisodes: 1, format: "MOVIE" },
];

export interface ProviderResult {
  searchSuccess: boolean;
  searchLatencyMs: number;
  providerMediaId?: string;
  matchedTitle?: string;
  titleSimilarity: number;
  mappingClassification: "EXACT" | "FUZZY" | "MAPPING_NOT_FOUND" | "MAPPING_AMBIGUOUS" | "WRONG_SEASON" | "PROVIDER_ERROR";
  episodesSuccess: boolean;
  episodesLatencyMs: number;
  episodeCount: number;
  availableLanguages: string[];
  testedEpisodes: Array<{
    episodeNumber: number;
    unitId: string;
    resolveSuccess: boolean;
    resolveLatencyMs: number;
    streamCount: number;
    streamTypes: string[];
    qualities: string[];
    has1080p: boolean;
    has720p: boolean;
    subtitlesCount: number;
    subtitleLanguages: string[];
    hasArabicSub: boolean;
    hasEnglishSub: boolean;
    subtitleFormat?: string;
    isDirectHlsOrMp4: boolean;
    isMkissa: boolean;
    isEmbed: boolean;
    sanitizedSourceUrls: string[];
    failureCategory?: string;
    failureDetail?: string;
  }>;
  overallFailureCategory?: string;
}

export interface TitleBenchmarkRecord {
  testCase: AnimeTestCase;
  animeParadise: ProviderResult;
  allManga: ProviderResult;
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const pairs1 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) pairs1.add(s1.slice(i, i + 2));
  const pairs2 = new Set<string>();
  for (let i = 0; i < s2.length - 1; i++) pairs2.add(s2.slice(i, i + 2));

  let intersection = 0;
  for (const p of pairs1) {
    if (pairs2.has(p)) intersection++;
  }
  return Number(((2.0 * intersection) / (pairs1.size + pairs2.size)).toFixed(2));
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (url.includes("mkissa.to")) {
      return `MKISSA_EXTERNAL_PAGE[${parsed.pathname}]`;
    }
    if (url.includes(".m3u8")) {
      return `DIRECT_M3U8[${parsed.hostname}${parsed.pathname}]`;
    }
    if (url.includes(".mp4")) {
      return `DIRECT_MP4[${parsed.hostname}${parsed.pathname}]`;
    }
    if (url.includes("fast4speed")) {
      return `FAST4SPEED_HOST[${parsed.hostname}]`;
    }
    if (url.includes("wixmp") || url.includes("wixstatic")) {
      return `WIXMP_HOST[${parsed.hostname}]`;
    }
    if (url.includes("mp4upload")) {
      return `MP4UPLOAD_HOST[${parsed.hostname}]`;
    }
    return `UNKNOWN_STREAM_HOST[${parsed.hostname}]`;
  } catch {
    return "INVALID_URL";
  }
}

async function testSingleProvider(
  provider: AnimeParadiseProvider | AllmangaProvider,
  providerName: "animeparadise" | "allmanga",
  testCase: AnimeTestCase
): Promise<ProviderResult> {
  const result: ProviderResult = {
    searchSuccess: false,
    searchLatencyMs: 0,
    titleSimilarity: 0,
    mappingClassification: "MAPPING_NOT_FOUND",
    episodesSuccess: false,
    episodesLatencyMs: 0,
    episodeCount: 0,
    availableLanguages: [],
    testedEpisodes: [],
  };

  // 1. Search
  const searchStart = Date.now();
  let searchResults: any[] = [];
  try {
    searchResults = await provider.search(testCase.name);
    result.searchLatencyMs = Date.now() - searchStart;
    result.searchSuccess = searchResults.length > 0;
  } catch (err: any) {
    result.searchLatencyMs = Date.now() - searchStart;
    result.searchSuccess = false;
    result.mappingClassification = "PROVIDER_ERROR";
    result.overallFailureCategory = "PROVIDER_ERROR";
    return result;
  }

  if (searchResults.length === 0) {
    result.mappingClassification = "MAPPING_NOT_FOUND";
    result.overallFailureCategory = "NOT_FOUND";
    return result;
  }

  // Find best candidate
  let bestCandidate = searchResults[0];
  let bestSim = 0;
  for (const item of searchResults) {
    const sim = calculateSimilarity(testCase.name, item.title);
    if (sim > bestSim) {
      bestSim = sim;
      bestCandidate = item;
    }
  }

  result.providerMediaId = bestCandidate.id;
  result.matchedTitle = bestCandidate.title;
  result.titleSimilarity = bestSim;
  result.availableLanguages = bestCandidate.availableLanguages ?? [];

  if (bestSim >= 0.8) {
    result.mappingClassification = "EXACT";
  } else if (bestSim >= 0.5) {
    result.mappingClassification = "FUZZY";
  } else {
    result.mappingClassification = "MAPPING_AMBIGUOUS";
  }

  // 2. Fetch Episodes
  const epStart = Date.now();
  let episodes: any[] = [];
  try {
    episodes = await provider.fetchContentUnits(bestCandidate.id);
    result.episodesLatencyMs = Date.now() - epStart;
    result.episodesSuccess = episodes.length > 0;
    result.episodeCount = episodes.length;
  } catch (err: any) {
    result.episodesLatencyMs = Date.now() - epStart;
    result.episodesSuccess = false;
    result.overallFailureCategory = "EPISODE_FAILURE";
    return result;
  }

  if (episodes.length === 0) {
    result.overallFailureCategory = "EPISODE_FAILURE";
    return result;
  }

  // Select representative episodes: Episode 1, Middle, Final, and arbitrarily 50 or 100 if available
  const indicesToTest: number[] = [0]; // first
  const midIndex = Math.floor(episodes.length / 2);
  if (midIndex > 0 && midIndex < episodes.length - 1) {
    indicesToTest.push(midIndex);
  }
  if (episodes.length > 1) {
    indicesToTest.push(episodes.length - 1); // last
  }
  if (episodes.length > 50) {
    indicesToTest.push(49); // Ep 50
  }

  // Deduplicate indices
  const uniqueIndices = Array.from(new Set(indicesToTest)).sort((a, b) => a - b);

  // 3. Resolve Streams
  for (const idx of uniqueIndices) {
    const ep = episodes[idx];
    const epRecord: ProviderResult["testedEpisodes"][0] = {
      episodeNumber: ep.number ?? (idx + 1),
      unitId: ep.id,
      resolveSuccess: false,
      resolveLatencyMs: 0,
      streamCount: 0,
      streamTypes: [],
      qualities: [],
      has1080p: false,
      has720p: false,
      subtitlesCount: 0,
      subtitleLanguages: [],
      hasArabicSub: false,
      hasEnglishSub: false,
      isDirectHlsOrMp4: false,
      isMkissa: false,
      isEmbed: false,
      sanitizedSourceUrls: [],
    };

    const resStart = Date.now();
    try {
      const streamRes = await provider.resolveStream(ep.id);
      epRecord.resolveLatencyMs = Date.now() - resStart;
      epRecord.resolveSuccess = true;

      const streams = streamRes.streams ?? [];
      epRecord.streamCount = streams.length;

      for (const s of streams) {
        epRecord.streamTypes.push(s.isHLS ? "HLS" : "MP4");
        if (s.quality) epRecord.qualities.push(s.quality);
        if (s.quality === "1080p") epRecord.has1080p = true;
        if (s.quality === "720p") epRecord.has720p = true;

        const sanitized = sanitizeUrl(s.sourceUrl);
        epRecord.sanitizedSourceUrls.push(sanitized);

        if (sanitized.includes("DIRECT_M3U8") || sanitized.includes("DIRECT_MP4")) {
          epRecord.isDirectHlsOrMp4 = true;
        }
        if (sanitized.includes("MKISSA")) {
          epRecord.isMkissa = true;
        }

        if (s.subtitles && s.subtitles.length > 0) {
          epRecord.subtitlesCount += s.subtitles.length;
          for (const sub of s.subtitles) {
            epRecord.subtitleLanguages.push(sub.language || sub.label || "unknown");
            if (sub.format) epRecord.subtitleFormat = sub.format;
            const langLower = (sub.language || sub.label || "").toLowerCase();
            if (langLower.includes("ar") || langLower.includes("arab")) {
              epRecord.hasArabicSub = true;
            }
            if (langLower.includes("en") || langLower.includes("eng")) {
              epRecord.hasEnglishSub = true;
            }
          }
        }
      }
    } catch (err: any) {
      epRecord.resolveLatencyMs = Date.now() - resStart;
      epRecord.resolveSuccess = false;
      epRecord.failureDetail = err.message;

      if (err.message.includes("403") || err.message.toLowerCase().includes("cloudflare")) {
        epRecord.failureCategory = "CLOUDFLARE";
      } else if (err.message.includes("timeout") || err.message.includes("aborted")) {
        epRecord.failureCategory = "TIMEOUT";
      } else if (err.message.includes("mkissa")) {
        epRecord.failureCategory = "MKISSA_REDIRECT";
      } else {
        epRecord.failureCategory = "STREAM_FAILURE";
      }
    }

    result.testedEpisodes.push(epRecord);

    // Minor delay between episodes to avoid rate limiting
    await new Promise((r) => setTimeout(r, 400));
  }

  return result;
}

export async function runBenchmark() {
  console.log("===============================================================================");
  console.log("  STREAMING PROVIDER BENCHMARK: ANIMEPARADISE vs ALLMANGA");
  console.log("  anime-sdk version: 1.1.0");
  console.log(`  Total Test Cases: ${TEST_DATASET.length}`);
  console.log("===============================================================================\n");

  const records: TitleBenchmarkRecord[] = [];

  for (let i = 0; i < TEST_DATASET.length; i++) {
    const testCase = TEST_DATASET[i];
    console.log(`[${i + 1}/${TEST_DATASET.length}] Testing "${testCase.name}" (${testCase.category}, AniList #${testCase.id})...`);

    console.log(`  -> AnimeParadise...`);
    const apRes = await testSingleProvider(animeParadise, "animeparadise", testCase);
    console.log(`     Search: ${apRes.searchSuccess ? "OK" : "FAIL"} | Eps: ${apRes.episodeCount} | Stream tested: ${apRes.testedEpisodes.length}`);

    // Delay between providers
    await new Promise((r) => setTimeout(r, 600));

    console.log(`  -> AllManga...`);
    const amRes = await testSingleProvider(allManga, "allmanga", testCase);
    console.log(`     Search: ${amRes.searchSuccess ? "OK" : "FAIL"} | Eps: ${amRes.episodeCount} | Stream tested: ${amRes.testedEpisodes.length}`);

    records.push({
      testCase,
      animeParadise: apRes,
      allManga: amRes,
    });

    console.log("");
    // Pause between titles
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Save raw benchmark data
  const rawPath = path.join(__dirname, "benchmark-results.json");
  await fs.writeFile(rawPath, JSON.stringify(records, null, 2), "utf-8");
  console.log(`Raw benchmark data saved to: ${rawPath}`);

  return records;
}

// Special Phase 12 MKissa deep dive
export async function investigateMkissa() {
  console.log("\n===============================================================================");
  console.log("  PHASE 12 — SPECIAL MKISSA DEEP-DIVE INVESTIGATION");
  console.log("===============================================================================\n");

  const mkissaTestUrl = "https://mkissa.to/anime/6aa5e2b2be0758515ec1ed72/p-1-sub";
  const showId = "6aa5e2b2be0758515ec1ed72";

  console.log(`Target URL: ${mkissaTestUrl}`);
  console.log(`Target Show ID: ${showId}`);

  // 1. Check show info via AllAnime GraphQL
  try {
    const gql = `query ($showId: String!) { show( _id: $showId ) { _id name englishName availableEpisodesDetail }}`;
    const res = await http.post("https://api.allanime.day/api", {
      variables: { showId },
      query: gql,
    }, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://allmanga.to",
        Origin: "https://allmanga.to",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
      }
    });

    console.log(`AllAnime show query response status: ${res.status}`);
    const json = await res.json();
    console.log("Show info:", JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error("Show query error:", err.message);
  }

  // 2. Check stream sources for this exact show/episode in AllManga
  try {
    console.log(`Calling allManga.resolveStream('${showId}/1')...`);
    const stream = await allManga.resolveStream(`${showId}/1`, "sub");
    console.log("Resolved stream result:", JSON.stringify(stream, null, 2));
  } catch (err: any) {
    console.error("Resolve stream error:", err.message);
  }

  // 3. Directly inspect MKissa page response
  try {
    console.log(`Fetching MKissa direct page: ${mkissaTestUrl}...`);
    const mkissaRes = await http.get(mkissaTestUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        Referer: "https://allmanga.to/"
      }
    });
    console.log(`MKissa HTTP status: ${mkissaRes.status}`);
    const text = await mkissaRes.text();
    console.log(`MKissa HTML length: ${text.length} chars`);
    console.log("MKissa HTML preview (first 500 chars):", text.slice(0, 500));
    console.log("Does it contain .m3u8?", text.includes(".m3u8"));
    console.log("Does it contain .mp4?", text.includes(".mp4"));
    console.log("Does it contain iframe?", text.includes("<iframe"));
    console.log("Does it contain Cloudflare challenge?", text.includes("cf-browser-verification") || text.includes("challenge-running") || text.includes("Cloudflare"));
  } catch (err: any) {
    console.error("Direct MKissa fetch error:", err.message);
  }
}

async function main() {
  await investigateMkissa();
  await runBenchmark();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
