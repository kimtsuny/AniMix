import { HttpClient, DomRegistry } from "anime-sdk";
import { getAnimeById, type AniListAnime } from "../../anilist/anilist.service.js";
import { classifyTitle, type ParsedTitleMetadata } from "./candidate-classifier.js";
import { normalizeTitle } from "./title-normalizer.js";

const ANIMEPARADISE_API_BASE = "https://api.animeparadise.moe";
const anikotoHttp = new HttpClient({
  timeoutMs: 15000,
});

export type MappingProviderName = "anikoto" | "animeparadise";

export interface RawAnimeParadiseSearchItem {
  _id: string;
  title: string;
  episodes?: number;
  episodeCount?: number;
  startDate?: string;
  animeSeason?: { season?: string; year?: number };
  year?: number;
  released?: string;
  posterImage?: {
    medium?: string;
    large?: string;
    small?: string;
  };
  alternativeTitle?: {
    english?: string;
    romaji?: string;
    native?: string;
  };
}

export interface RawAniKotoSearchItem {
  id: string;
  title: string;
  dataJp?: string;
  episodeCount: number;
  format?: string;
  posterImage?: string;
  detailUrl?: string;
}

export interface DiscoveredCandidate {
  provider: MappingProviderName;
  providerId: string;
  urn: string;
  title: string;
  alternativeTitle?: {
    english?: string;
    romaji?: string;
    native?: string;
  };
  parsedMain: ParsedTitleMetadata;
  parsedEnglish?: ParsedTitleMetadata;
  year?: number;
  episodeCount: number;
  format?: string;
  posterImage?: string;
  detailUrl?: string;
}

export interface CandidateDiscoveryResult {
  anilist: AniListAnime;
  searchQueries: string[];
  candidates: DiscoveredCandidate[];
  provider: MappingProviderName;
}

// In-memory search caches to prevent duplicate queries during a mapping execution
const searchCacheAnimeParadise = new Map<string, RawAnimeParadiseSearchItem[]>();
const searchCacheAniKoto = new Map<string, RawAniKotoSearchItem[]>();

/**
 * Generates deduplicated candidate search queries based on AniList metadata.
 * Includes canonical titles, base titles, arc/subtitle segments, synonyms, and relation titles.
 */
export function buildSearchQueries(anime: AniListAnime): string[] {
  const rawList: string[] = [];

  if (anime.title.english) rawList.push(anime.title.english);
  if (anime.title.romaji) rawList.push(anime.title.romaji);
  if (anime.title.native) rawList.push(anime.title.native);

  // Add parsed base titles (e.g. "Attack on Titan Season 3" -> "Attack on Titan")
  if (anime.title.english) {
    const parsedEn = classifyTitle(anime.title.english);
    if (parsedEn.baseTitle && parsedEn.baseTitle !== anime.title.english) {
      rawList.push(parsedEn.baseTitle);
    }
  }

  if (anime.title.romaji) {
    const parsedRo = classifyTitle(anime.title.romaji);
    if (parsedRo.baseTitle && parsedRo.baseTitle !== anime.title.romaji) {
      rawList.push(parsedRo.baseTitle);
    }
  }

  // Extract arc / subtitle segments (e.g. "Kimetsu no Yaiba: Yuukaku-hen" -> "Kimetsu no Yaiba", "Yuukaku-hen")
  const titlesToSplit = [anime.title.english, anime.title.romaji].filter(Boolean) as string[];
  for (const t of titlesToSplit) {
    const segments = t.split(/[:\-–—]/).map((s) => s.trim()).filter((s) => s.length >= 3);
    for (const seg of segments) {
      rawList.push(seg);
    }
  }

  // Include direct relation titles (PREQUEL, SEQUEL, PARENT)
  if (anime.relations?.edges?.length) {
    for (const edge of anime.relations.edges) {
      if (
        (edge.relationType === "PREQUEL" || edge.relationType === "SEQUEL" || edge.relationType === "PARENT") &&
        edge.node?.title
      ) {
        if (edge.node.title.english) rawList.push(edge.node.title.english);
        if (edge.node.title.romaji) rawList.push(edge.node.title.romaji);
      }
    }
  }

  // Include AniList synonyms
  if (anime.synonyms && anime.synonyms.length > 0) {
    for (const syn of anime.synonyms.slice(0, 8)) {
      if (syn && syn.length > 2) {
        rawList.push(syn);
      }
    }
  }

  // Deduplicate case-insensitively using normalized keys
  const seen = new Set<string>();
  const queries: string[] = [];

  for (const q of rawList) {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) continue;
    const key = normalizeTitle(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    queries.push(trimmed);
  }

  return queries;
}

// In-memory cache for AniKoto watch page years
const anikotoYearCache = new Map<string, number | undefined>();

/**
 * Extracts release year from an AniKoto watch page metadata (.bmeta).
 */
export async function extractAniKotoYear(
  detailUrl: string
): Promise<number | undefined> {
  if (!detailUrl) return undefined;
  if (anikotoYearCache.has(detailUrl)) {
    return anikotoYearCache.get(detailUrl);
  }

  try {
    const res = await anikotoHttp.get(detailUrl);
    if (!res.ok) {
      anikotoYearCache.set(detailUrl, undefined);
      return undefined;
    }
    const html = await res.text();
    const dom = DomRegistry.parse(html);
    const bmeta =
      dom.querySelector(".bmeta")?.textContent ||
      dom.querySelector(".meta")?.textContent ||
      "";

    // Match "Premiered: SPRING 1989" or "Aired: Apr 15, 1989" or isolated 4-digit year
    const match =
      bmeta.match(/(?:Premiered|Aired)[^0-9]*\b(19\d{2}|20\d{2})\b/i) ||
      bmeta.match(/\b(19\d{2}|20\d{2})\b/);

    const year = match ? parseInt(match[1], 10) : undefined;
    anikotoYearCache.set(detailUrl, year);
    return year;
  } catch {
    anikotoYearCache.set(detailUrl, undefined);
    return undefined;
  }
}

/**
 * Parses items from an AniKoto search results DOM.
 */
function parseAniKotoItems(dom: any): RawAniKotoSearchItem[] {
  const items = dom.querySelectorAll(".main .item");
  const results: RawAniKotoSearchItem[] = [];

  for (const item of items) {
    const posterEl = item.querySelector(".poster");
    const id = posterEl?.getAttribute("data-tip") || "";
    const nameEl = item.querySelector("a.name") || item.querySelector(".name");
    const title = nameEl?.textContent?.trim() || "";
    const dataJp = nameEl?.getAttribute("data-jp") || undefined;
    const detailUrl = nameEl?.getAttribute("href") || undefined;
    const epText =
      item.querySelector(".ep-status.total")?.textContent?.trim() ||
      item.querySelector(".ep-status")?.textContent?.trim() ||
      "0";
    const epCount = parseInt(epText, 10);
    const episodeCount = !isNaN(epCount) && epCount > 0 ? epCount : 0;
    const format = item.querySelector(".right")?.textContent?.trim() || undefined;
    const posterImage = item.querySelector("img")?.getAttribute("src") || undefined;

    if (id && title) {
      results.push({
        id,
        title,
        dataJp,
        episodeCount,
        format,
        posterImage,
        detailUrl,
      });
    }
  }

  return results;
}

/**
 * Queries AniKoto filter catalog for a query string.
 * Fetches page 1 and automatically fetches page 2 when page 1 has a full 30 results
 * (essential for large franchises like Dragon Ball, Ranma, One Piece, etc.).
 * Results are cached in-memory during execution.
 */
async function fetchAniKotoSearch(
  query: string
): Promise<RawAniKotoSearchItem[]> {
  const cacheKey = normalizeTitle(query);
  if (searchCacheAniKoto.has(cacheKey)) {
    return searchCacheAniKoto.get(cacheKey)!;
  }

  try {
    const resP1 = await anikotoHttp.get(
      `https://anikototv.to/filter?keyword=${encodeURIComponent(query)}&page=1`
    );

    if (!resP1.ok) {
      console.warn(`[Candidate Discovery] AniKoto search failed (${resP1.status}) for "${query}"`);
      searchCacheAniKoto.set(cacheKey, []);
      return [];
    }

    const htmlP1 = await resP1.text();
    const domP1 = DomRegistry.parse(htmlP1);
    const results = parseAniKotoItems(domP1);

    // If page 1 returned 30 items, there is high likelihood of relevant items on page 2
    if (results.length >= 30) {
      try {
        const resP2 = await anikotoHttp.get(
          `https://anikototv.to/filter?keyword=${encodeURIComponent(query)}&page=2`
        );
        if (resP2.ok) {
          const htmlP2 = await resP2.text();
          const domP2 = DomRegistry.parse(htmlP2);
          const p2Items = parseAniKotoItems(domP2);
          for (const item of p2Items) {
            if (!results.some((r) => r.id === item.id)) {
              results.push(item);
            }
          }
        }
      } catch {
        // non-fatal, proceed with page 1 results
      }
    }

    searchCacheAniKoto.set(cacheKey, results);
    return results;
  } catch (error) {
    console.warn(`[Candidate Discovery] Error searching AniKoto for "${query}":`, error);
    searchCacheAniKoto.set(cacheKey, []);
    return [];
  }
}

/**
 * Queries AnimeParadise API directly for a query string with limit=50.
 * Results are cached in-memory during the execution.
 */
async function fetchAnimeParadiseSearch(
  query: string,
  timeoutMs = 10000
): Promise<RawAnimeParadiseSearchItem[]> {
  const cacheKey = normalizeTitle(query);
  if (searchCacheAnimeParadise.has(cacheKey)) {
    return searchCacheAnimeParadise.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${ANIMEPARADISE_API_BASE}/search?q=${encodeURIComponent(query)}&limit=50`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[Candidate Discovery] AnimeParadise search failed (${res.status}) for "${query}"`);
      searchCacheAnimeParadise.set(cacheKey, []);
      return [];
    }

    const json = (await res.json()) as { data?: RawAnimeParadiseSearchItem[] };
    const items = json?.data ?? [];
    searchCacheAnimeParadise.set(cacheKey, items);
    return items;
  } catch (error) {
    console.warn(`[Candidate Discovery] Error searching AnimeParadise for "${query}":`, error);
    searchCacheAnimeParadise.set(cacheKey, []);
    return [];
  }
}

/**
 * Discovers candidates for an AniList anime using multi-query search from the specified provider.
 * Defaults to "anikoto".
 */
export async function discoverCandidatesForAnime(
  animeOrId: AniListAnime | number,
  provider: MappingProviderName = "anikoto"
): Promise<CandidateDiscoveryResult> {
  const anime =
    typeof animeOrId === "number" ? await getAnimeById(animeOrId) : animeOrId;

  const queries = buildSearchQueries(anime);
  const candidateMap = new Map<string, DiscoveredCandidate>();

  if (provider === "anikoto") {
    for (const query of queries) {
      const items = await fetchAniKotoSearch(query);

      for (const item of items) {
        if (!item.id || candidateMap.has(item.id)) continue;

        const parsedMain = classifyTitle(item.title);
        const parsedEnglish = item.dataJp
          ? classifyTitle(item.dataJp)
          : undefined;

        let year = parsedMain.year ?? parsedEnglish?.year ?? undefined;

        // If year is not yet known and we have a detailUrl, enrich year for plausible candidate matches
        if (year === undefined && item.detailUrl) {
          const normItem = normalizeTitle(item.title);
          const targetTitles = [
            anime.title.english,
            anime.title.romaji,
            ...(anime.synonyms ?? []),
          ].filter(Boolean) as string[];

          const isPlausible = targetTitles.some((t) => {
            const normT = normalizeTitle(t);
            return (
              normItem.includes(normT) ||
              normT.includes(normItem) ||
              normItem.startsWith(normT.slice(0, 6))
            );
          });

          if (isPlausible) {
            year = await extractAniKotoYear(item.detailUrl);
          }
        }

        candidateMap.set(item.id, {
          provider: "anikoto",
          providerId: item.id,
          urn: `anikoto:${item.id}`,
          title: item.title,
          alternativeTitle: item.dataJp ? { romaji: item.dataJp } : undefined,
          parsedMain,
          parsedEnglish,
          year,
          episodeCount: item.episodeCount,
          format: item.format,
          posterImage: item.posterImage,
          detailUrl: item.detailUrl,
        });
      }
    }
  } else {
    for (const query of queries) {
      const items = await fetchAnimeParadiseSearch(query);

      for (const item of items) {
        if (!item._id || candidateMap.has(item._id)) continue;

        const year =
          item.animeSeason?.year ??
          (item.startDate ? new Date(item.startDate).getUTCFullYear() : undefined) ??
          item.year;

        const episodeCount = item.episodeCount ?? item.episodes ?? 0;

        const parsedMain = classifyTitle(item.title);
        const parsedEnglish = item.alternativeTitle?.english
          ? classifyTitle(item.alternativeTitle.english)
          : undefined;

        candidateMap.set(item._id, {
          provider: "animeparadise",
          providerId: item._id,
          urn: `animeparadise:${item._id}`,
          title: item.title,
          alternativeTitle: item.alternativeTitle,
          parsedMain,
          parsedEnglish,
          year,
          episodeCount,
          posterImage:
            item.posterImage?.large ??
            item.posterImage?.medium ??
            item.posterImage?.small,
        });
      }
    }
  }

  return {
    anilist: anime,
    searchQueries: queries,
    candidates: Array.from(candidateMap.values()),
    provider,
  };
}

export async function discoverAniKotoCandidatesForAnime(
  animeOrId: AniListAnime | number
): Promise<CandidateDiscoveryResult> {
  return discoverCandidatesForAnime(animeOrId, "anikoto");
}

export async function discoverAnimeParadiseCandidatesForAnime(
  animeOrId: AniListAnime | number
): Promise<CandidateDiscoveryResult> {
  return discoverCandidatesForAnime(animeOrId, "animeparadise");
}

