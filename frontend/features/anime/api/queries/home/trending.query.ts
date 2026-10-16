import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const TRENDING_ANIME_QUERY = gql`
  query TrendingAnime {
    Page(page: 1, perPage: 25) {
      media(
        type: ANIME
        sort: TRENDING_DESC
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
