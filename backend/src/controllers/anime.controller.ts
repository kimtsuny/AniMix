import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

export async function getSeasonEpisodes(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const animeId = Number(req.params.animeId);
    const seasonNumber = Number(req.params.seasonNumber);

    if (
      !Number.isInteger(animeId) ||
      animeId <= 0 ||
      !Number.isInteger(seasonNumber) ||
      seasonNumber <= 0
    ) {
      res.status(400).json({
        message: "Invalid anime ID or season number",
      });
      return;
    }

    const anime = await prisma.anime.findUnique({
      where: {
        id: animeId,
      },

      select: {
        id: true,
        anilistId: true,
        title: true,
        description: true,
        coverImage: true,
        bannerImage: true,

        seasons: {
          orderBy: {
            number: "asc",
          },

          select: {
            id: true,
            number: true,
            title: true,

            episodes: {
              orderBy: {
                number: "asc",
              },

              select: {
                id: true,
                number: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      },
    });

    if (!anime) {
      res.status(404).json({
        message: "Anime not found",
      });
      return;
    }

    const season = anime.seasons.find(
      (item) => item.number === seasonNumber
    );

    if (!season) {
      res.status(404).json({
        message: `Season ${seasonNumber} not found`,
      });
      return;
    }

    res.status(200).json({
      anime: {
        id: anime.id,
        anilistId: anime.anilistId,
        title: anime.title,
        description: anime.description,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
      },

      seasons: anime.seasons.map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        episodeCount: item.episodes.length,
      })),

      season: {
        id: season.id,
        number: season.number,
        title: season.title,
        episodes: season.episodes,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[Anime Controller] Failed to get season episodes:",
      error
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
