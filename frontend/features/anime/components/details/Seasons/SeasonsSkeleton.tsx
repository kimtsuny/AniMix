import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

interface SeasonsSkeletonProps {
  count?: number;
}

export function SeasonsSkeleton({ count = 4 }: SeasonsSkeletonProps) {
  return (
    <SectionContainer>
      <SectionHeader title="SEASONS" />
      <div className="border-b border-white/30" />
      <div
        className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 animate-pulse"
          />
        ))}
      </div>
    </SectionContainer>
  );
}
