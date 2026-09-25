import { getAnimeById, type AniListAnime } from "../../anilist/anilist.service.js";
import { classifyTitle, type ParsedTitleMetadata } from "./candidate-classifier.js";
import { normalizeTitle } from "./title-normalizer.js";

const ANIMEPARADISE_API_BASE = "https://api.animeparadise.moe";

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

export interface DiscoveredCandidate {
  provider: "animeparadise";
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
  posterImage?: string;
}

export interface CandidateDiscoveryResult {
  anilist: AniListAnime;
  searchQueries: string[];
  candidates: DiscoveredCandidate[];
}

// In-memory search cache to prevent duplicate queries during a mapping execution
const searchCache = new Map<string, RawAnimeParadiseSearchItem[]>();

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

/**
 * Queries AnimeParadise API directly for a query string with limit=50.
 * Results are cached in-memory during the execution.
 */
async function fetchAnimeParadiseSearch(
  query: string,
  timeoutMs = 10000
): Promise<RawAnimeParadiseSearchItem[]> {
  const cacheKey = normalizeTitle(query);
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
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
      searchCache.set(cacheKey, []);
      return [];
    }

    const json = (await res.json()) as { data?: RawAnimeParadiseSearchItem[] };
    const items = json?.data ?? [];
    searchCache.set(cacheKey, items);
    return items;
  } catch (error) {
    console.warn(`[Candidate Discovery] Error searching AnimeParadise for "${query}":`, error);
    searchCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Discovers all AnimeParadise candidates for an AniList anime using multi-query search.
 * Results are deduplicated by provider ID and parsed into structured metadata.
 */
export async function discoverCandidatesForAnime(
  animeOrId: AniListAnime | number
): Promise<CandidateDiscoveryResult> {
  const anime =
    typeof animeOrId === "number" ? await getAnimeById(animeOrId) : animeOrId;

  const queries = buildSearchQueries(anime);
  const candidateMap = new Map<string, DiscoveredCandidate>();

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

  return {
    anilist: anime,
    searchQueries: queries,
    candidates: Array.from(candidateMap.values()),
  };
}
