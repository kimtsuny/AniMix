const ANILIST_API_URL = "https://graphql.anilist.co";

const ANIME_BY_ID_QUERY = `
  query AnimeById($id: Int!) {
    Media(id: $id, type: ANIME) {
      id

      title {
        english
        romaji
        native
      }

      description

      coverImage {
        extraLarge
        large
      }

      bannerImage

      episodes
      duration
      format
      status
      season
      seasonYear
      genres

      relations {
        edges {
          relationType
          node {
            id
            type
            format
            title {
              english
              romaji
              native
            }
          }
        }
      }
    }
  }
`;

export interface AniListRelation {
  relationType: string;

  node: {
    id: number;
    type: string;
    format: string | null;

    title: {
      english: string | null;
      romaji: string | null;
      native: string | null;
    };
  };
}

export interface AniListAnime {
  id: number;

  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };

  description: string | null;

  coverImage: {
    extraLarge: string | null;
    large: string | null;
  };

  bannerImage: string | null;

  episodes: number | null;
  duration: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];

  relations: {
    edges: AniListRelation[];
  };
}

export async function getAnimeById(
  anilistId: number
): Promise<AniListAnime> {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },

    body: JSON.stringify({
      query: ANIME_BY_ID_QUERY,
      variables: {
        id: anilistId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList request failed: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(
      result.errors[0]?.message ?? "AniList returned an error"
    );
  }

  if (!result.data?.Media) {
    throw new Error(
      `Anime with AniList ID ${anilistId} was not found`
    );
  }

  return result.data.Media;
}