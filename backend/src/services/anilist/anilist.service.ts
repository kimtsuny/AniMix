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

      streamingEpisodes {
        title
        thumbnail
      }

      episodes
      duration
      format
      status
      season
      seasonYear
      startDate {
        year
        month
        day
      }
      synonyms
      genres

      relations {
        edges {
          relationType
          node {
            id
            type
            format
            status
            seasonYear
            startDate {
              year
            }
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

const ANIME_BASIC_BY_ID_QUERY = `
  query AnimeBasicById($id: Int!) {
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
      startDate {
        year
        month
        day
      }
      synonyms
      genres

      relations {
        edges {
          relationType
          node {
            id
            type
            format
            status
            seasonYear
            startDate {
              year
            }
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

export interface AniListRelationNode {
  id: number;
  type: string;
  format: string | null;
  status?: string | null;
  seasonYear?: number | null;
  startDate?: {
    year: number | null;
  } | null;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
}

export interface AniListRelation {
  relationType: string;
  node: AniListRelationNode;
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

  streamingEpisodes?: Array<{
    title: string | null;
    thumbnail: string | null;
  }> | null;

  episodes: number | null;
  duration: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  startDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  synonyms?: string[];
  genres: string[];

  relations: {
    edges: AniListRelation[];
  };
}

// In-memory cache for AniList responses (5-minute TTL)
interface CachedEntry<T> {
  data: T;
  timestamp: number;
}
const CACHE_TTL_MS = 5 * 60 * 1000;
const animeCache = new Map<number, CachedEntry<AniListAnime>>();
const animeBasicCache = new Map<number, CachedEntry<AniListAnime>>();

// In-flight request deduplication maps
const inFlightRequests = new Map<number, Promise<AniListAnime>>();
const inFlightBasicRequests = new Map<number, Promise<AniListAnime>>();

async function fetchFromAniList(query: string, variables: { id: number }): Promise<AniListAnime> {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
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
      `Anime with AniList ID ${variables.id} was not found`
    );
  }

  return result.data.Media;
}

/**
 * Fetches lightweight basic anime metadata without heavy streamingEpisodes payload.
 * Deduplicates concurrent calls and caches results in memory.
 */
export async function getAnimeBasicById(
  anilistId: number
): Promise<AniListAnime> {
  const now = Date.now();
  const cached = animeBasicCache.get(anilistId) ?? animeCache.get(anilistId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const existingInFlight = inFlightBasicRequests.get(anilistId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    try {
      const data = await fetchFromAniList(ANIME_BASIC_BY_ID_QUERY, { id: anilistId });
      animeBasicCache.set(anilistId, { data, timestamp: Date.now() });
      return data;
    } finally {
      inFlightBasicRequests.delete(anilistId);
    }
  })();

  inFlightBasicRequests.set(anilistId, promise);
  return promise;
}

/**
 * Fetches complete anime metadata including streamingEpisodes and relations.
 * Deduplicates concurrent calls and caches results in memory.
 */
export async function getAnimeById(
  anilistId: number
): Promise<AniListAnime> {
  const now = Date.now();
  const cached = animeCache.get(anilistId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const existingInFlight = inFlightRequests.get(anilistId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    try {
      const data = await fetchFromAniList(ANIME_BY_ID_QUERY, { id: anilistId });
      animeCache.set(anilistId, { data, timestamp: Date.now() });
      // Also prime basic cache
      animeBasicCache.set(anilistId, { data, timestamp: Date.now() });
      return data;
    } finally {
      inFlightRequests.delete(anilistId);
    }
  })();

  inFlightRequests.set(anilistId, promise);
  return promise;
}