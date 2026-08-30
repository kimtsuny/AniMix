export const FAVORITES_ANIME_QUERY = `
  query FavoritesAnime($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id

        title {
          english
          romaji
        }

        coverImage {
          large
        }

        seasonYear
        format
        averageScore
        episodes
        genres
      }
    }
  }
`;