export const ANIME_DETAILS_PAGE_QUERY = `
  query AnimeDetailsPage($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      isAdult
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
      characters(sort: [ROLE, RELEVANCE], perPage: 15) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
      staff(sort: [RELEVANCE], perPage: 15) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
            primaryOccupations
          }
        }
      }
      recommendations(sort: [RATING_DESC], perPage: 25) {
        nodes {
          rating
          mediaRecommendation {
            id
            isAdult
            genres
            title {
              english
              romaji
            }
            coverImage {
              large
            }
            episodes
            format
          }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            isAdult
            genres
            type
            title {
              english
              romaji
            }
            coverImage {
              large
            }
            format
            status
            startDate {
              year
              month
              day
            }
            relations {
              edges {
                relationType(version: 2)
                node {
                  id
                  isAdult
                  genres
                  title {
                    english
                    romaji
                  }
                  coverImage {
                    large
                  }
                  format
                  status
                  startDate {
                    year
                    month
                    day
                  }
                  relations {
                    edges {
                      relationType(version: 2)
                      node {
                        id
                        isAdult
                        genres
                        title {
                          english
                          romaji
                        }
                        coverImage {
                          large
                        }
                        format
                        status
                        startDate {
                          year
                          month
                          day
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
