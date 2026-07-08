import { graphqlClient } from "@/shared/api/graphql-client";
import { TOP_RATED_ANIME_QUERY } from "../../queries/home/top-rated.query";
import type { TopRatedAnime } from "../../../types/top-rated";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";

export async function getTopRatedAnime(): Promise<TopRatedAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    TOP_RATED_ANIME_QUERY
  );

  return response.Page.media.map(mapSectionAnime);
}
