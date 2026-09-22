import prisma from "../../config/prisma.js";
import { getAnimeById } from "../anilist/anilist.service.js";

export async function getOrCreateAnime(anilistId: number) {
  // 1. نبحث عن الأنمي في قاعدة بياناتنا
  const existingAnime = await prisma.anime.findUnique({
    where: {
      anilistId,
    },
  });

  // موجود؟ نرجعه مباشرة
  if (existingAnime) {
    return existingAnime;
  }

  // 2. غير موجود؟
  // نجيبه من AniList
  const anime = await getAnimeById(anilistId);

  // 3. اختيار عنوان مناسب
  const title =
    anime.title.english ||
    anime.title.romaji ||
    anime.title.native ||
    `Anime ${anime.id}`;

  // 4. حفظ الأنمي في قاعدة بياناتنا
  const createdAnime = await prisma.anime.create({
    data: {
      anilistId: anime.id,
      title,
      description: anime.description,
      coverImage:
        anime.coverImage.extraLarge ||
        anime.coverImage.large,
      bannerImage: anime.bannerImage,
    },
  });

  return createdAnime;
}