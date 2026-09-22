import { httpClient } from "@/shared/api/http-client";

export interface FavoriteRecord {
  id: number;
  animeId: number;
  createdAt: string;

  anime: {
    id: number;
    anilistId: number;
    title: string;
    description: string | null;
    coverImage: string | null;
    bannerImage: string | null;
  };
}

interface GetFavoritesResponse {
  favorites: FavoriteRecord[];
}

export async function getFavorites() {
  return httpClient<GetFavoritesResponse>("/favorites");
}