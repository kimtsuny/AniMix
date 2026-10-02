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
}

export interface Anime {
  id: number | null;
  anilistId: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
}

export interface GetSeasonEpisodesResponse {
  anime: Anime;
  seasons: Season[];
  season: {
    id: number | null;
    number: number;
    title: string | null;
    episodes: Episode[];
  };
}

export async function getSeasonEpisodes(
  animeId: number,
  seasonNumber: number
): Promise<GetSeasonEpisodesResponse> {
  return httpClient<GetSeasonEpisodesResponse>(
    `/anime/${animeId}/seasons/${seasonNumber}/episodes`
  );
}