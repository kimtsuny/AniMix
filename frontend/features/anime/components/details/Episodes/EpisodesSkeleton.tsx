import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

interface EpisodesSkeletonProps {
  count?: number;
  showHeader?: boolean;
}

export function EpisodesSkeleton({
  count = 5,
  showHeader = false,
}: EpisodesSkeletonProps) {
  const content = (
    <div className="w-full overflow-hidden">
      <div className="flex gap-4 overflow-hidden -ml-4 pl-4 py-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[280px] md:w-[320px] shrink-0">
            <div className="aspect-video rounded-lg bg-white/5 animate-pulse mb-3 ring-1 ring-white/10" />
            <div className="h-3 bg-white/5 rounded w-16 mb-2 animate-pulse" />
            <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  if (showHeader) {
    return (
      <SectionContainer>
        <SectionHeader title="Episodes" />
        {content}
      </SectionContainer>
    );
  }

  return content;
}
