export const STAFF_QUERY = `
  query AnimeStaff($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
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
    }
  }
`;
