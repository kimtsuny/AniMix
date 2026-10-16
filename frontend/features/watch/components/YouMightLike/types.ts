export interface WatchRecommendation {
  id: number;
  title: string;
  image: string;
  coverImage?: string;
  rating?: number | null;
  score?: number | null;
  year?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  format?: string | null;
  relationType?: string | null;
  status?: string | null;
}
