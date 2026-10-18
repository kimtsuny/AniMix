import {
  resolveBoundedSeriesStructure,
  discoverCandidatesForSeason,
  planSeasonFromCandidates,
  type PlannedSeason,
  type BoundedSeriesStructure,
  type LogicalSeasonDefinition,
} from "./mapping/phase3-planner.js";
import { parseEpisodeNumberFromTitle } from "./episode.service.js";

export interface AnonymousEpisode {
  id: null;
  number: number;
  title: string;
  thumbnail: string | null;
  provider: string;
  providerId: string;
}

export interface AnonymousSeasonSummary {
  id: null;
  number: number;
  title: string;
  episodeCount: number;
  anilistId: number;
  anilistIds?: number[];
}

export interface AnonymousSeasonDetail {
  id: null;
  number: number;
  title: string;
  anilistId?: number;
  episodes: AnonymousEpisode[];
}

export interface AnonymousAnimeResult {
  anime: {
    id: null;
    anilistId: number;
    title: string;
    description: string | null;
    coverImage: string | null;
    bannerImage: string | null;
  };
  seasons: AnonymousSeasonSummary[];
  season: AnonymousSeasonDetail;
}

export interface AnonymousSeasonsMetadata {
  rootAnimeId: number;
  requestedSeasonNumber: number;
  anime: {
    id: null;
    anilistId: number;
    title: string;
    description: string | null;
    coverImage: string | null;
    bannerImage: string | null;
  };
  seasons: AnonymousSeasonSummary[];
}

// Bounded in-memory TTL cache for lightweight series structures
interface CachedSeriesStructure {
  data: BoundedSeriesStructure;
  timestamp: number;
}
const seriesStructureCache = new Map<number, CachedSeriesStructure>();
const STRUCTURE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_STRUCTURE_CACHE_ENTRIES = 500;
const inFlightSeriesStructures = new Map<
  number,
  Promise<BoundedSeriesStructure | null>
>();

// Bounded in-memory TTL cache for anonymous season episode results
interface CachedAnonymousResult {
  data: AnonymousAnimeResult;
  timestamp: number;
}
const anonymousResultCache = new Map<string, CachedAnonymousResult>();
const ANONYMOUS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ANONYMOUS_CACHE_ENTRIES = 500;

// Periodic cleanup timer every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of seriesStructureCache.entries()) {
    if (now - item.timestamp > STRUCTURE_CACHE_TTL_MS) {
      seriesStructureCache.delete(id);
    }
  }
  for (const [key, item] of anonymousResultCache.entries()) {
    if (now - item.timestamp > ANONYMOUS_CACHE_TTL_MS) {
      anonymousResultCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

async function getCachedBoundedSeriesStructure(
  anilistId: number
): Promise<BoundedSeriesStructure | null> {
  const now = Date.now();
  const cached = seriesStructureCache.get(anilistId);
  if (cached && now - cached.timestamp < STRUCTURE_CACHE_TTL_MS) {
    return cached.data;
  }

  const existingInFlight = inFlightSeriesStructures.get(anilistId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    try {
      const structure = await resolveBoundedSeriesStructure(anilistId);
      if (structure) {
        if (seriesStructureCache.size >= MAX_STRUCTURE_CACHE_ENTRIES) {
          const firstKey = seriesStructureCache.keys().next().value;
          if (firstKey !== undefined) seriesStructureCache.delete(firstKey);
        }
        seriesStructureCache.set(anilistId, {
          data: structure,
          timestamp: Date.now(),
        });
      }
      return structure;
    } finally {
      inFlightSeriesStructures.delete(anilistId);
    }
  })();

  inFlightSeriesStructures.set(anilistId, promise);
  return promise;
}

/**
 * Resolves lightweight seasons metadata on-the-fly for anonymous visitors.
 * Fast, bounded AniList relations lookup with zero provider episode discovery.
 */
export async function resolveAnonymousSeasons(
  anilistId: number
): Promise<AnonymousSeasonsMetadata | null> {
  const seriesStructure = await getCachedBoundedSeriesStructure(anilistId);
  if (!seriesStructure || seriesStructure.logicalGroups.length === 0) {
    return null;
  }

  const root = seriesStructure.seriesRootAnime;
  const rootTitle =
    root.title.english ?? root.title.romaji ?? root.title.native ?? "";
  const rootXl = root.coverImage?.extraLarge?.trim();
  const rootLg = root.coverImage?.large?.trim();
  const rootCover =
    (rootXl && rootXl.length > 0 ? rootXl : null) ??
    (rootLg && rootLg.length > 0 ? rootLg : null);

  const seasons: AnonymousSeasonSummary[] = seriesStructure.logicalGroups.map(
    (group: LogicalSeasonDefinition) => ({
      id: null,
      number: group.logicalSeasonNumber,
      title: group.displayTitle,
      episodeCount: group.primaryAnilistAnime.episodes ?? 0,
      anilistId: group.primaryAnilistAnime.id,
      anilistIds: [
        group.primaryAnilistAnime.id,
        ...group.relatedAnilistEntries.map((e) => e.id),
      ],
    })
  );

  return {
    rootAnimeId: root.id,
    requestedSeasonNumber: seriesStructure.requestedSeasonNumber,
    anime: {
      id: null,
      anilistId: root.id,
      title: rootTitle,
      description: root.description ?? null,
      coverImage: rootCover,
      bannerImage: root.bannerImage ?? null,
    },
    seasons,
  };
}

// In-flight request deduplication to prevent duplicate upstream requests for concurrent visitors
const inFlightAnonymousResolutions = new Map<
  string,
  Promise<AnonymousAnimeResult | null>
>();

/**
 * Resolves anime catalog data, seasons, and episodes on-the-fly for anonymous visitors.
 *
 * CRITICAL ARCHITECTURE RULES:
 * - NO database reads (no Anime, AnimeSeason, Episode, or Mapping lookups)
 * - NO database writes (no upserts, inserts, or updates)
 * - NO persistent caching of catalog
 * - Request deduplication for simultaneous in-flight visitors
 * - Bounded series resolution: only resolves genuine seasons of the requested logical series
 */
export async function resolveAnonymousSeasonEpisodes(
  anilistId: number,
  seasonNumber: number
): Promise<AnonymousAnimeResult | null> {
  const cacheKey = `${anilistId}:${seasonNumber}`;

  // Check TTL cache
  const cached = anonymousResultCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ANONYMOUS_CACHE_TTL_MS) {
    // Return cloned object to protect against mutable modifications
    return JSON.parse(JSON.stringify(cached.data));
  }

  const existing = inFlightAnonymousResolutions.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const result = await doResolveAnonymousSeasonEpisodes(
        anilistId,
        seasonNumber
      );
      if (result) {
        if (anonymousResultCache.size >= MAX_ANONYMOUS_CACHE_ENTRIES) {
          const firstKey = anonymousResultCache.keys().next().value;
          if (firstKey !== undefined) anonymousResultCache.delete(firstKey);
        }
        anonymousResultCache.set(cacheKey, {
          data: JSON.parse(JSON.stringify(result)),
          timestamp: Date.now(),
        });
      }
      return result;
    } finally {
      inFlightAnonymousResolutions.delete(cacheKey);
    }
  })();

  inFlightAnonymousResolutions.set(cacheKey, promise);
  return promise;
}

async function doResolveAnonymousSeasonEpisodes(
  anilistId: number,
  seasonNumber: number
): Promise<AnonymousAnimeResult | null> {
  // 1. Bounded series resolution (AniList relation graph bounded to genuine seasons)
  const seriesStructure = await getCachedBoundedSeriesStructure(anilistId);

  if (!seriesStructure || seriesStructure.logicalGroups.length === 0) {
    return null;
  }

  // 2. Identify the requested logical season
  let targetGroup =
    seasonNumber > 0
      ? seriesStructure.logicalGroups.find(
          (g) => g.logicalSeasonNumber === seasonNumber
        )
      : undefined;

  if (!targetGroup) {
    targetGroup = seriesStructure.logicalGroups.find(
      (g) =>
        g.primaryAnilistAnime.id === seriesStructure.requestedAnime.id ||
        g.relatedAnilistEntries.some(
          (e) => e.id === seriesStructure.requestedAnime.id
        )
    );
  }

  if (!targetGroup) {
    targetGroup = seriesStructure.logicalGroups[0];
  }

  if (!targetGroup) {
    return null;
  }

  // 3. Discover candidates and plan season (AniKoto primary, AnimeParadise emergency fallback)
  const anikotoCandidates = await discoverCandidatesForSeason(
    targetGroup,
    seriesStructure.seriesRootAnime,
    "anikoto"
  );

  let plannedSeason: PlannedSeason = await planSeasonFromCandidates(
    targetGroup,
    anikotoCandidates
  );

  if (plannedSeason.parts.length === 0) {
    console.log(
      `[Anonymous Anime] AniKoto yielded 0 parts for season ${seasonNumber}. Falling back to AnimeParadise...`
    );
    const apCandidates = await discoverCandidatesForSeason(
      targetGroup,
      seriesStructure.seriesRootAnime,
      "animeparadise"
    );
    plannedSeason = await planSeasonFromCandidates(targetGroup, apCandidates);
  }

  // 4. Resolve thumbnails according to the rule:
  //    1. AniList streamingEpisodes[].thumbnail for matching episode number
  //    2. AniList coverImage.extraLarge
  //    3. AniList coverImage.large
  //    4. null
  const targetAnime = targetGroup.primaryAnilistAnime;
  const xl = targetAnime.coverImage?.extraLarge?.trim();
  const lg = targetAnime.coverImage?.large?.trim();
  const coverFallback =
    (xl && xl.length > 0 ? xl : null) ?? (lg && lg.length > 0 ? lg : null);

  const thumbnailMap = new Map<number, string>();

  const relatedEntries =
    targetGroup.relatedAnilistEntries.length > 0
      ? targetGroup.relatedAnilistEntries
      : [targetAnime];

  for (const entry of relatedEntries) {
    if (entry.streamingEpisodes) {
      for (const streamingEp of entry.streamingEpisodes) {
        const thumb = streamingEp.thumbnail?.trim();
        if (thumb && thumb.length > 0) {
          const epNum = parseEpisodeNumberFromTitle(streamingEp.title);
          if (epNum !== null && !thumbnailMap.has(epNum)) {
            thumbnailMap.set(epNum, thumb);
          }
        }
      }
    }
  }

  // 5. Construct episodes list from planned parts
  const episodes: AnonymousEpisode[] = [];

  for (const part of plannedSeason.parts) {
    for (const ep of part.episodes) {
      const thumb =
        thumbnailMap.get(ep.logicalNumber) ??
        thumbnailMap.get(ep.providerNumber) ??
        coverFallback ??
        null;

      episodes.push({
        id: null,
        number: ep.logicalNumber,
        title: ep.title,
        thumbnail: thumb,
        provider: part.provider,
        providerId: ep.id,
      });
    }
  }

  episodes.sort((a, b) => a.number - b.number);

  // 6. Build genuine series seasons list
  const seasons: AnonymousSeasonSummary[] = seriesStructure.logicalGroups.map(
    (group) => {
      let epCount = group.primaryAnilistAnime.episodes ?? 0;
      if (group.logicalSeasonNumber === targetGroup.logicalSeasonNumber) {
        epCount = episodes.length > 0 ? episodes.length : epCount;
      }
      return {
        id: null,
        number: group.logicalSeasonNumber,
        title: group.displayTitle,
        episodeCount: epCount,
        anilistId: group.primaryAnilistAnime.id,
        anilistIds: [
          group.primaryAnilistAnime.id,
          ...group.relatedAnilistEntries.map((e) => e.id),
        ],
      };
    }
  );

  const root = seriesStructure.seriesRootAnime;
  const rootTitle =
    root.title.english ?? root.title.romaji ?? root.title.native ?? "";
  const rootXl = root.coverImage?.extraLarge?.trim();
  const rootLg = root.coverImage?.large?.trim();
  const rootCover =
    (rootXl && rootXl.length > 0 ? rootXl : null) ??
    (rootLg && rootLg.length > 0 ? rootLg : null);

  return {
    anime: {
      id: null,
      anilistId: root.id,
      title: rootTitle,
      description: root.description ?? null,
      coverImage: rootCover,
      bannerImage: root.bannerImage ?? null,
    },
    seasons,
    season: {
      id: null,
      number: targetGroup.logicalSeasonNumber,
      title: targetGroup.displayTitle,
      anilistId: targetGroup.primaryAnilistAnime.id,
      episodes,
    },
  };
}
