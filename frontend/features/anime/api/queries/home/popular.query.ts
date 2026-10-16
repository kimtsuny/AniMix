import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const POPULAR_ANIME_QUERY = gql`
  query PopularAnime {
    Page(page: 1, perPage: 25) {
      media(
        type: ANIME
        sort: POPULARITY_DESC
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
