export const EPISODES_QUERY = `
  query AnimeEpisodes($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
    }
  }
`;
