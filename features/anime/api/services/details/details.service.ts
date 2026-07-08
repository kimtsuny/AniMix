import { graphqlClient } from "@/shared/api/graphql-client";
import { DETAILS_QUERY } from "../../queries/details/details.query";
import { mapAnimeDetails } from "../../mappers/details/details.mapper";
import { AnimeDetails } from "@/features/anime/types/anime-details";

export async function getAnimeDetails(id: string | number): Promise<AnimeDetails | null> {
  try {
    const data = await graphqlClient.request(DETAILS_QUERY, { id: Number(id) });
    return mapAnimeDetails(data);
  } catch (error) {
    console.error("Failed to fetch anime details:", error);
    return null;
  }
}
