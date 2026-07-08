import type { SectionAnime } from "../../../types/section-anime";
import AnimeSection from "./AnimeSection";

interface TopRatedSectionProps {
  data: SectionAnime[];
}

export default function TopRatedSection({ data }: TopRatedSectionProps) {
  return (
    <AnimeSection
      title="Top Rated"
      items={data}
      loading={false}
      error={null}
    />
  );
}
