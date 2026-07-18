import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const UPCOMING_ANIME_QUERY = gql`
  query UpcomingAnime {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
