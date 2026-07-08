import { graphqlClient } from "@/shared/api/graphql-client";
import { RECOMMENDATIONS_QUERY } from "../../queries/details/recommendations.query";
import { mapRecommendations } from "../../mappers/details/recommendation.mapper";
import { Recommendation } from "@/features/anime/types/recommendation";

export async function getAnimeRecommendations(id: string | number): Promise<Recommendation[]> {
  try {
    const data = await graphqlClient.request(RECOMMENDATIONS_QUERY, { id: Number(id) });
    return mapRecommendations(data);
  } catch (error) {
    console.error("Failed to fetch anime recommendations:", error);
    return [];
  }
}
