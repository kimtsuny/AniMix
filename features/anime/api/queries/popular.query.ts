import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const POPULAR_ANIME_QUERY = gql`
  query PopularAnime {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
