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

/**
 * Generates deduplicated candidate search queries based on AniList metadata.
 */
export function buildSearchQueries(anime: AniListAnime): string[] {
  const rawList: string[] = [];

  if (anime.title.english) rawList.push(anime.title.english);
  if (anime.title.romaji) rawList.push(anime.title.romaji);

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

  // Include AniList synonyms
  if (anime.synonyms && anime.synonyms.length > 0) {
    for (const syn of anime.synonyms.slice(0, 5)) {
      if (syn && syn.length > 2) {
        rawList.push(syn);
      }
    }
  }

  if (anime.title.native) {
    rawList.push(anime.title.native);
  }

  // Deduplicate case-insensitively using normalized keys
  const seen = new Set<string>();
  const queries: string[] = [];

  for (const q of rawList) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const key = normalizeTitle(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    queries.push(trimmed);
  }

  return queries;
}

/**
 * Queries AnimeParadise API directly for a query string with limit=50.
 */
async function fetchAnimeParadiseSearch(
  query: string,
  timeoutMs = 15000
): Promise<RawAnimeParadiseSearchItem[]> {
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
      return [];
    }

    const json = (await res.json()) as { data?: RawAnimeParadiseSearchItem[] };
    return json?.data ?? [];
  } catch (error) {
    console.warn(`[Candidate Discovery] Error searching AnimeParadise for "${query}":`, error);
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
