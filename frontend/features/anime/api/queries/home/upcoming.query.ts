import { gql } from "graphql-request";
import { SECTION_MEDIA_FIELDS } from "./section-media.fragment";

export const UPCOMING_ANIME_QUERY = gql`
  query UpcomingAnime {
    Page(page: 1, perPage: 25) {
      media(
        type: ANIME
        status: NOT_YET_RELEASED
        sort: POPULARITY_DESC
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        ${SECTION_MEDIA_FIELDS}
      }
    }
  }
`;
