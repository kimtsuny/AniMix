/** Format filter options for the Favorites page */
export type FavoriteFilter = "All" | "TV" | "Movie" | "OVA" | "ONA";

/** Sort options for the Favorites page */
export type FavoriteSort = "newest" | "highest" | "alphabetical";

/** Shape of a single favorite anime entry */
export interface FavoriteAnime {
  id: number;
  title: string;
  coverImage: string;
  year: number;
  format: "TV" | "Movie" | "OVA" | "ONA";
  score: number;
  episodes: number;
  genres: string[];
  favorite: boolean;
  /** ISO timestamp — used for "Newest Added" sort */
  addedAt: string;
}
