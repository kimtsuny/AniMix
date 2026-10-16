import { graphqlClient } from "@/shared/api/graphql-client";
import { TRENDING_ANIME_QUERY } from "../../queries/home/trending.query";
import type { TrendingAnime } from "../../../types/trending";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

export async function getTrendingAnime(): Promise<TrendingAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    TRENDING_ANIME_QUERY
  );

  return filterAllowedAnime(response.Page.media).slice(0, 20).map(mapSectionAnime);
}
