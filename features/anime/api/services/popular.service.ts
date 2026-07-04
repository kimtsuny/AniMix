import { graphqlClient } from "@/shared/api/graphql-client";
import { POPULAR_ANIME_QUERY } from "../queries/popular.query";
import type { PopularAnime } from "../../types/popular";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";

export async function getPopularAnime(): Promise<PopularAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    POPULAR_ANIME_QUERY
  );

  return response.Page.media.map(mapSectionAnime);
}
