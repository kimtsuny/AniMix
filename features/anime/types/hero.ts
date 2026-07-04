export interface HeroAnime {
  id: number;

  title: string;

  bannerImage: string | null;

  coverImage: string;

  score: number | null;

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
}