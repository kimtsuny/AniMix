export const RECOMMENDATIONS_QUERY = `
  query AnimeRecommendations($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      isAdult
      genres
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
            averageScore
            season
            seasonYear
            startDate {
              year
            }
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
            episodes
            averageScore
            season
            seasonYear
            startDate {
              year
            }
          }
        }
      }
    }
  }
`;

