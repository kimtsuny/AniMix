"use client";

import { usePopularAnime } from "../../hooks/usePopularAnime";
import AnimeSection from "./AnimeSection";

export default function PopularSection() {
  const { data, loading, error } = usePopularAnime();

  return (
    <AnimeSection
      title="Popular Anime"
      items={data}
      loading={loading}
      error={error}
    />
  );
}
