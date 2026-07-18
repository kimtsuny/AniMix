import { Recommendation } from "@/features/anime/types/recommendation";

export function mapRecommendations(data: any): Recommendation[] {
  if (!data?.Media?.recommendations?.nodes) return [];

  return data.Media.recommendations.nodes
    .filter((node: any) => node.mediaRecommendation)
    .map((node: any) => ({
      id: node.mediaRecommendation.id,
      title: node.mediaRecommendation.title?.english || node.mediaRecommendation.title?.romaji || "Unknown Title",
      coverImage: node.mediaRecommendation.coverImage?.large || null,
      rating: node.rating || 0,
      episodes: node.mediaRecommendation.episodes || null,
      format: node.mediaRecommendation.format || null,
    }));
}
