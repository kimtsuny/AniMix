import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { mapAnimeToAnimeParadise } from "../services/anime/anime-mapping.service.js";
import { syncSeasonEpisodes } from "../services/anime/episode.service.js";

export async function getSeasonEpisodes(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const anilistId = Number(req.params.animeId);
    const seasonNumber = Number(req.params.seasonNumber);

    if (
      !Number.isInteger(anilistId) ||
      anilistId <= 0 ||
      !Number.isInteger(seasonNumber) ||
      seasonNumber <= 0
    ) {
      res.status(400).json({
        message: "Invalid anime ID or season number",
      });
      return;
    }

    // ============================================================
    // 1. Find Anime in our database
    // ============================================================

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

    // ============================================================
    // 2. Anime does not exist
    //    → Run franchise candidate matching & persistence
    // ============================================================

    if (!anime) {
      console.log(
        `[Anime Controller] Anime #${anilistId} not found in database. Running franchise mapping...`
      );

      await mapAnimeToAnimeParadise(anilistId);

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

    let season = await prisma.animeSeason.findUnique({
      where: {
        animeId_number: {
          animeId: anime.id,
          number: seasonNumber,
        },
      },
    });

    if (!season && seasonByAnilistId && seasonByAnilistId.animeId === anime.id) {
      season = seasonByAnilistId;
    }

    // ============================================================
    // 4. Season does not exist
    //    → Run franchise mapping reconciliation
    // ============================================================

    if (!season) {
      console.log(
        `[Anime Controller] Season ${seasonNumber} for Anime #${anilistId} not found. Running reconciliation...`
      );

      await mapAnimeToAnimeParadise(anime.anilistId);

      // Re-query AnimeSeason from database
      season = await prisma.animeSeason.findUnique({
        where: {
          animeId_number: {
            animeId: anime.id,
            number: seasonNumber,
          },
        },
      });

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
    });

    // ============================================================
    // 6. No episodes
    //    → Fetch episodes from AnimeParadise and save them
    // ============================================================

    if (episodes.length === 0) {
      console.log(
        `[Anime Controller] No episodes found for season ${season.id}. Syncing...`
      );

      await syncSeasonEpisodes(season.id);

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
      });
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

        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });

    // ============================================================
    // 8. Return watch data
    // ============================================================

    res.status(200).json({
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
      })),

      season: {
        id: season.id,
        number: season.number,
        title: season.title,
        episodes,
      },
    });
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