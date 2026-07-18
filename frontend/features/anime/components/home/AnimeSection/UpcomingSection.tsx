import type { SectionAnime } from "../../../types/section-anime";
import AnimeSection from "./AnimeSection";

interface UpcomingSectionProps {
  data: SectionAnime[];
}

export default function UpcomingSection({ data }: UpcomingSectionProps) {
  return (
    <AnimeSection
      title="Upcoming Anime"
      items={data}
      loading={false}
      error={null}
    />
  );
}
