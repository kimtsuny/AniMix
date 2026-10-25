import { httpClient } from "@/shared/api/http-client";

export interface Episode {
  id: number | null;
  number: number;
  title: string | null;
  thumbnail: string | null;
  provider?: string;
  providerId?: string;
}

export interface Season {
  id: number | null;
  number: number;
  title: string | null;
  episodeCount: number;
  anilistId?: number | null;
  anilistIds?: number[];
}

export interface Anime {
  id: number | null;
  anilistId: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginationMetadata {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface GetSeasonEpisodesResponse {
  anime: Anime;
  seasons: Season[];
  season: {
    id: number | null;
    number: number;
    title: string | null;
    anilistId?: number | null;
    episodes: Episode[];
  };
  pagination?: PaginationMetadata;
}

export interface GetAnimeSeasonsResponse {
  rootAnimeId: number;
  requestedSeasonNumber: number;
  anime?: Anime;
  seasons: Season[];
}

export interface GetSeasonEpisodesOptions extends RequestInit {
  force?: boolean;
}

const SEASON_EPISODES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ANIME_SEASONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CachedSeasonEpisodesEntry {
  data: GetSeasonEpisodesResponse;
  timestamp: number;
}

export interface CachedAnimeSeasonsEntry {
  data: GetAnimeSeasonsResponse;
  timestamp: number;
}

const seasonEpisodesCache = new Map<string, CachedSeasonEpisodesEntry>();
const inFlightSeasonEpisodesPromises = new Map<string, Promise<GetSeasonEpisodesResponse>>();

const animeSeasonsCache = new Map<number, CachedAnimeSeasonsEntry>();
const inFlightAnimeSeasonsPromises = new Map<number, Promise<GetAnimeSeasonsResponse>>();

export function buildSeasonEpisodesKey(
  animeId: number,
  seasonNumber: number,
  pagination?: PaginationParams
): string {
  const offset = pagination?.offset !== undefined ? pagination.offset : 0;
  const limit = pagination?.limit !== undefined ? pagination.limit : "all";
  return `anime:${animeId}:s:${seasonNumber}:o:${offset}:l:${limit}`;
}

export function getCachedSeasonEpisodes(
  animeId: number,
  seasonNumber: number,
  pagination?: PaginationParams
): GetSeasonEpisodesResponse | null {
  const key = buildSeasonEpisodesKey(animeId, seasonNumber, pagination);
  const entry = seasonEpisodesCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > SEASON_EPISODES_CACHE_TTL_MS) {
    seasonEpisodesCache.delete(key);
    return null;
  }

  return entry.data;
}

export function clearSeasonEpisodesCache(): void {
  seasonEpisodesCache.clear();
  inFlightSeasonEpisodesPromises.clear();
}

export function getCachedAnimeSeasons(
  animeId: number
): GetAnimeSeasonsResponse | null {
  const entry = animeSeasonsCache.get(animeId);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > ANIME_SEASONS_CACHE_TTL_MS) {
    animeSeasonsCache.delete(animeId);
    return null;
  }

  return entry.data;
}

export function clearAnimeSeasonsCache(): void {
  animeSeasonsCache.clear();
  inFlightAnimeSeasonsPromises.clear();
}

export async function getAnimeSeasons(
  animeId: number,
  options?: { force?: boolean }
): Promise<GetAnimeSeasonsResponse> {
  if (!options?.force) {
    const cached = getCachedAnimeSeasons(animeId);
    if (cached) {
      return cached;
    }

    const inFlight = inFlightAnimeSeasonsPromises.get(animeId);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = (async () => {
    try {
      const data = await httpClient<GetAnimeSeasonsResponse>(
        `/anime/${animeId}/seasons`
      );
      animeSeasonsCache.set(animeId, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } finally {
      inFlightAnimeSeasonsPromises.delete(animeId);
    }
  })();

  inFlightAnimeSeasonsPromises.set(animeId, promise);
  return promise;
}

export async function getSeasonEpisodes(
  animeId: number,
  seasonNumber: number,
  pagination?: PaginationParams,
  options?: GetSeasonEpisodesOptions
): Promise<GetSeasonEpisodesResponse> {
  const key = buildSeasonEpisodesKey(animeId, seasonNumber, pagination);

  if (!options?.force) {
    const cached = getCachedSeasonEpisodes(animeId, seasonNumber, pagination);
    if (cached) {
      return cached;
    }

    const inFlight = inFlightSeasonEpisodesPromises.get(key);
    if (inFlight) {
      return inFlight;
    }
  }

  const query = new URLSearchParams();
  if (pagination?.offset !== undefined) {
    query.set("offset", String(pagination.offset));
  }
  if (pagination?.limit !== undefined) {
    query.set("limit", String(pagination.limit));
  }
  const queryString = query.toString();
  const endpoint = `/anime/${animeId}/seasons/${seasonNumber}/episodes${
    queryString ? `?${queryString}` : ""
  }`;

  const { force, ...fetchOptions } = options || {};

  const promise = (async () => {
    try {
      const data = await httpClient<GetSeasonEpisodesResponse>(
        endpoint,
        fetchOptions
      );
      seasonEpisodesCache.set(key, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } finally {
      inFlightSeasonEpisodesPromises.delete(key);
    }
  })();

  inFlightSeasonEpisodesPromises.set(key, promise);
  return promise;
}