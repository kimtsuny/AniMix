import { graphqlClient } from "@/shared/api/graphql-client";
import { POPULAR_ANIME_QUERY } from "../../queries/home/popular.query";
import type { PopularAnime } from "../../../types/popular";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

export async function getPopularAnime(): Promise<PopularAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    POPULAR_ANIME_QUERY
  );

  return filterAllowedAnime(response.Page.media).slice(0, 20).map(mapSectionAnime);
}
