import { httpClient } from "@/shared/api/http-client";

interface RemoveFavoriteResponse {
  message: string;
}

export async function removeFavorite(animeId: number) {
  return httpClient<RemoveFavoriteResponse>(
    `/favorites/${animeId}`,
    {
      method: "DELETE",
    }
  );
}