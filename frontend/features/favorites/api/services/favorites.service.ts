import { graphqlClient } from "@/shared/api/graphql-client";

import { getFavorites } from "../get-favorites";

import { FAVORITES_ANIME_QUERY } from "../queries/favorites.query";

import type { FavoriteAnime } from "../../types/favorite.types";

export async function getFavoriteAnime(): Promise<FavoriteAnime[]> {
  try {
    // 1. جلب سجلات المفضلة من قاعدة البيانات
    const response = await getFavorites();

    const favorites = response.favorites;

    // إذا المستخدم ما عنده مفضلات
    if (favorites.length === 0) {
      return [];
    }

    // 2. استخراج anime IDs
    const animeIds = favorites.map(
      (favorite) => favorite.animeId
    );

    // 3. جلب بيانات الأنمي من AniList
    const data = await graphqlClient.request(
      FAVORITES_ANIME_QUERY,
      {
        ids: animeIds,
      }
    );

    const animeList = data.Page.media;

    // 4. دمج بيانات قاعدة البيانات مع بيانات AniList
    return animeList.map((anime: any) => {
      const favorite = favorites.find(
        (favorite) => favorite.animeId === anime.id
      );

      return {
        id: anime.id,

        title:
          anime.title.english ||
          anime.title.romaji ||
          "Unknown",

        coverImage: anime.coverImage?.large || "",

        year: anime.seasonYear || 0,

        format: anime.format || "Unknown",

        score: anime.averageScore
          ? anime.averageScore / 10
          : 0,

        episodes: anime.episodes || 0,

        genres: anime.genres || [],

        favorite: true,

        addedAt: favorite?.createdAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error("Failed to fetch favorites:", error);

    return [];
  }
}