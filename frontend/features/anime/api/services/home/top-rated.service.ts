import { graphqlClient } from "@/shared/api/graphql-client";
import { TOP_RATED_ANIME_QUERY } from "../../queries/home/top-rated.query";
import type { TopRatedAnime } from "../../../types/top-rated";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

export async function getTopRatedAnime(): Promise<TopRatedAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    TOP_RATED_ANIME_QUERY
  );

  return filterAllowedAnime(response.Page.media).slice(0, 20).map(mapSectionAnime);
}
