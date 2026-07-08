import type { SectionAnime } from "../../../types/section-anime";
import AnimeSection from "./AnimeSection";

interface SeasonSectionProps {
  data: SectionAnime[];
}

export default function SeasonSection({ data }: SeasonSectionProps) {
  return (
    <AnimeSection
      title="This Season"
      items={data}
      loading={false}
      error={null}
    />
  );
}
