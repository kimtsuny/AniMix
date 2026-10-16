import { graphqlClient } from "@/shared/api/graphql-client";
import { SEASON_ANIME_QUERY } from "../../queries/home/season.query";
import type { SeasonAnime } from "../../../types/season";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

type SeasonAnimeVariables = {
  season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  seasonYear: number;
};

export async function getSeasonAnime({
  season,
  seasonYear,
}: SeasonAnimeVariables): Promise<SeasonAnime[]> {
  const response = await graphqlClient.request<SectionMediaResponse>(
    SEASON_ANIME_QUERY,
    {
      season,
      seasonYear,
    }
  );

  return filterAllowedAnime(response.Page.media).slice(0, 20).map(mapSectionAnime);
}
