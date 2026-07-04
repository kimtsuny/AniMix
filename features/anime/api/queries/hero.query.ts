import { gql } from "graphql-request";

export const HERO_ANIME_QUERY = gql`
  query HeroAnime {
    Page(page: 1, perPage: 5) {
      media(
        type: ANIME
        sort: POPULARITY_DESC
      ) {
        id

        title {
          english
          romaji
        }

        bannerImage

        coverImage {
          extraLarge
        }

        averageScore

        seasonYear

        format

        episodes

        duration

        genres

        description(asHtml: false)

        trailer {
          id
          site
        }
      }
    }
  }
`;