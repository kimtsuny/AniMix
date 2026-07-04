"use client";

import { useTrendingAnime } from "../../hooks/useTrendingAnime";
import AnimeSection from "./AnimeSection";

export default function TrendingSection() {
  const { data, loading, error } = useTrendingAnime();

  return (
    <AnimeSection
      title="Trending Now"
      items={data}
      loading={loading}
      error={error}
    />
  );
}
