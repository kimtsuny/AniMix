import { graphqlClient } from "@/shared/api/graphql-client";
import { RECOMMENDATIONS_QUERY } from "../../queries/details/recommendations.query";
import type { WatchRecommendation } from "@/features/watch/components/YouMightLike/types";
import { isAnimeAllowed } from "@/shared/lib/content-filter";

interface AniListRecommendationsResponse {
  Media?: {
    id: number;
    isAdult?: boolean;
    genres?: string[] | null;
    recommendations?: {
      nodes?: Array<{
        rating?: number;
        mediaRecommendation?: {
          id: number;
          isAdult?: boolean;
          genres?: string[] | null;
          title?: {
            english?: string | null;
            romaji?: string | null;
          };
          coverImage?: {
            large?: string | null;
          };
          episodes?: number | null;
          format?: string | null;
          averageScore?: number | null;
          season?: string | null;
          seasonYear?: number | null;
          startDate?: {
            year?: number | null;
          };
        } | null;
      }>;
    };
    relations?: {
      edges?: Array<{
        relationType?: string;
        node?: {
          id: number;
          isAdult?: boolean;
          genres?: string[] | null;
          type?: string;
          title?: {
            english?: string | null;
            romaji?: string | null;
          };
          coverImage?: {
            large?: string | null;
          };
          format?: string | null;
          status?: string | null;
          episodes?: number | null;
          averageScore?: number | null;
          season?: string | null;
          seasonYear?: number | null;
          startDate?: {
            year?: number | null;
          };
        } | null;
      }>;
    };
  } | null;
}

export function parseAnimeRecommendations(
  data: AniListRecommendationsResponse | null | undefined,
  currentAnimeId: number
): WatchRecommendation[] {
  if (!data?.Media || !isAnimeAllowed(data.Media)) {
    return [];
  }

  const seenIds = new Set<number>([currentAnimeId]);
  const results: WatchRecommendation[] = [];

  // 1. Process relations (prioritize direct related anime e.g. sequels, spin-offs, side stories)
  if (Array.isArray(data.Media.relations?.edges)) {
    for (const edge of data.Media.relations.edges) {
      const node = edge?.node;
      if (!node || !node.id || seenIds.has(node.id)) continue;
      if (!isAnimeAllowed(node)) continue;
      if (node.type !== "ANIME") continue;
      if (!node.coverImage?.large) continue;

      const title =
        node.title?.english || node.title?.romaji || "Unknown Title";
      const seasonYear = node.seasonYear ?? node.startDate?.year ?? null;

      seenIds.add(node.id);
      results.push({
        id: node.id,
        title,
        image: node.coverImage.large,
        coverImage: node.coverImage.large,
        rating: node.averageScore
          ? Number((node.averageScore / 10).toFixed(1))
          : null,
        score: node.averageScore
          ? Number((node.averageScore / 10).toFixed(1))
          : null,
        year: seasonYear,
        season: node.season ?? null,
        seasonYear,
        episodes: node.episodes ?? null,
        format: node.format ?? null,
        relationType: edge.relationType ?? null,
        status: node.status ?? null,
      });
    }
  }

  // 2. Process community recommendations
  if (Array.isArray(data.Media.recommendations?.nodes)) {
    for (const node of data.Media.recommendations.nodes) {
      const media = node?.mediaRecommendation;
      if (!media || !media.id || seenIds.has(media.id)) continue;
      if (!isAnimeAllowed(media)) continue;
      if (!media.coverImage?.large) continue;

      const title =
        media.title?.english || media.title?.romaji || "Unknown Title";
      const seasonYear = media.seasonYear ?? media.startDate?.year ?? null;

      seenIds.add(media.id);
      results.push({
        id: media.id,
        title,
        image: media.coverImage.large,
        coverImage: media.coverImage.large,
        rating: media.averageScore
          ? Number((media.averageScore / 10).toFixed(1))
          : node.rating && node.rating > 0
          ? Number(node.rating)
          : null,
        score: media.averageScore
          ? Number((media.averageScore / 10).toFixed(1))
          : node.rating && node.rating > 0
          ? Number(node.rating)
          : null,
        year: seasonYear,
        season: media.season ?? null,
        seasonYear,
        episodes: media.episodes ?? null,
        format: media.format ?? null,
      });
    }
  }

  return results;
}

export async function getAnimeRecommendations(
  animeId: number
): Promise<WatchRecommendation[]> {
  try {
    if (!animeId || !Number.isFinite(animeId) || animeId <= 0) {
      return [];
    }

    const data = await graphqlClient.request<AniListRecommendationsResponse>(
      RECOMMENDATIONS_QUERY,
      { id: Number(animeId) }
    );

    return parseAnimeRecommendations(data, animeId);
  } catch (error) {
    console.error("Failed to fetch anime recommendations:", error);
    return [];
  }
}
