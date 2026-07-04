import { graphqlClient } from "@/shared/api/graphql-client";
import { HERO_ANIME_QUERY } from "../queries/hero.query";
import type { HeroAnime } from "../../types/hero";



type HeroAnimeResponse = {
  Page: {
    media: Array<{
      id: number;

      title: {
        english: string | null;
        romaji: string;
      };

      bannerImage: string | null;

      coverImage: {
        extraLarge: string;
      };

      averageScore: number | null;

      seasonYear: number | null;

      format: string;

      episodes: number | null;

      duration: number | null;

      genres: string[];

      description: string;

      trailer: {
        id: string;
        site: string;
      } | null;
    }>;
  };
};

export async function getHeroAnime(): Promise<HeroAnime[]> {
  const response = await graphqlClient.request<HeroAnimeResponse>(
    HERO_ANIME_QUERY
  );

  return response.Page.media.map((anime) => ({
    id: anime.id,

    title: anime.title.english ?? anime.title.romaji,

    bannerImage: anime.bannerImage,

    coverImage: anime.coverImage.extraLarge,

    score: anime.averageScore,

    seasonYear: anime.seasonYear,

    format: anime.format,

    episodes: anime.episodes,

    duration: anime.duration,

    genres: anime.genres.slice(0, 3),

    description: anime.description,

    trailer: anime.trailer,
  }));
}