export const RECOMMENDATIONS_QUERY = `
  query AnimeRecommendations($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      recommendations(sort: [RATING_DESC], perPage: 15) {
        nodes {
          rating
          mediaRecommendation {
            id
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
    }
  }
`;
