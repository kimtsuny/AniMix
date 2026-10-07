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

const ANIME_BASIC_BATCH_QUERY = `
  query AnimeBasicBatch($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
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

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

async function fetchFromAniListBatch(
  query: string,
  variables: { ids: number[] }
): Promise<AniListAnime[]> {
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

  if (result.data?.Page?.media) {
    return result.data.Page.media;
  }

  if (result.data?.Media) {
    return [result.data.Media];
  }

  return [];
}

/**
 * Fetches basic metadata for multiple anime IDs in a single batch GraphQL request.
 * Integrates with cache, deduplicates input IDs, and coordinates with in-flight requests.
 */
export async function getAnimeBasicByIds(
  ids: number[]
): Promise<AniListAnime[]> {
  if (!ids || ids.length === 0) return [];

  // Deduplicate requested IDs preserving input order
  const uniqueIds: number[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  const now = Date.now();
  const resultsMap = new Map<number, AniListAnime>();
  const uncachedIds: number[] = [];

  for (const id of uniqueIds) {
    const cached = animeBasicCache.get(id) ?? animeCache.get(id);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      resultsMap.set(id, cached.data);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return uniqueIds
      .map((id) => resultsMap.get(id)!)
      .filter(Boolean);
  }

  const inFlightPromises: Array<{ id: number; promise: Promise<AniListAnime> }> = [];
  const idsToFetch: number[] = [];
  const deferredMap = new Map<number, Deferred<AniListAnime>>();

  for (const id of uncachedIds) {
    const inFlight = inFlightBasicRequests.get(id) ?? inFlightRequests.get(id);
    if (inFlight) {
      inFlightPromises.push({ id, promise: inFlight });
    } else {
      idsToFetch.push(id);
      const deferred = createDeferred<AniListAnime>();
      deferredMap.set(id, deferred);
      inFlightBasicRequests.set(id, deferred.promise);
    }
  }

  let batchFetchPromise: Promise<void> | null = null;
  if (idsToFetch.length > 0) {
    batchFetchPromise = (async () => {
      try {
        const batchMedia = await fetchFromAniListBatch(
          ANIME_BASIC_BATCH_QUERY,
          { ids: idsToFetch }
        );
        const fetchTime = Date.now();
        const mediaMap = new Map<number, AniListAnime>();
        for (const anime of batchMedia) {
          animeBasicCache.set(anime.id, { data: anime, timestamp: fetchTime });
          mediaMap.set(anime.id, anime);
        }
        for (const id of idsToFetch) {
          const deferred = deferredMap.get(id);
          const anime = mediaMap.get(id);
          if (anime) {
            resultsMap.set(id, anime);
            deferred?.resolve(anime);
          } else {
            deferred?.reject(
              new Error(`Anime with AniList ID ${id} was not found`)
            );
          }
        }
      } catch (err) {
        for (const id of idsToFetch) {
          deferredMap.get(id)?.reject(err);
        }
        throw err;
      } finally {
        for (const id of idsToFetch) {
          inFlightBasicRequests.delete(id);
        }
      }
    })();
  }

  const promisesToWait: Promise<any>[] = [];
  if (batchFetchPromise) promisesToWait.push(batchFetchPromise);
  for (const { id, promise } of inFlightPromises) {
    promisesToWait.push(
      promise
        .then((anime) => {
          resultsMap.set(id, anime);
        })
        .catch(() => {
          // Individual in-flight failure handled gracefully
        })
    );
  }

  try {
    await Promise.all(promisesToWait);
  } catch (err) {
    if (resultsMap.size === 0 && idsToFetch.length > 0) {
      throw err;
    }
  }

  return uniqueIds
    .map((id) => resultsMap.get(id))
    .filter((a): a is AniListAnime => Boolean(a));
}

/**
 * Fetches lightweight basic anime metadata without heavy streamingEpisodes payload.
 * Deduplicates concurrent calls and caches results in memory.
 */
export async function getAnimeBasicById(
  anilistId: number
): Promise<AniListAnime> {
  const [anime] = await getAnimeBasicByIds([anilistId]);
  if (!anime) {
    throw new Error(`Anime with AniList ID ${anilistId} was not found`);
  }
  return anime;
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