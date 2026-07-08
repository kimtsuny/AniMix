export const RELATIONS_QUERY = `
  query AnimeRelations($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      relations {
        edges {
          relationType(version: 2)
          node {
            id
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
