import type { SectionAnime } from "../../../types/section-anime";

export type RawSectionMedia = {
  id: number;

  title: {
    english: string | null;
    romaji: string;
  };

  coverImage: {
    extraLarge: string;
  };

  averageScore: number | null;

  format: string | null;

  episodes: number | null;

  season: string | null;

  seasonYear: number | null;

  status: string | null;
};

export type SectionMediaResponse = {
  Page: {
    media: RawSectionMedia[];
  };
};

export function mapSectionAnime(raw: RawSectionMedia): SectionAnime {
  return {
    id: raw.id,

    title: raw.title.english ?? raw.title.romaji,

    coverImage: raw.coverImage.extraLarge,

    score: raw.averageScore,

    format: raw.format,

    episodes: raw.episodes,

    season: raw.season,

    seasonYear: raw.seasonYear,

    status: raw.status,
  };
}
