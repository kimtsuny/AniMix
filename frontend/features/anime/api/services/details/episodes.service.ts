import { graphqlClient } from "@/shared/api/graphql-client";
import { EPISODES_QUERY } from "../../queries/details/episodes.query";
import { mapEpisodes } from "../../mappers/details/episode.mapper";
import { Episode } from "@/features/anime/types/episode";

export async function getAnimeEpisodes(id: string | number): Promise<Episode[]> {
  try {
    const data = await graphqlClient.request(EPISODES_QUERY, { id: Number(id) });
    return mapEpisodes(data);
  } catch (error) {
    console.error("Failed to fetch anime episodes:", error);
    return [];
  }
}
