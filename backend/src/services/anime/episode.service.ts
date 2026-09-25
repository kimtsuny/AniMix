import prisma from "../../config/prisma.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";
import type { AnimeParadiseEpisode } from "../streaming/providers/animeparadise.provider.js";

export async function syncSeasonEpisodes(
  seasonId: number
) {
  // 1. Get season
  const season = await prisma.animeSeason.findUnique({
    where: {
      id: seasonId,
    },
  });

  if (!season) {
    throw new Error(`Anime season ${seasonId} not found`);
  }

  // 2. Check for multi-part provider mappings (Phase 3 architecture)
  const seasonProviderMappings = await prisma.animeSeasonProviderMapping.findMany({
    where: {
      seasonId,
    },
    orderBy: {
      partNumber: "asc",
    },
  });

  if (seasonProviderMappings.length > 0) {
    console.log(
      `[Episodes] Found ${seasonProviderMappings.length} provider parts for season ${seasonId}`
    );

    for (const partMapping of seasonProviderMappings) {
      if (partMapping.provider !== "animeparadise") {
        console.warn(
          `[Episodes] Unsupported provider "${partMapping.provider}" for season ${seasonId}, skipping`
        );
        continue;
      }

      let episodes: AnimeParadiseEpisode[] = [];
      try {
        episodes = (await animeParadiseProvider.getEpisodes(
          partMapping.providerId
        )) as AnimeParadiseEpisode[];
      } catch (err: any) {
        console.error(
          `[Episodes] Failed to fetch episodes for part ${partMapping.partNumber} (${partMapping.providerId}):`,
          err.message
        );
        continue;
      }

      if (episodes.length === 0) {
        console.warn(
          `[Episodes] Provider returned 0 episodes for part ${partMapping.partNumber} (${partMapping.providerId})`
        );
        continue;
      }

      console.log(
        `[Episodes] Syncing ${episodes.length} episodes for part ${partMapping.partNumber} (offset: ${partMapping.episodeOffset})`
      );

      for (const ep of episodes) {
        const logicalEpisodeNumber = ep.number + partMapping.episodeOffset;
        const thumbnail = ep.thumbnail ?? null;

        // Upsert logical Episode using seasonId + logicalEpisodeNumber
        const dbEpisode = await prisma.episode.upsert({
          where: {
            seasonId_number: {
              seasonId,
              number: logicalEpisodeNumber,
            },
          },
          update: {
            title: ep.title,
            thumbnail: thumbnail ?? undefined,
          },
          create: {
            seasonId,
            number: logicalEpisodeNumber,
            title: ep.title,
            thumbnail,
          },
        });

        // Upsert EpisodeProviderMapping with exact providerSeasonMappingId
        const existingEpMapping = await prisma.episodeProviderMapping.findUnique({
          where: {
            provider_providerId: {
              provider: partMapping.provider,
              providerId: ep.id,
            },
          },
        });

        if (existingEpMapping) {
          await prisma.episodeProviderMapping.update({
            where: { id: existingEpMapping.id },
            data: {
              episodeId: dbEpisode.id,
              providerSeasonMappingId: partMapping.id,
            },
          });
        } else {
          await prisma.episodeProviderMapping.upsert({
            where: {
              episodeId_provider: {
                episodeId: dbEpisode.id,
                provider: partMapping.provider,
              },
            },
            update: {
              providerId: ep.id,
              providerSeasonMappingId: partMapping.id,
            },
            create: {
              episodeId: dbEpisode.id,
              provider: partMapping.provider,
              providerId: ep.id,
              providerSeasonMappingId: partMapping.id,
            },
          });
        }
      }
    }

    // Clean up any obsolete episodes for this season that exceed the total episode count of active parts
    const maxLogicalNumber = Math.max(
      ...seasonProviderMappings.map((p) => p.episodeOffset + p.episodeCount),
      0
    );
    if (maxLogicalNumber > 0) {
      const pruned = await prisma.episode.deleteMany({
        where: {
          seasonId,
          number: { gt: maxLogicalNumber },
        },
      });
      if (pruned.count > 0) {
        console.log(
          `[Episodes] Pruned ${pruned.count} obsolete episode(s) exceeding logical max ${maxLogicalNumber} for season ${seasonId}`
        );
      }
    }

    return prisma.episode.findMany({
      where: {
        seasonId,
      },
      include: {
        providerMappings: true,
      },
      orderBy: {
        number: "asc",
      },
    });
  }

  // 3. Fallback to legacy single-provider season mapping
  if (!season.provider || !season.providerId) {
    throw new Error(
      `No provider mapping found for season ${seasonId}`
    );
  }

  if (season.provider !== "animeparadise") {
    throw new Error(
      `Unsupported episode provider: ${season.provider}`
    );
  }

  const episodes = (await animeParadiseProvider.getEpisodes(
    season.providerId
  )) as AnimeParadiseEpisode[];

  if (episodes.length === 0) {
    throw new Error(
      `No episodes found for season ${seasonId}`
    );
  }

  console.log(
    `[Episodes] Fallback legacy: Found ${episodes.length} episodes for season ${seasonId}`
  );

  for (const episode of episodes) {
    const thumbnail = episode.thumbnail ?? null;

    const dbEpisode = await prisma.episode.upsert({
      where: {
        seasonId_number: {
          seasonId,
          number: episode.number,
        },
      },
      update: {
        title: episode.title,
        thumbnail,
      },
      create: {
        seasonId,
        number: episode.number,
        title: episode.title,
        thumbnail,
      },
    });

    await prisma.episodeProviderMapping.upsert({
      where: {
        episodeId_provider: {
          episodeId: dbEpisode.id,
          provider: "animeparadise",
        },
      },
      update: {
        providerId: episode.id,
      },
      create: {
        episodeId: dbEpisode.id,
        provider: "animeparadise",
        providerId: episode.id,
      },
    });
  }

  return prisma.episode.findMany({
    where: {
      seasonId,
    },
    include: {
      providerMappings: true,
    },
    orderBy: {
      number: "asc",
    },
  });
}