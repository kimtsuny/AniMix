"use client";

import { useSeasonAnime } from "../../hooks/useSeasonAnime";
import AnimeSection from "./AnimeSection";

export default function SeasonSection() {
  const { data, loading, error } = useSeasonAnime();

  return (
    <AnimeSection
      title="This Season"
      items={data}
      loading={loading}
      error={error}
    />
  );
}
