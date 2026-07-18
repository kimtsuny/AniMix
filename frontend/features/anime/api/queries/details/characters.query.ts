export const CHARACTERS_QUERY = `
  query AnimeCharacters($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
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
    }
  }
`;
