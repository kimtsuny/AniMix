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

export async function getAnimeSeasons(
  animeId: number
): Promise<GetAnimeSeasonsResponse> {
  return httpClient<GetAnimeSeasonsResponse>(`/anime/${animeId}/seasons`);
}

export async function getSeasonEpisodes(
  animeId: number,
  seasonNumber: number,
  pagination?: PaginationParams,
  options?: RequestInit
): Promise<GetSeasonEpisodesResponse> {
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
  return httpClient<GetSeasonEpisodesResponse>(endpoint, options);
}