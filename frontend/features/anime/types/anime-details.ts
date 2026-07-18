export interface AnimeDetails {
  id: number;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  description: string | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  };
  bannerImage: string | null;
  averageScore: number | null;
  rank: number | null;
  popularity: number | null;
  favorites: number | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  source: string | null;
  countryOfOrigin: string | null;
  studios: string[];
  trailer: {
    id: string | null;
    site: string | null;
    thumbnail: string | null;
  } | null;
}
