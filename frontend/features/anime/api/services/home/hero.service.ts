import { graphqlClient } from "@/shared/api/graphql-client";
import { HERO_ANIME_QUERY } from "../../queries/home/hero.query";
import type { HeroAnime } from "../../../types/hero";
import { filterAllowedAnime } from "@/shared/lib/content-filter";

type HeroAnimeResponse = {
  Page: {
    media: Array<{
      id: number;
      isAdult?: boolean | null;

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

  const allowedMedia = filterAllowedAnime(response.Page.media).slice(0, 5);

  return allowedMedia.map((anime) => ({
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