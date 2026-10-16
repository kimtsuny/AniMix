import { gql } from "graphql-request";

export const SEARCH_ANIME_QUERY = gql`
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 15) {
      media(
        search: $search
        type: ANIME
        sort: POPULARITY_DESC
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        id
        isAdult
        title {
          romaji
          english
          native
        }
        coverImage {
          large
        }
        bannerImage
        episodes
        format
        status
        averageScore
        season
        seasonYear
        genres
        description(asHtml: false)
      }
    }
  }
`;
