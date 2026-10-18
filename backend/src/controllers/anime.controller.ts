import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import {
  mapAnime,
  mapRequestedSeason,
} from "../services/anime/anime-mapping.service.js";
import { syncSeasonEpisodes } from "../services/anime/episode.service.js";
import {
  resolveAnonymousSeasonEpisodes,
  resolveAnonymousSeasons,
} from "../services/anime/anonymous-anime.service.js";

export async function getAnimeSeasons(
  req: Request,
  res: Response
): Promise<void> {
  const reqStart = performance.now();
  try {
    const anilistId = Number(req.params.animeId);

    if (!Number.isInteger(anilistId) || anilistId <= 0) {
      res.status(400).json({
        message: "Invalid anime ID",
      });
      return;
    }

    const isAuthenticated = !!req.user;

    // 1. Anonymous mode: zero DB queries, resolve lightweight bounded series metadata
    if (!isAuthenticated) {
      const metadata = await resolveAnonymousSeasons(anilistId);
      if (!metadata) {
        res.status(404).json({
          message: `[Anime Controller] Seasons for Anime #${anilistId} could not be resolved.`,
        });
        return;
      }

      console.log(
        `[Performance] total anonymous getAnimeSeasons time: ${(
          performance.now() - reqStart
        ).toFixed(1)} ms`
      );

      res.status(200).json(metadata);
      return;
    }

    // 2. Authenticated mode: check database first
    let anime = await prisma.anime.findUnique({
      where: { anilistId },
      select: {
        id: true,
        anilistId: true,
        title: true,
        description: true,
        coverImage: true,
        bannerImage: true,
      },
    });

    if (!anime) {
      const seasonByAnilistId = await prisma.animeSeason.findFirst({
        where: { anilistId },
        select: {
          anime: {
            select: {
              id: true,
              anilistId: true,
              title: true,
              description: true,
              coverImage: true,
              bannerImage: true,
            },
          },
        },
      });
      if (seasonByAnilistId) {
        anime = seasonByAnilistId.anime;
      }
    }

    if (anime) {
      const seasons = await prisma.animeSeason.findMany({
        where: { animeId: anime.id },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          anilistId: true,
          _count: {
            select: {
              episodes: true,
            },
          },
        },
      });

      if (seasons.length > 0) {
        const matchingSeason = seasons.find((s) => s.anilistId === anilistId);
        const requestedSeasonNumber = matchingSeason?.number ?? 1;

        res.status(200).json({
          rootAnimeId: anime.anilistId,
          requestedSeasonNumber,
          anime: {
            id: anime.id,
            anilistId: anime.anilistId,
            title: anime.title,
            description: anime.description,
            coverImage: anime.coverImage,
            bannerImage: anime.bannerImage,
          },
          seasons: seasons.map((item) => ({
            id: item.id,
            number: item.number,
            title: item.title,
            episodeCount: item._count.episodes,
            anilistId:
              item.anilistId ?? (item.number === 1 ? anime.anilistId : null),
            anilistIds: item.anilistId
              ? [item.anilistId]
              : item.number === 1
              ? [anime.anilistId]
              : [],
          })),
        });
        return;
      }
    }

    // Fallback: If not in DB yet for authenticated user, use lightweight resolver
    const metadata = await resolveAnonymousSeasons(anilistId);
    if (!metadata) {
      res.status(404).json({
        message: `[Anime Controller] Seasons for Anime #${anilistId} could not be resolved.`,
      });
      return;
    }

    res.status(200).json(metadata);
  } catch (error: unknown) {
    console.error("[Anime Controller] Failed to get anime seasons:", error);
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export async function getSeasonEpisodes(
  req: Request,
  res: Response
): Promise<void> {
  const reqStart = performance.now();
  try {
    const anilistId = Number(req.params.animeId);
    const seasonNumber = Number(req.params.seasonNumber);

    if (
      !Number.isInteger(anilistId) ||
      anilistId <= 0 ||
      !Number.isInteger(seasonNumber) ||
      seasonNumber < 0
    ) {
      res.status(400).json({
        message: "Invalid anime ID or season number",
      });
      return;
    }

    const query = req.query || {};
    let offset: number | undefined;
    let limit: number | undefined;

    if (query.offset !== undefined) {
      const parsedOffset = Number(query.offset);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        res.status(400).json({
          message: "Invalid offset parameter. Must be a non-negative integer.",
        });
        return;
      }
      offset = parsedOffset;
    }

    if (query.limit !== undefined) {
      const parsedLimit = Number(query.limit);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit <= 0 ||
        parsedLimit > 100
      ) {
        res.status(400).json({
          message: "Invalid limit parameter. Must be between 1 and 100.",
        });
        return;
      }
      limit = parsedLimit;
    }

    const isAuthenticated = !!req.user;

    // ============================================================
    // ANONYMOUS VISITOR MODE
    // - Zero database reads/writes
    // - Zero caching
    // - Live AniList + AniKoto matching & season resolution
    // ============================================================
    if (!isAuthenticated) {
      console.log(
        `[Anime Controller] Anonymous request for anime #${anilistId}, season #${seasonNumber}. Resolving live without DB...`
      );

      const result = await resolveAnonymousSeasonEpisodes(
        anilistId,
        seasonNumber
      );

      if (!result) {
        res.status(404).json({
          message: `[Anime Controller] Season ${seasonNumber} for Anime #${anilistId} could not be resolved.`,
        });
        return;
      }

      console.log(
        `[Performance] total anonymous getSeasonEpisodes request time: ${(
          performance.now() - reqStart
        ).toFixed(1)} ms`
      );

      if (limit !== undefined) {
        const start = offset ?? 0;
        const total = result.season.episodes.length;
        const paginatedEpisodes = result.season.episodes.slice(
          start,
          start + limit
        );

        res.status(200).json({
          anime: result.anime,
          seasons: result.seasons,
          season: {
            ...result.season,
            episodes: paginatedEpisodes,
          },
          pagination: {
            offset: start,
            limit,
            total,
            hasMore: start + limit < total,
          },
        });
        return;
      }

      res.status(200).json(result);
      return;
    }

    // ============================================================
    // AUTHENTICATED USER MODE (DB-first)
    // ============================================================

    // ============================================================
    // 1. Find Anime in database
    // ============================================================

    const tLookupStart = performance.now();
    let anime = await prisma.anime.findUnique({
      where: {
        anilistId,
      },
    });

    let seasonByAnilistId = null;
    if (!anime) {
      seasonByAnilistId = await prisma.animeSeason.findFirst({
        where: {
          anilistId,
        },
        include: {
          anime: true,
        },
      });

      if (seasonByAnilistId) {
        anime = seasonByAnilistId.anime;
      }
    }
    console.log(
      `[Performance] anime lookup: ${(performance.now() - tLookupStart).toFixed(1)} ms (found=${!!anime})`
    );

    // ============================================================
    // 2. Anime does not exist
    //    → Run fast requested-season resolution
    // ============================================================

    if (!anime) {
      console.log(
        `[Anime Controller] Anime #${anilistId} not found in database. Resolving requested season #${seasonNumber}...`
      );

      await mapRequestedSeason(anilistId, seasonNumber);

      // Re-query from database (never use stale in-memory objects)
      anime = await prisma.anime.findUnique({
        where: {
          anilistId,
        },
      });

      if (!anime) {
        seasonByAnilistId = await prisma.animeSeason.findFirst({
          where: {
            anilistId,
          },
          include: {
            anime: true,
          },
        });
        if (seasonByAnilistId) {
          anime = seasonByAnilistId.anime;
        }
      }
    }

    if (!anime) {
      res.status(500).json({
        message: `[Anime Controller] Anime #${anilistId} could not be resolved or persisted`,
      });
      return;
    }

    // ============================================================
    // 3. Find requested season
    // ============================================================

    let targetSeasonNumber = seasonNumber;
    let season = null;

    if (targetSeasonNumber > 0) {
      season = await prisma.animeSeason.findUnique({
        where: {
          animeId_number: {
            animeId: anime.id,
            number: targetSeasonNumber,
          },
        },
      });
    }

    if (!season && seasonByAnilistId && seasonByAnilistId.animeId === anime.id) {
      season = seasonByAnilistId;
      targetSeasonNumber = season.number;
    }

    if (!season) {
      season = await prisma.animeSeason.findFirst({
        where: {
          animeId: anime.id,
          anilistId,
        },
      });
      if (season) {
        targetSeasonNumber = season.number;
      }
    }

    // ============================================================
    // 4. Season does not exist
    //    → Run requested-season resolution
    // ============================================================

    if (!season) {
      console.log(
        `[Anime Controller] Season ${targetSeasonNumber} for Anime #${anilistId} not found. Resolving requested season...`
      );

      await mapRequestedSeason(anime.anilistId, targetSeasonNumber);

      if (targetSeasonNumber > 0) {
        season = await prisma.animeSeason.findUnique({
          where: {
            animeId_number: {
              animeId: anime.id,
              number: targetSeasonNumber,
            },
          },
        });
      }

      if (!season) {
        season = await prisma.animeSeason.findFirst({
          where: {
            animeId: anime.id,
            anilistId,
          },
        });
      }
    }

    if (!season) {
      res.status(404).json({
        message: `[Anime Controller] Season ${seasonNumber} for Anime #${anilistId} could not be resolved after mapping.`,
      });
      return;
    }

    // ============================================================
    // 5. Check episodes
    // ============================================================

    const isPaginated = limit !== undefined;
    const paginationOffset = offset ?? 0;

    let episodes = await prisma.episode.findMany({
      where: {
        seasonId: season.id,
      },

      select: {
        id: true,
        number: true,
        title: true,
        thumbnail: true,
      },

      orderBy: {
        number: "asc",
      },

      ...(isPaginated
        ? {
            skip: paginationOffset,
            take: limit,
          }
        : {}),
    });

    // ============================================================
    // 6. No episodes
    //    → Sync if provider mapping exists, or lazily resolve season
    // ============================================================

    if (episodes.length === 0) {
      const isMarkedNoContent = season.providerId?.startsWith("na_");

      if (!isMarkedNoContent || season.anilistId) {
        const providerMappingCount =
          await prisma.animeSeasonProviderMapping.count({
            where: { seasonId: season.id },
          });

        if (providerMappingCount > 0 || (season.provider && season.providerId) || season.anilistId) {
          console.log(
            `[Anime Controller] No episodes found for season ${season.id}. Syncing...`
          );
          try {
            await syncSeasonEpisodes(season.id);
          } catch (syncErr: any) {
            console.warn(
              `[Anime Controller] Syncing episodes failed for season ${season.id}:`,
              syncErr.message
            );
          }
        } else {
          // Season skeleton exists without provider mappings: lazily resolve this season!
          console.log(
            `[Anime Controller] Season ${season.number} (id: ${season.id}) has unmapped provider. Lazily resolving season...`
          );
          await mapRequestedSeason(season.anilistId ?? anime.anilistId, season.number);
        }

        episodes = await prisma.episode.findMany({
          where: {
            seasonId: season.id,
          },

          select: {
            id: true,
            number: true,
            title: true,
            thumbnail: true,
          },

          orderBy: {
            number: "asc",
          },

          ...(isPaginated
            ? {
                skip: paginationOffset,
                take: limit,
              }
            : {}),
        });
      }
    }

    // ============================================================
    // 7. Get all seasons with episode counts
    // ============================================================

    const seasons = await prisma.animeSeason.findMany({
      where: {
        animeId: anime.id,
      },

      orderBy: {
        number: "asc",
      },

      select: {
        id: true,
        number: true,
        title: true,
        anilistId: true,

        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });

    console.log(
      `[Performance] total getSeasonEpisodes request time: ${(performance.now() - reqStart).toFixed(1)} ms`
    );

    // ============================================================
    // 8. Return watch data
    // ============================================================

    const responsePayload: any = {
      anime: {
        id: anime.id,
        anilistId: anime.anilistId,
        title: anime.title,
        description: anime.description,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
      },

      seasons: seasons.map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        episodeCount: item._count.episodes,
        anilistId: item.anilistId ?? (item.number === 1 ? anime.anilistId : null),
        anilistIds: item.anilistId ? [item.anilistId] : (item.number === 1 ? [anime.anilistId] : []),
      })),

      season: {
        id: season.id,
        number: season.number,
        title: season.title,
        anilistId: season.anilistId ?? (season.number === 1 ? anime.anilistId : null),
        episodes,
      },
    };

    if (isPaginated && limit !== undefined) {
      const currentSeasonSummary = seasons.find((s) => s.id === season.id);
      const totalCount =
        currentSeasonSummary?._count.episodes ??
        (await prisma.episode.count({ where: { seasonId: season.id } }));

      responsePayload.pagination = {
        offset: paginationOffset,
        limit,
        total: totalCount,
        hasMore: paginationOffset + limit < totalCount,
      };
    }

    res.status(200).json(responsePayload);
  } catch (error: unknown) {
    console.error(
      "[Anime Controller] Failed to get season episodes:",
      error
    );

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}