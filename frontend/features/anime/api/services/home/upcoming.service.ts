import { graphqlClient } from "@/shared/api/graphql-client";
import { UPCOMING_ANIME_QUERY } from "../../queries/home/upcoming.query";
import type { UpcomingAnime } from "../../../types/upcoming";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

export async function getUpcomingAnime(): Promise<UpcomingAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    UPCOMING_ANIME_QUERY
  );

  return filterAllowedAnime(response.Page.media).slice(0, 20).map(mapSectionAnime);
}
