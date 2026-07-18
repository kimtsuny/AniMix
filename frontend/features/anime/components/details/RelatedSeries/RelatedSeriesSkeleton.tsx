import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

export function RelatedSeriesSkeleton() {
  return (
    <SectionContainer>
      <SectionHeader title="Related Series" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-[160px] md:w-[200px] shrink-0">
            <div className="aspect-[2/3] rounded-lg bg-muted/40 animate-pulse mb-2" />
            <div className="h-4 bg-muted/30 rounded w-full mb-1 animate-pulse" />
            <div className="h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
