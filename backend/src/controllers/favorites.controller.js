import prisma from "../config/prisma.js";

export async function addFavorite(req, res) {
  try {
    const { animeId } = req.body;
    const userId = req.user.id;

    if (!animeId) {
      return res.status(400).json({
        message: "Anime ID is required",
      });
    }

    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        animeId,
      },
    });

    if (existingFavorite) {
      return res.status(409).json({
        message: "Anime already in favorites",
      });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        animeId,
      },
    });

    return res.status(201).json({
      message: "Anime added to favorites",
      favorite,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}


export async function getFavorites(req, res) {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      favorites,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function removeFavorite(req, res) {
  try {
    const userId = req.user.id;
    const animeId = Number(req.params.animeId);

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        animeId,
      },
    });

    if (!favorite) {
      return res.status(404).json({
        message: "Favorite not found",
      });
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    return res.status(200).json({
      message: "Anime removed from favorites",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}