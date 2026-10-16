export const FAVORITES_ANIME_QUERY = `
  query FavoritesAnime($ids: [Int]) {
    Page(perPage: 50) {
      media(
        id_in: $ids
        type: ANIME
        isAdult: false
        genre_not_in: ["Ecchi", "Harem"]
      ) {
        id
        isAdult

        title {
          english
          romaji
        }

        coverImage {
          extraLarge
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