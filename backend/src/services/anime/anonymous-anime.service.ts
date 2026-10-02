import {
  discoverFranchiseStructure,
  discoverCandidatesForSeason,
  planSeasonFromCandidates,
  type PlannedSeason,
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
}

export interface AnonymousSeasonDetail {
  id: null;
  number: number;
  title: string;
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

/**
 * Resolves anime catalog data, seasons, and episodes on-the-fly for anonymous visitors.
 *
 * CRITICAL ARCHITECTURE RULES:
 * - NO database reads (no Anime, AnimeSeason, Episode, or Mapping lookups)
 * - NO database writes (no upserts, inserts, or updates)
 * - NO caches (no Redis, memory Maps, TTL, LRU, or request cache)
 * - Full fresh resolution from AniList metadata & AniKoto/AnimeParadise providers
 */
export async function resolveAnonymousSeasonEpisodes(
  anilistId: number,
  seasonNumber: number
): Promise<AnonymousAnimeResult | null> {
  // 1. Fresh franchise discovery via AniList relation graph
  const franchiseStructure = await discoverFranchiseStructure(anilistId);

  if (!franchiseStructure || franchiseStructure.logicalGroups.length === 0) {
    return null;
  }

  // 2. Identify the requested logical season
  const targetGroup = franchiseStructure.logicalGroups.find(
    (g) => g.logicalSeasonNumber === seasonNumber
  );

  if (!targetGroup) {
    return null;
  }

  // 3. Discover candidates and plan season (AniKoto primary, AnimeParadise emergency fallback)
  const anikotoCandidates = await discoverCandidatesForSeason(
    targetGroup,
    franchiseStructure.rootAnime,
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
      franchiseStructure.rootAnime,
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

  // 6. Build freshly discovered franchise season list
  const seasons: AnonymousSeasonSummary[] = franchiseStructure.logicalGroups.map(
    (group) => {
      let epCount = group.primaryAnilistAnime.episodes ?? 0;
      if (group.logicalSeasonNumber === seasonNumber) {
        epCount = episodes.length > 0 ? episodes.length : epCount;
      }
      return {
        id: null,
        number: group.logicalSeasonNumber,
        title: group.displayTitle,
        episodeCount: epCount,
      };
    }
  );

  const root = franchiseStructure.rootAnime;
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
      episodes,
    },
  };
}
