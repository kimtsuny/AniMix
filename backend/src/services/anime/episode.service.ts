import prisma from "../../config/prisma.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";
import type { AnimeParadiseEpisode } from "../streaming/providers/animeparadise.provider.js";
import { aniKotoProvider } from "../streaming/providers/anikoto.provider.js";
import { getAnimeById } from "../anilist/anilist.service.js";
/**
 * Reliably extracts the episode number from an AniList streaming episode title.
 * Examples:
 *   "Episode 1 - ..." -> 1
 *   "Episode 28 - ..." -> 28
 */
function parseEpisodeNumberFromTitle(title: string | null | undefined): number | null {
  if (!title) return null;
  const match =
    title.match(/(?:^|\b)(?:Episode|Ep\.?)\s*(\d+)\b/i) ??
    title.match(/^E(\d+)\b/i) ??
    title.match(/^#?(\d+)\s*[-:]/);
  if (match) {
    const num = parseInt(match[1], 10);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export async function syncSeasonEpisodes(
  seasonId: number
) {
  // 1. Get season
  const season = await prisma.animeSeason.findUnique({
    where: {
      id: seasonId,
    },
    include: {
      anime: true,
    },
  });

  if (!season) {
    throw new Error(`Anime season ${seasonId} not found`);
  }

  // Resolve AniList thumbnail and cover image fallback:
  // 1. AniList streamingEpisodes[].thumbnail for exact episode number
  // 2. AniList coverImage.extraLarge for current season
  // 3. AniList coverImage.large for current season
  // 4. null
  const anilistId = season.anilistId ?? season.anime?.anilistId;
  let anilistCoverImage: string | null = null;
  const anilistThumbnailMap = new Map<number, string>();

  if (anilistId) {
    try {
      const anilistData = await getAnimeById(anilistId);
      const xl = anilistData?.coverImage?.extraLarge?.trim();
      const lg = anilistData?.coverImage?.large?.trim();
      anilistCoverImage = (xl && xl.length > 0 ? xl : null) ?? (lg && lg.length > 0 ? lg : null);

      if (anilistData?.streamingEpisodes) {
        for (const streamingEp of anilistData.streamingEpisodes) {
          const thumb = streamingEp.thumbnail?.trim();
          if (thumb && thumb.length > 0) {
            const epNum = parseEpisodeNumberFromTitle(streamingEp.title);
            if (epNum !== null && !anilistThumbnailMap.has(epNum)) {
              anilistThumbnailMap.set(epNum, thumb);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(
        `[Episodes] Failed to fetch AniList metadata for season ${seasonId} (AniList ID ${anilistId}):`,
        err.message
      );
    }
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

    // Prioritize AniKoto parts over AnimeParadise parts
    const anikotoParts = seasonProviderMappings.filter((p) => p.provider === "anikoto");
    const animeParadiseParts = seasonProviderMappings.filter((p) => p.provider === "animeparadise");
    const activeParts = anikotoParts.length > 0 ? anikotoParts : animeParadiseParts.length > 0 ? animeParadiseParts : seasonProviderMappings;

    for (const partMapping of activeParts) {
      let episodes: Array<{ id: string; number: number; title?: string; thumbnail?: string }> = [];
      try {
        if (partMapping.provider === "anikoto") {
          episodes = (await aniKotoProvider.getEpisodes(
            partMapping.providerId
          )) as any[];
        } else if (partMapping.provider === "animeparadise") {
          episodes = (await animeParadiseProvider.getEpisodes(
            partMapping.providerId
          )) as AnimeParadiseEpisode[];
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
        const anilistEpisodeThumbnail =
          anilistThumbnailMap.get(logicalEpisodeNumber) ??
          anilistThumbnailMap.get(ep.number) ??
          null;
        const thumbnail = anilistEpisodeThumbnail ?? anilistCoverImage ?? null;

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
            thumbnail,
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
      ...activeParts.map((p) => p.episodeOffset + p.episodeCount),
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

  // 3. Single-provider: Try AniKoto FIRST as PRIMARY provider
  let episodes: Array<{ id: string; number: number; title?: string; thumbnail?: string }> = [];
  let effectiveProvider: string = "anikoto";

  // Attempt AniKoto first (either via existing providerId if anikoto, or via AniList ID)
  const anikotoId =
    season.provider === "anikoto" && season.providerId
      ? season.providerId
      : season.anilistId
      ? `anilist:${season.anilistId}`
      : null;

  if (anikotoId) {
    try {
      console.log(
        `[Episodes] [Primary: AniKoto] Fetching episodes for season ${seasonId} ("${anikotoId}")...`
      );
      const anikotoEpisodes = await aniKotoProvider.getEpisodes(anikotoId);
      if (anikotoEpisodes.length > 0) {
        episodes = anikotoEpisodes as any[];
        effectiveProvider = "anikoto";

        if (season.provider !== "anikoto") {
          await prisma.animeSeason.update({
            where: { id: season.id },
            data: {
              provider: "anikoto",
              providerId: `anikoto:${season.anilistId}`,
            },
          });
        }
      }
    } catch (err: any) {
      console.warn(
        `[Episodes] [Primary: AniKoto] Episode fetch failed for season ${seasonId}:`,
        err.message
      );
    }
  }

  // Fallback to AnimeParadise if AniKoto returned 0 episodes
  if (episodes.length === 0) {
    console.log(
      `[Episodes] AniKoto primary provider returned 0 episodes for season ${seasonId}. Attempting AnimeParadise fallback...`
    );

    const apId =
      season.provider === "animeparadise" && season.providerId && !season.providerId.startsWith("na_")
        ? season.providerId
        : null;

    if (apId) {
      try {
        const apEpisodes = (await animeParadiseProvider.getEpisodes(
          apId
        )) as AnimeParadiseEpisode[];

        if (apEpisodes.length > 0) {
          episodes = apEpisodes;
          effectiveProvider = "animeparadise";
          console.log(
            `[Episodes] [Fallback: AnimeParadise] Succeeded with ${episodes.length} episodes for season ${seasonId}`
          );
        }
      } catch (err: any) {
        console.warn(
          `[Episodes] [Fallback: AnimeParadise] Failed for season ${seasonId}:`,
          err.message
        );
      }
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
    const anilistEpisodeThumbnail =
      anilistThumbnailMap.get(episode.number) ?? null;
    const thumbnail = anilistEpisodeThumbnail ?? anilistCoverImage ?? null;

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