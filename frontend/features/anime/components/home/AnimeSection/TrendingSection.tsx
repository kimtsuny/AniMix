import type { SectionAnime } from "../../../types/section-anime";
import AnimeSection from "./AnimeSection";

interface TrendingSectionProps {
  data: SectionAnime[];
}

export default function TrendingSection({ data }: TrendingSectionProps) {
  return (
    <AnimeSection
      title="Trending Now"
      items={data}
      loading={false}
      error={null}
    />
  );
}
