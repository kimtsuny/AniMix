import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const TOP_RATED_ANIME_QUERY = gql`
  query TopRatedAnime {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: SCORE_DESC) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
