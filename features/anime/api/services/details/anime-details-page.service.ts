import { graphqlClient } from "@/shared/api/graphql-client";
import { ANIME_DETAILS_PAGE_QUERY } from "../../queries/details/anime-details-page.query";
import { mapAnimeDetails } from "../../mappers/details/details.mapper";
import { mapCharacters } from "../../mappers/details/character.mapper";
import { mapStaff } from "../../mappers/details/staff.mapper";
import { mapRelations } from "../../mappers/details/relation.mapper";
import { mapRecommendations } from "../../mappers/details/recommendation.mapper";
import { mapSeasons } from "../../mappers/details/seasons.mapper";

import { AnimeDetails } from "@/features/anime/types/anime-details";
import { Character } from "@/features/anime/types/character";
import { Staff } from "@/features/anime/types/staff";
import { Relation } from "@/features/anime/types/relation";
import { Recommendation } from "@/features/anime/types/recommendation";

export interface AnimeDetailsPageData {
  details: AnimeDetails | null;
  characters: Character[];
  staff: Staff[];
  relations: Relation[];
  recommendations: Recommendation[];
  seasons: Relation[];
}

export async function getAnimeDetailsPage(id: string | number): Promise<AnimeDetailsPageData | null> {
  try {
    const data = await graphqlClient.request(ANIME_DETAILS_PAGE_QUERY, { id: Number(id) });
    
    if (!data || !data.Media) {
      return null;
    }

    const details = mapAnimeDetails(data);

    return {
      details,
      characters: mapCharacters(data),
      staff: mapStaff(data),
      relations: mapRelations(data),
      recommendations: mapRecommendations(data),
      seasons: mapSeasons(data, details),
    };
  } catch (error) {
    console.error("Failed to fetch anime details page data:", error);
    return null;
  }
}
