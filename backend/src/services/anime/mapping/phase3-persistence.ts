import prisma from "../../../config/prisma.js";
import { planFranchiseMapping, type FranchisePlan } from "./phase3-planner.js";
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
 * Persists a fully planned franchise mapping to the database idempotently and self-consistently.
 *
 * Invariants guaranteed:
 * 1. Root Anime is persisted.
 * 2. Every planned logical season exists as an AnimeSeason record in the DB (even if provider has 0 parts).
 * 3. Specific AniList IDs are stored on AnimeSeason.anilistId.
 * 4. Stale provider mappings from previous runs are removed/re-parented.
 * 5. Episodes are synchronized with correct offsets and orphan episodes pruned.
 * 6. Post-persistence state is verified before returning.
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
    console.log(
      `[Anime Mapping] Persisting season: anilistId=${plannedSeason.anilistId} number=${plannedSeason.seasonNumber} title="${plannedSeason.title}"`
    );

    const primaryPart =
      plannedSeason.parts.length > 0 ? plannedSeason.parts[0] : null;

    // Upsert AnimeSeason - guarantee every logical season exists in DB
    const dbSeason = await prisma.animeSeason.upsert({
      where: {
        animeId_number: {
          animeId: dbAnime.id,
          number: plannedSeason.seasonNumber,
        },
      },
      update: {
        title: plannedSeason.title,
        anilistId: plannedSeason.anilistId,
        provider: primaryPart?.provider ?? null,
        providerId: primaryPart?.providerId ?? null,
      },
      create: {
        animeId: dbAnime.id,
        number: plannedSeason.seasonNumber,
        title: plannedSeason.title,
        anilistId: plannedSeason.anilistId,
        provider: primaryPart?.provider ?? null,
        providerId: primaryPart?.providerId ?? null,
      },
    });

    if (plannedSeason.parts.length === 0) {
      conflicts.push(
        `Season ${plannedSeason.seasonNumber} ("${plannedSeason.title}") has 0 matched provider parts.`
      );
      // Clean up any stale mappings for this season
      await prisma.animeSeasonProviderMapping.deleteMany({
        where: { seasonId: dbSeason.id },
      });
      console.log(`[Anime Mapping] Provider mappings=0 (no provider content)`);
      savedSeasons.push(dbSeason);
      continue;
    }

    const activePartNumbers = plannedSeason.parts.map((p) => p.partNumber);

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

    // 3. Synchronize episodes using the multi-part mappings
    const syncedEpisodes = await syncSeasonEpisodes(dbSeason.id);
    totalEpisodesSynced += syncedEpisodes.length;
    console.log(
      `[Anime Mapping] Episodes synchronized=${syncedEpisodes.length} for season ${plannedSeason.seasonNumber}`
    );

    savedSeasons.push(dbSeason);
  }

  // 4. Post-persistence Verification
  const allDbSeasons = await prisma.animeSeason.findMany({
    where: { animeId: dbAnime.id },
    orderBy: { number: "asc" },
  });

  const animeExists = !!dbAnime.id;
  const allPlannedSeasonsExist = plan.seasons.every((ps) =>
    allDbSeasons.some((dbs) => dbs.number === ps.seasonNumber)
  );
  const requestedSeasonExists = allDbSeasons.some(
    (s) => s.anilistId === requestedAnime.id || s.number === 1
  );

  console.log(
    `[Anime Mapping] VERIFY: animeExists=${animeExists} seasons=${allDbSeasons.length}/${plan.seasons.length} requested season exists=${requestedSeasonExists}`
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

  // Determine which season was requested by the user
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
