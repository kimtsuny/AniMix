"use client";

import { useTopRatedAnime } from "../../hooks/useTopRatedAnime";
import AnimeSection from "./AnimeSection";

export default function TopRatedSection() {
  const { data, loading, error } = useTopRatedAnime();

  return (
    <AnimeSection
      title="Top Rated"
      items={data}
      loading={loading}
      error={error}
    />
  );
}
