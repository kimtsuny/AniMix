import { graphqlClient } from "@/shared/api/graphql-client";
import { SEASON_ANIME_QUERY } from "../queries/season.query";
import type { SeasonAnime } from "../../types/season";
import { mapSectionAnime, type SectionMediaResponse } from "./map-section-anime";

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

  return response.Page.media.map(mapSectionAnime);
}
