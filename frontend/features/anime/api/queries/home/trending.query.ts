import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const TRENDING_ANIME_QUERY = gql`
  query TrendingAnime {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
