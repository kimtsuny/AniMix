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