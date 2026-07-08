export const DETAILS_QUERY = `
  query AnimeDetails($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      title {
        english
        romaji
        native
      }
      description
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      averageScore
      meanScore
      rankings {
        rank
        type
        allTime
      }
      popularity
      favourites
      format
      status
      episodes
      duration
      season
      seasonYear
      genres
      source
      countryOfOrigin
      studios(isMain: true) {
        nodes {
          name
        }
      }
      trailer {
        id
        site
        thumbnail
      }
    }
  }
`;