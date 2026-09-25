import prisma from "../../../config/prisma.js";
import {
  planFranchiseMapping,
  discoverFranchiseStructure,
  planSingleSeason,
  type PlannedSeason,
  type FranchisePlan,
} from "./phase3-planner.js";
import { syncSeasonEpisodes } from "../episode.service.js";

export interface PersistResult {
  anime: any;
  requestedAnime: {
    anilistId: number;
    title: string | null;
    season: number;
  };
  seasons: any[];
  mappingsCreatedOrUpdated: number;
  episodesSynced: number;
  conflicts: string[];
}

/**
 * Persists provider parts and synchronizes episodes for a single planned season.
 */
export async function persistSeasonPartsAndSync(
  dbAnimeId: number,
  plannedSeason: PlannedSeason
): Promise<{
  dbSeason: any;
  mappingsCount: number;
  episodesSynced: number;
  conflicts: string[];
}> {
  console.log(
    `[Anime Mapping] Persisting season: anilistId=${plannedSeason.anilistId} number=${plannedSeason.seasonNumber} title="${plannedSeason.title}"`
  );

  const primaryPart =
    plannedSeason.parts.length > 0 ? plannedSeason.parts[0] : null;

  // Upsert AnimeSeason - guarantee every logical season exists in DB
  const dbSeason = await prisma.animeSeason.upsert({
    where: {
      animeId_number: {
        animeId: dbAnimeId,
        number: plannedSeason.seasonNumber,
      },
    },
    update: {
      title: plannedSeason.title,
      anilistId: plannedSeason.anilistId,
      provider: primaryPart?.provider ?? (plannedSeason.parts.length === 0 ? "not_available" : null),
      providerId: primaryPart?.providerId ?? (plannedSeason.parts.length === 0 ? `na_${plannedSeason.seasonNumber}` : null),
    },
    create: {
      animeId: dbAnimeId,
      number: plannedSeason.seasonNumber,
      title: plannedSeason.title,
      anilistId: plannedSeason.anilistId,
      provider: primaryPart?.provider ?? (plannedSeason.parts.length === 0 ? "not_available" : null),
      providerId: primaryPart?.providerId ?? (plannedSeason.parts.length === 0 ? `na_${plannedSeason.seasonNumber}` : null),
    },
  });

  if (plannedSeason.parts.length === 0) {
    // Clean up any stale mappings for this season
    await prisma.animeSeasonProviderMapping.deleteMany({
      where: { seasonId: dbSeason.id },
    });
    // Ensure providerId is unique and marks no content
    await prisma.animeSeason.update({
      where: { id: dbSeason.id },
      data: {
        provider: "not_available",
        providerId: `na_${dbSeason.id}`,
      },
    });
    console.log(`[Anime Mapping] Provider mappings=0 (no provider content)`);
    return {
      dbSeason,
      mappingsCount: 0,
      episodesSynced: 0,
      conflicts: [
        `Season ${plannedSeason.seasonNumber} ("${plannedSeason.title}") has 0 matched provider parts.`,
      ],
    };
  }

  const activePartNumbers = plannedSeason.parts.map((p) => p.partNumber);
  let mappingsCount = 0;

  // Upsert each Provider Part mapping
  for (const part of plannedSeason.parts) {
    const existingByProviderId =
      await prisma.animeSeasonProviderMapping.findUnique({
        where: {
          provider_providerId: {
            provider: part.provider,
            providerId: part.providerId,
          },
        },
      });

    if (existingByProviderId) {
      // Re-parent or update existing mapping
      await prisma.animeSeasonProviderMapping.update({
        where: {
          id: existingByProviderId.id,
        },
        data: {
          seasonId: dbSeason.id,
          partNumber: part.partNumber,
          episodeOffset: part.episodeOffset,
          episodeCount: part.episodeCount,
        },
      });
    } else {
      await prisma.animeSeasonProviderMapping.upsert({
        where: {
          seasonId_provider_partNumber: {
            seasonId: dbSeason.id,
            provider: part.provider,
            partNumber: part.partNumber,
          },
        },
        update: {
          providerId: part.providerId,
          episodeOffset: part.episodeOffset,
          episodeCount: part.episodeCount,
        },
        create: {
          seasonId: dbSeason.id,
          provider: part.provider,
          providerId: part.providerId,
          partNumber: part.partNumber,
          episodeOffset: part.episodeOffset,
          episodeCount: part.episodeCount,
        },
      });
    }

    mappingsCount++;
  }

  // Clean up any stale provider mappings on this season from an earlier incorrect mapping
  await prisma.animeSeasonProviderMapping.deleteMany({
    where: {
      seasonId: dbSeason.id,
      partNumber: { notIn: activePartNumbers },
    },
  });

  console.log(
    `[Anime Mapping] Provider mappings=${plannedSeason.parts.length} (parts: ${activePartNumbers.join(", ")})`
  );

  // Synchronize episodes using the multi-part mappings
  const syncedEpisodes = await syncSeasonEpisodes(dbSeason.id);
  console.log(
    `[Anime Mapping] Episodes synchronized=${syncedEpisodes.length} for season ${plannedSeason.seasonNumber}`
  );

  return {
    dbSeason,
    mappingsCount,
    episodesSynced: syncedEpisodes.length,
    conflicts: [],
  };
}

/**
 * Persists a fully planned franchise mapping across ALL seasons (full franchise path).
 */
export async function persistFranchiseMapping(
  anilistId: number
): Promise<PersistResult> {
  console.log(`[Anime Mapping] START anilistId=${anilistId}`);

  const plan = await planFranchiseMapping(anilistId);

  const rootAnime = plan.rootAnime;
  const requestedAnime = plan.requestedAnime;

  console.log(
    `[Anime Mapping] Planned seasons=${plan.seasons.length} for root anime #${rootAnime.id} ("${rootAnime.title.english || rootAnime.title.romaji}")`
  );

  // 1. Upsert Root Anime
  const rootTitle =
    rootAnime.title.english ??
    rootAnime.title.romaji ??
    rootAnime.title.native ??
    "Unknown";

  const dbAnime = await prisma.anime.upsert({
    where: {
      anilistId: rootAnime.id,
    },
    update: {
      title: rootTitle,
      description: rootAnime.description,
      coverImage: rootAnime.coverImage.extraLarge ?? rootAnime.coverImage.large,
      bannerImage: rootAnime.bannerImage,
    },
    create: {
      anilistId: rootAnime.id,
      title: rootTitle,
      description: rootAnime.description,
      coverImage: rootAnime.coverImage.extraLarge ?? rootAnime.coverImage.large,
      bannerImage: rootAnime.bannerImage,
    },
  });

  const savedSeasons: any[] = [];
  let mappingsCount = 0;
  let totalEpisodesSynced = 0;
  const conflicts: string[] = [];

  // 2. Persist Planned Logical Seasons & Parts
  for (const plannedSeason of plan.seasons) {
    const result = await persistSeasonPartsAndSync(dbAnime.id, plannedSeason);
    savedSeasons.push(result.dbSeason);
    mappingsCount += result.mappingsCount;
    totalEpisodesSynced += result.episodesSynced;
    conflicts.push(...result.conflicts);
  }

  // 3. Post-persistence Verification
  const allDbSeasons = await prisma.animeSeason.findMany({
    where: { animeId: dbAnime.id },
    orderBy: { number: "asc" },
  });

  const animeExists = !!dbAnime.id;
  const allPlannedSeasonsExist = plan.seasons.every((ps) =>
    allDbSeasons.some((dbs) => dbs.number === ps.seasonNumber)
  );

  console.log(
    `[Anime Mapping] VERIFY: animeExists=${animeExists} seasons=${allDbSeasons.length}/${plan.seasons.length}`
  );

  if (!animeExists || !allPlannedSeasonsExist) {
    console.error(
      `[Anime Mapping] INCONSISTENT STATE: Expected ${plan.seasons.length} seasons for anime #${anilistId}, but found ${allDbSeasons.length} in DB.`
    );
    throw new Error(
      `[Anime Mapping] INCONSISTENT STATE: Franchise mapping failed to establish all planned seasons for anime #${anilistId}`
    );
  }

  console.log(`[Anime Mapping] COMPLETE anilistId=${anilistId}`);

  const matchingSeason =
    allDbSeasons.find((s) => s.anilistId === requestedAnime.id) ??
    allDbSeasons[0];

  return {
    anime: dbAnime,
    requestedAnime: {
      anilistId: requestedAnime.id,
      title:
        requestedAnime.title.english ??
        requestedAnime.title.romaji ??
        requestedAnime.title.native,
      season: matchingSeason?.number ?? 1,
    },
    seasons: allDbSeasons,
    mappingsCreatedOrUpdated: mappingsCount,
    episodesSynced: totalEpisodesSynced,
    conflicts,
  };
}

/**
 * Resolves ONLY the requested season for immediate watch page readiness,
 * while creating lightweight skeletons for other seasons so the UI SeasonSelector has all seasons.
 */
export async function persistRequestedSeason(
  anilistId: number,
  requestedSeasonNumber: number
): Promise<{
  anime: any;
  requestedAnime: {
    anilistId: number;
    title: string | null;
    season: number;
  };
  season: any;
  seasons: any[];
}> {
  console.log(
    `[Anime Mapping] START requested-season resolution anilistId=${anilistId} seasonNumber=${requestedSeasonNumber}`
  );
  const tTotalStart = performance.now();

  // 1. Lightweight Franchise Discovery (AniList GraphQL only)
  const tLookupStart = performance.now();
  const structure = await discoverFranchiseStructure(anilistId);
  const { rootAnime, requestedAnime, logicalGroups } = structure;
  console.log(
    `[Performance] franchise discovery: ${(performance.now() - tLookupStart).toFixed(1)} ms`
  );

  console.log(
    `[Anime Mapping] Discovered ${logicalGroups.length} logical seasons for root anime #${rootAnime.id} ("${rootAnime.title.english || rootAnime.title.romaji}")`
  );

  // 2. Root Anime & Season Skeletons Persistence
  const tRootStart = performance.now();
  const rootTitle =
    rootAnime.title.english ??
    rootAnime.title.romaji ??
    rootAnime.title.native ??
    "Unknown";

  const dbAnime = await prisma.anime.upsert({
    where: {
      anilistId: rootAnime.id,
    },
    update: {
      title: rootTitle,
      description: rootAnime.description,
      coverImage: rootAnime.coverImage.extraLarge ?? rootAnime.coverImage.large,
      bannerImage: rootAnime.bannerImage,
    },
    create: {
      anilistId: rootAnime.id,
      title: rootTitle,
      description: rootAnime.description,
      coverImage: rootAnime.coverImage.extraLarge ?? rootAnime.coverImage.large,
      bannerImage: rootAnime.bannerImage,
    },
  });

  // Ensure lightweight season skeletons exist in DB for UI season selector
  for (const group of logicalGroups) {
    await prisma.animeSeason.upsert({
      where: {
        animeId_number: {
          animeId: dbAnime.id,
          number: group.logicalSeasonNumber,
        },
      },
      update: {
        title: group.displayTitle,
        anilistId: group.primaryAnilistAnime.id,
      },
      create: {
        animeId: dbAnime.id,
        number: group.logicalSeasonNumber,
        title: group.displayTitle,
        anilistId: group.primaryAnilistAnime.id,
      },
    });
  }
  console.log(
    `[Performance] root & season skeletons persistence: ${(performance.now() - tRootStart).toFixed(1)} ms`
  );

  // 3. Identify Target Logical Season Group
  let targetGroup = logicalGroups.find(
    (g) => g.logicalSeasonNumber === requestedSeasonNumber
  );

  if (!targetGroup) {
    targetGroup = logicalGroups.find(
      (g) =>
        g.primaryAnilistAnime.id === requestedAnime.id ||
        g.relatedAnilistEntries.some((e) => e.id === requestedAnime.id)
    );
  }

  if (!targetGroup) {
    targetGroup = logicalGroups[0];
  }

  // Check if target season is already resolved
  const existingDbSeason = await prisma.animeSeason.findUnique({
    where: {
      animeId_number: {
        animeId: dbAnime.id,
        number: targetGroup.logicalSeasonNumber,
      },
    },
    include: {
      providerMappings: true,
      _count: { select: { episodes: true } },
    },
  });

  let resolvedSeason = existingDbSeason;

  if (
    existingDbSeason &&
    (existingDbSeason._count.episodes > 0 ||
      existingDbSeason.providerId?.startsWith("na_"))
  ) {
    console.log(
      `[Anime Mapping] Season ${targetGroup.logicalSeasonNumber} is already resolved. Skipping provider lookup.`
    );
  } else {
    // 4. Plan Candidates for Target Season ONLY
    const tPlanStart = performance.now();
    const plannedSeason = await planSingleSeason(targetGroup, rootAnime);
    console.log(
      `[Performance] requested season candidate resolution: ${(performance.now() - tPlanStart).toFixed(1)} ms`
    );

    // 5. Provider Mapping & Episode Sync for Target Season ONLY
    const tSyncStart = performance.now();
    const { dbSeason } = await persistSeasonPartsAndSync(
      dbAnime.id,
      plannedSeason
    );
    resolvedSeason = dbSeason;
    console.log(
      `[Performance] provider mapping & episode sync: ${(performance.now() - tSyncStart).toFixed(1)} ms`
    );
  }

  const allDbSeasons = await prisma.animeSeason.findMany({
    where: { animeId: dbAnime.id },
    orderBy: { number: "asc" },
  });

  console.log(
    `[Performance] total requested-season resolution: ${(performance.now() - tTotalStart).toFixed(1)} ms`
  );

  return {
    anime: dbAnime,
    requestedAnime: {
      anilistId: requestedAnime.id,
      title:
        requestedAnime.title.english ??
        requestedAnime.title.romaji ??
        requestedAnime.title.native,
      season: targetGroup.logicalSeasonNumber,
    },
    season: resolvedSeason,
    seasons: allDbSeasons,
  };
}
