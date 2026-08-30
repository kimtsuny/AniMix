import { httpClient } from "@/shared/api/http-client";

export interface FavoriteRecord {
  id: number;
  animeId: number;
  createdAt: string;
}

interface GetFavoritesResponse {
  favorites: FavoriteRecord[];
}

export async function getFavorites() {
  return httpClient<GetFavoritesResponse>("/favorites");
}