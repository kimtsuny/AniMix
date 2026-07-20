import type { RawSearchMedia, SearchAnime } from "../../types/search.types";

export function mapSearchAnime(raw: RawSearchMedia): SearchAnime {
  return {
    id: raw.id,
    title: raw.title.english ?? raw.title.romaji ?? raw.title.native ?? "Unknown Title",
    coverImage: raw.coverImage?.large ?? null,
    bannerImage: raw.bannerImage,
    episodes: raw.episodes,
    format: raw.format,
    status: raw.status,
    averageScore: raw.averageScore,
    season: raw.season,
    seasonYear: raw.seasonYear,
    genres: raw.genres ?? [],
    description: raw.description,
  };
}
