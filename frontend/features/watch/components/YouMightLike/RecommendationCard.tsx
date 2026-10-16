import { memo } from "react";
import AnimeCard from "@/features/anime/components/home/AnimeSection/AnimeCard";
import type { SectionAnime } from "@/features/anime/types/section-anime";
import type { WatchRecommendation } from "./types";

export interface RecommendationCardProps {
  anime: WatchRecommendation;
}

export function RecommendationCard({ anime }: RecommendationCardProps) {
  const sectionAnime: SectionAnime = {
    id: anime.id,
    title: anime.title,
    coverImage: anime.coverImage || anime.image,
    score: anime.score ?? anime.rating ?? null,
    format: anime.format ?? null,
    episodes: anime.episodes ?? null,
    season: anime.season ?? null,
    seasonYear: anime.seasonYear ?? anime.year ?? null,
    status: anime.status ?? null,
  };

  return <AnimeCard anime={sectionAnime} size="compact" />;
}

export default memo(RecommendationCard);

