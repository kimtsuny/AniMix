import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

interface AddFavoriteBody {
  animeId?: number;
}

// ---------------------------------------------------------------------------
// Add Favorite
// ---------------------------------------------------------------------------

export async function addFavorite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { animeId } = req.body as AddFavoriteBody;
    const userId = req.user!.id;

    if (!animeId) {
      res.status(400).json({
        message: "Anime ID is required",
      });
      return;
    }

    // animeId القادم من الـ Frontend هو AniList ID
    // نبحث عن الأنمي داخل قاعدة بياناتنا
    const anime = await prisma.anime.findUnique({
      where: {
        anilistId: animeId,
      },
    });

    if (!anime) {
      res.status(404).json({
        message: "Anime not found in database",
      });
      return;
    }

    // نتأكد أن الأنمي غير موجود مسبقًا في المفضلة
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId: anime.id,
        },
      },
    });

    if (existingFavorite) {
      res.status(409).json({
        message: "Anime already in favorites",
      });
      return;
    }

    // هنا نستخدم Anime.id الداخلي وليس AniList ID
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        animeId: anime.id,
      },
    });

    res.status(201).json({
      message: "Anime added to favorites",
      favorite,
    });
  } catch (error: unknown) {
    console.error("ADD FAVORITE ERROR:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// ---------------------------------------------------------------------------
// Get Favorites
// ---------------------------------------------------------------------------

export async function getFavorites(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        anime: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      favorites,
    });
  } catch (error: unknown) {
    console.error("GET FAVORITES ERROR:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// ---------------------------------------------------------------------------
// Remove Favorite
// ---------------------------------------------------------------------------

export async function removeFavorite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    // الـ ID القادم من الـ URL هو AniList ID
    const anilistId = Number(req.params.animeId);

    if (!Number.isInteger(anilistId) || anilistId <= 0) {
      res.status(400).json({
        message: "Invalid Anime ID",
      });
      return;
    }

    // نبحث عن الأنمي باستخدام AniList ID
    const anime = await prisma.anime.findUnique({
      where: {
        anilistId,
      },
    });

    if (!anime) {
      res.status(404).json({
        message: "Anime not found",
      });
      return;
    }

    // نبحث عن المفضلة باستخدام الـ ID الداخلي للأنمي
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId: anime.id,
        },
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
    console.error("REMOVE FAVORITE ERROR:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}