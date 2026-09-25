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
 * Persists a fully planned franchise mapping to the database idempotently.
 *
 * Rules:
 * 1. Preserves existing Anime and AnimeSeason records (no destructive resets).
 * 2. Populates AnimeSeason.anilistId with specific season AniList IDs.
 * 3. Creates/updates AnimeSeasonProviderMapping for every matched part.
 * 4. Preserves legacy AnimeSeason.provider/providerId fields pointing to Part 1.
 * 5. Synchronizes multi-part episodes with correct episode offsets.
 */
export async function persistFranchiseMapping(
  anilistId: number
): Promise<PersistResult> {
  const plan = await planFranchiseMapping(anilistId);

  const rootAnime = plan.rootAnime;
  const requestedAnime = plan.requestedAnime;

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
    if (plannedSeason.parts.length === 0) {
      conflicts.push(
        `Season ${plannedSeason.seasonNumber} ("${plannedSeason.title}") has 0 matched provider parts.`
      );
      continue;
    }

    const primaryPart = plannedSeason.parts[0];

    // Upsert AnimeSeason
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
        // Preserve legacy fields pointing to primary part
        provider: primaryPart.provider,
        providerId: primaryPart.providerId,
      },
      create: {
        animeId: dbAnime.id,
        number: plannedSeason.seasonNumber,
        title: plannedSeason.title,
        anilistId: plannedSeason.anilistId,
        provider: primaryPart.provider,
        providerId: primaryPart.providerId,
      },
    });

    // Upsert each Provider Part mapping
    for (const part of plannedSeason.parts) {
      const existingByProviderId = await prisma.animeSeasonProviderMapping.findUnique({
        where: {
          provider_providerId: {
            provider: part.provider,
            providerId: part.providerId,
          },
        },
      });

      if (existingByProviderId) {
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

    // 3. Synchronize episodes using the multi-part mappings
    const syncedEpisodes = await syncSeasonEpisodes(dbSeason.id);
    totalEpisodesSynced += syncedEpisodes.length;

    savedSeasons.push(dbSeason);
  }

  // Determine which season was requested by the user
  const matchingSeason = savedSeasons.find(
    (s) => s.anilistId === requestedAnime.id
  ) ?? savedSeasons[0];

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
    seasons: savedSeasons,
    mappingsCreatedOrUpdated: mappingsCount,
    episodesSynced: totalEpisodesSynced,
    conflicts,
  };
}
