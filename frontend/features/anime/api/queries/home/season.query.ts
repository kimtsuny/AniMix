import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const SEASON_ANIME_QUERY = gql`
  query SeasonAnime($season: MediaSeason!, $seasonYear: Int!) {
    Page(page: 1, perPage: 20) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
      ) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
