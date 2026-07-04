"use client";

import { useUpcomingAnime } from "../../hooks/useUpcomingAnime";
import AnimeSection from "./AnimeSection";

export default function UpcomingSection() {
  const { data, loading, error } = useUpcomingAnime();

  return (
    <AnimeSection
      title="Upcoming Anime"
      items={data}
      loading={loading}
      error={error}
    />
  );
}
