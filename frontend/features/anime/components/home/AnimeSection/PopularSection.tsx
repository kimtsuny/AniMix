import type { SectionAnime } from "../../../types/section-anime";
import AnimeSection from "./AnimeSection";

interface PopularSectionProps {
  data: SectionAnime[];
}

export default function PopularSection({ data }: PopularSectionProps) {
  return (
    <AnimeSection
      title="Popular Anime"
      items={data}
      loading={false}
      error={null}
    />
  );
}
