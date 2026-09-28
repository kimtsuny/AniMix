import prisma from "../../config/prisma.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";
import type { AnimeParadiseEpisode } from "../streaming/providers/animeparadise.provider.js";
import { aniKotoProvider } from "../streaming/providers/anikoto.provider.js";

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
      let episodes: Array<{ id: string; number: number; title?: string; thumbnail?: string }> = [];
      try {
        if (partMapping.provider === "animeparadise") {
          episodes = (await animeParadiseProvider.getEpisodes(
            partMapping.providerId
          )) as AnimeParadiseEpisode[];
        } else if (partMapping.provider === "anikoto") {
          episodes = (await aniKotoProvider.getEpisodes(
            partMapping.providerId
          )) as any[];
        } else {
          console.warn(
            `[Episodes] Unsupported provider "${partMapping.provider}" for season ${seasonId}, skipping`
          );
          continue;
        }
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

  // 3. Single-provider or fallback mapping
  let episodes: Array<{ id: string; number: number; title?: string; thumbnail?: string }> = [];
  let effectiveProvider: string = season.provider ?? "animeparadise";

  if (season.provider === "animeparadise" && season.providerId && !season.providerId.startsWith("na_")) {
    try {
      episodes = (await animeParadiseProvider.getEpisodes(
        season.providerId
      )) as AnimeParadiseEpisode[];
    } catch (err: any) {
      console.warn(
        `[Episodes] AnimeParadise getEpisodes failed for season ${seasonId}:`,
        err.message
      );
    }
  } else if (season.provider === "anikoto" && season.providerId) {
    try {
      episodes = (await aniKotoProvider.getEpisodes(
        season.providerId
      )) as any[];
    } catch (err: any) {
      console.warn(
        `[Episodes] AniKoto getEpisodes failed for season ${seasonId}:`,
        err.message
      );
    }
  }

  // Fallback to AniKoto if AnimeParadise returned 0 episodes or season is marked "not_available" / "na_"
  if (episodes.length === 0 && season.anilistId) {
    console.log(
      `[Episodes] Primary provider has no episodes for season ${seasonId}. Attempting AniKoto fallback for AniList #${season.anilistId}...`
    );
    try {
      const anikotoEpisodes = await aniKotoProvider.getEpisodes(
        String(season.anilistId)
      );
      if (anikotoEpisodes.length > 0) {
        episodes = anikotoEpisodes as any[];
        effectiveProvider = "anikoto";

        await prisma.animeSeason.update({
          where: { id: season.id },
          data: {
            provider: "anikoto",
            providerId: `anikoto:${season.anilistId}`,
          },
        });
      }
    } catch (err: any) {
      console.warn(
        `[Episodes] AniKoto fallback episode fetch failed:`,
        err.message
      );
    }
  }

  if (episodes.length === 0) {
    throw new Error(
      `No episodes found for season ${seasonId}`
    );
  }

  console.log(
    `[Episodes] Found ${episodes.length} episodes for season ${seasonId} (provider: ${effectiveProvider})`
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
          provider: effectiveProvider,
        },
      },
      update: {
        providerId: episode.id,
      },
      create: {
        episodeId: dbEpisode.id,
        provider: effectiveProvider,
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