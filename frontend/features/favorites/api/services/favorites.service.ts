import { graphqlClient } from "@/shared/api/graphql-client";

import { getFavorites } from "../get-favorites";

import { FAVORITES_ANIME_QUERY } from "../queries/favorites.query";

import type { FavoriteAnime } from "../../types/favorite.types";

export async function getFavoriteAnime(): Promise<FavoriteAnime[]> {
  try {
    const response = await getFavorites();

    const favorites = response.favorites;

    if (favorites.length === 0) {
      return [];
    }

    // AniList IDs الحقيقية
    const anilistIds = favorites.map(
      (favorite) => favorite.anime.anilistId
    );

    const data = await graphqlClient.request(
      FAVORITES_ANIME_QUERY,
      {
        ids: anilistIds,
      }
    );

    const animeList = data.Page.media;

    return animeList.map((anime: any) => {
      const favorite = favorites.find(
        (favorite) =>
          favorite.anime.anilistId === anime.id
      );

      return {
        // نستخدم AniList ID كرابط صفحة الأنمي
        id: anime.id,

        title:
          anime.title.english ||
          anime.title.romaji ||
          "Unknown",

        coverImage:
          anime.coverImage?.extraLarge ||
          anime.coverImage?.large ||
          "",

        year: anime.seasonYear || 0,

        format:
          anime.format || "Unknown",

        score:
          anime.averageScore
            ? anime.averageScore / 10
            : 0,

        episodes:
          anime.episodes || 0,

        genres:
          anime.genres || [],

        favorite: true,

        addedAt:
          favorite?.createdAt ||
          new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error(
      "Failed to fetch favorites:",
      error
    );

    return [];
  }
}