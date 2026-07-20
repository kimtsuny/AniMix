import type { SearchAnime } from "../types/search.types";

const searchCache = new Map<string, SearchAnime[]>();

export const searchCacheUtils = {
  get: (key: string) => searchCache.get(key),
  set: (key: string, data: SearchAnime[]) => searchCache.set(key, data),
  has: (key: string) => searchCache.has(key),
  clear: () => searchCache.clear(),
};
