import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { getOrCreateAnime } from "../services/anime/anime.service.js";

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

    // animeId القادم من Frontend هو AniList ID
    if (!animeId || !Number.isInteger(animeId) || animeId <= 0) {
      res.status(400).json({
        message: "Valid AniList anime ID is required",
      });
      return;
    }

    // ---------------------------------------------------------
    // الحصول على الأنمي أو إنشاؤه
    // ---------------------------------------------------------

    const anime = await getOrCreateAnime(animeId);

    // ---------------------------------------------------------
    // التحقق هل هو موجود بالمفضلة
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // إضافة للمفضلة
    // ---------------------------------------------------------

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        animeId: anime.id,
      },

      include: {
        anime: true,
      },
    });

    res.status(201).json({
      message: "Anime added to favorites",
      favorite,
    });
  } catch (error: unknown) {
    console.error("ADD FAVORITE ERROR:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Internal server error",
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

    // الـ ID القادم من URL هو AniList ID
    const anilistId = Number(req.params.animeId);

    if (!Number.isInteger(anilistId) || anilistId <= 0) {
      res.status(400).json({
        message: "Invalid AniList ID",
      });
      return;
    }

    // ---------------------------------------------------------
    // نبحث عن Anime باستخدام AniList ID
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // نبحث عن Favorite باستخدام الـ ID الداخلي
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // حذف المفضلة
    // ---------------------------------------------------------

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