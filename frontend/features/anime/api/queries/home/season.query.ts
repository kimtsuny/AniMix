import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const SEASON_ANIME_QUERY = gql`
  query SeasonAnime($season: MediaSeason!, $seasonYear: Int!) {
    Page(page: 1, perPage: 25) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
