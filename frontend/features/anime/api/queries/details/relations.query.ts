export const RELATIONS_QUERY = `
  query AnimeRelations($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      isAdult
      genres
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
`;
