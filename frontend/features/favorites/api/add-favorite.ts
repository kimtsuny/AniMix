import { httpClient } from "@/shared/api/http-client";

interface AddFavoriteResponse {
  message: string;
  favorite: {
    id: number;
    animeId: number;
    userId: number;
    createdAt: string;
  };
}

export async function addFavorite(animeId: number) {
  return httpClient<AddFavoriteResponse>("/favorites", {
    method: "POST",
    body: JSON.stringify({
      animeId,
    }),
  });
}