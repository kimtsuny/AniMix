export interface Recommendation {
  id: number;
  title: string;
  coverImage: string | null;
  rating: number;
  episodes: number | null;
  format: string | null;
}
