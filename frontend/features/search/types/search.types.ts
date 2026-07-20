// ─── UI-facing search result type ───
// No component should depend on GraphQL schema.
// Only this type is used in the presentation layer.

export interface SearchAnime {
  id: number;
  title: string;
  coverImage: string | null;
  bannerImage: string | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  averageScore: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  description: string | null;
}

// ─── Search state machine ───

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

// ─── Raw AniList GraphQL response types ───

export interface RawSearchMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    large: string | null;
  } | null;
  bannerImage: string | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  averageScore: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[] | null;
  description: string | null;
}

export interface SearchMediaResponse {
  Page: {
    media: RawSearchMedia[];
  };
}
