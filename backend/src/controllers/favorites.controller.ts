import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

interface AddFavoriteBody {
  animeId?: number;
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

export async function addFavorite(req: Request, res: Response): Promise<void> {
  try {
    const { animeId } = req.body as AddFavoriteBody;
    const userId = req.user!.id;

    if (!animeId) {
      res.status(400).json({
        message: "Anime ID is required",
      });
      return;
    }

    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        animeId,
      },
    });

    if (existingFavorite) {
      res.status(409).json({
        message: "Anime already in favorites",
      });
      return;
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        animeId,
      },
    });

    res.status(201).json({
      message: "Anime added to favorites",
      favorite,
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getFavorites(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      favorites,
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function removeFavorite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const animeId = Number(req.params.animeId);

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        animeId,
      },
    });

    if (!favorite) {
      res.status(404).json({
        message: "Favorite not found",
      });
      return;
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    res.status(200).json({
      message: "Anime removed from favorites",
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
