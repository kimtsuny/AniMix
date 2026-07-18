import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

export function EpisodesSkeleton() {
  return (
    <SectionContainer>
      <SectionHeader title="Episodes" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[280px] md:w-[320px] shrink-0">
            <div className="aspect-video rounded-lg bg-muted/40 animate-pulse mb-3" />
            <div className="h-3 bg-muted/30 rounded w-16 mb-2 animate-pulse" />
            <div className="h-4 bg-muted/30 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
