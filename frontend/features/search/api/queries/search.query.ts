import { gql } from "graphql-request";

export const SEARCH_ANIME_QUERY = gql`
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
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
