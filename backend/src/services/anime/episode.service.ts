import prisma from "../../config/prisma.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";
import type { AnimeParadiseEpisode } from "../streaming/providers/animeparadise.provider.js";
import { aniKotoProvider } from "../streaming/providers/anikoto.provider.js";
import { getAnimeById } from "../anilist/anilist.service.js";
import { classifyTitle } from "./mapping/candidate-classifier.js";
import { normalizeTitle } from "./mapping/title-normalizer.js";

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

/**
 * Separately retrieves AnimeParadise episode thumbnails for a season,
 * independent of the selected streaming provider.
 * Returns a map: logical episode number -> thumbnail image URL.
 */
async function fetchAnimeParadiseThumbnails(
  season: {
    id: number;
    number: number;
    title: string | null;
    provider?: string | null;
    providerId?: string | null;
    anime?: { title: string } | null;
  },
  seasonProviderMappings: Array<{
    provider: string;
    providerId: string;
    partNumber: number;
    episodeOffset: number;
    episodeCount: number;
  }>
): Promise<Map<number, string>> {
  const thumbnailMap = new Map<number, string>();

  // 1. Check if the season already has AnimeParadise parts in seasonProviderMappings
  const dbParadiseParts = seasonProviderMappings.filter(
    (p) => p.provider === "animeparadise"
  );
  if (dbParadiseParts.length > 0) {
    for (const part of dbParadiseParts) {
      try {
        const episodes = (await animeParadiseProvider.getEpisodes(
          part.providerId
        )) as AnimeParadiseEpisode[];
        for (const ep of episodes) {
          const logicalNumber = ep.number + part.episodeOffset;
          if (ep.thumbnail && ep.thumbnail.trim().length > 0) {
            thumbnailMap.set(logicalNumber, ep.thumbnail.trim());
          }
        }
      } catch (err: any) {
        console.warn(
          `[Episodes] Failed to fetch AnimeParadise episodes for part ${part.providerId}:`,
          err.message
        );
      }
    }
    if (thumbnailMap.size > 0) {
      return thumbnailMap;
    }
  }

  // 2. Check if the season itself is mapped directly to AnimeParadise
  if (
    season.provider === "animeparadise" &&
    season.providerId &&
    !season.providerId.startsWith("na_")
  ) {
    try {
      const episodes = (await animeParadiseProvider.getEpisodes(
        season.providerId
      )) as AnimeParadiseEpisode[];
      for (const ep of episodes) {
        if (ep.thumbnail && ep.thumbnail.trim().length > 0) {
          thumbnailMap.set(ep.number, ep.thumbnail.trim());
        }
      }
      if (thumbnailMap.size > 0) {
        return thumbnailMap;
      }
    } catch (err: any) {
      console.warn(
        `[Episodes] Failed to fetch AnimeParadise episodes for season providerId ${season.providerId}:`,
        err.message
      );
    }
  }

  // 3. Independent discovery via AnimeParadise search
  const candidateQueries = [
    season.title,
    season.anime?.title,
  ].filter((t): t is string => Boolean(t && t.trim().length > 0));

  const seenQueries = new Set<string>();

  for (const query of candidateQueries) {
    const normKey = normalizeTitle(query);
    if (seenQueries.has(normKey)) continue;
    seenQueries.add(normKey);

    try {
      const searchResults = await animeParadiseProvider.search(query);
      if (!searchResults || searchResults.length === 0) continue;

      const matchedParts: Array<{
        partNumber: number;
        id: string;
        title: string;
      }> = [];

      for (const res of searchResults) {
        const classified = classifyTitle(res.title);
        const romanEndMatch = res.title.match(
          /\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b$/i
        );
        const resSeason =
          classified.explicitSeasonNumber ??
          classified.ordinalSeasonNumber ??
          (romanEndMatch
            ? ROMAN_NUMERALS[romanEndMatch[1].toLowerCase()]
            : null);

        let isMatch = false;
        if (resSeason === season.number) {
          isMatch = true;
        } else if (
          classified.isFinalSeason &&
          (season.number === 4 || (season.title && /final/i.test(season.title)))
        ) {
          isMatch = true;
        } else if (
          season.number === 1 &&
          !resSeason &&
          !classified.isFinalSeason
        ) {
          const normAnime = normalizeTitle(season.anime?.title ?? query);
          if (
            normAnime.includes(classified.normalizedBaseTitle) ||
            classified.normalizedBaseTitle.includes(normAnime)
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          const rawPart = classified.partNumber ?? classified.courNumber ?? 1;
          matchedParts.push({
            partNumber: rawPart,
            id: res.id,
            title: res.title,
          });
        }
      }

      if (matchedParts.length === 0) continue;

      // Deduplicate parts by partNumber
      const uniqueParts = new Map<number, (typeof matchedParts)[0]>();
      for (const part of matchedParts) {
        if (!uniqueParts.has(part.partNumber)) {
          uniqueParts.set(part.partNumber, part);
        }
      }

      const sortedParts = Array.from(uniqueParts.values()).sort(
        (a, b) => a.partNumber - b.partNumber
      );

      let currentOffset = 0;
      for (const part of sortedParts) {
        try {
          const episodes = (await animeParadiseProvider.getEpisodes(
            part.id
          )) as AnimeParadiseEpisode[];

          if (episodes && episodes.length > 0) {
            for (const ep of episodes) {
              const logicalNum = ep.number + currentOffset;
              if (ep.thumbnail && ep.thumbnail.trim().length > 0) {
                thumbnailMap.set(logicalNum, ep.thumbnail.trim());
              }
            }
            currentOffset += episodes.length;
          }
        } catch {
          // silently continue
        }
      }

      if (thumbnailMap.size > 0) {
        break;
      }
    } catch {
      // silently continue
    }
  }

  return thumbnailMap;
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

  // Resolve thumbnail fallback:
  // 2. AniList coverImage.extraLarge
  // 3. AniList coverImage.large
  // 4. Database anime coverImage
  // 5. null
  const anilistId = season.anilistId ?? season.anime?.anilistId;
  let anilistExtraLarge: string | null = null;
  let anilistLarge: string | null = null;

  if (anilistId) {
    try {
      const anilistData = await getAnimeById(anilistId);
      const xl = anilistData?.coverImage?.extraLarge?.trim();
      const l = anilistData?.coverImage?.large?.trim();
      anilistExtraLarge = xl && xl.length > 0 ? xl : null;
      anilistLarge = l && l.length > 0 ? l : null;
    } catch (err: any) {
      console.warn(
        `[Episodes] Failed to fetch AniList metadata for season ${seasonId} (AniList ID ${anilistId}):`,
        err.message
      );
    }
  }

  const animeCoverImage =
    season.anime?.coverImage && season.anime.coverImage.trim().length > 0
      ? season.anime.coverImage.trim()
      : null;

  const fallbackThumbnail =
    anilistExtraLarge ?? anilistLarge ?? animeCoverImage ?? null;

  // 2. Check for multi-part provider mappings (Phase 3 architecture)
  const seasonProviderMappings = await prisma.animeSeasonProviderMapping.findMany({
    where: {
      seasonId,
    },
    orderBy: {
      partNumber: "asc",
    },
  });

  // Independently retrieve episode thumbnails from AnimeParadise
  const paradiseThumbnailMap = await fetchAnimeParadiseThumbnails(
    season,
    seasonProviderMappings
  );

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
        const paradiseImage =
          paradiseThumbnailMap.get(logicalEpisodeNumber) ??
          (ep.thumbnail && ep.thumbnail.trim().length > 0
            ? ep.thumbnail.trim()
            : null);
        const thumbnail = paradiseImage ?? fallbackThumbnail;

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
    const paradiseImage =
      paradiseThumbnailMap.get(episode.number) ??
      (episode.thumbnail && episode.thumbnail.trim().length > 0
        ? episode.thumbnail.trim()
        : null);
    const thumbnail = paradiseImage ?? fallbackThumbnail;

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