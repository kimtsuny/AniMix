import { graphqlClient } from "@/shared/api/graphql-client";
import { UPCOMING_ANIME_QUERY } from "../../queries/home/upcoming.query";
import type { UpcomingAnime } from "../../../types/upcoming";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";

export async function getUpcomingAnime(): Promise<UpcomingAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    UPCOMING_ANIME_QUERY
  );

  return response.Page.media.map(mapSectionAnime);
}
