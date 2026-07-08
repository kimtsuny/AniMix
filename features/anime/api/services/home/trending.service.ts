import { graphqlClient } from "@/shared/api/graphql-client";
import { TRENDING_ANIME_QUERY } from "../../queries/home/trending.query";
import type { TrendingAnime } from "../../../types/trending";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";

export async function getTrendingAnime(): Promise<TrendingAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    TRENDING_ANIME_QUERY
  );

  return response.Page.media.map(mapSectionAnime);
}
