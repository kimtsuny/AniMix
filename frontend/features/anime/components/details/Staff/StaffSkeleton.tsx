import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

export function StaffSkeleton() {
  return (
    <SectionContainer>
      <SectionHeader title="Staff" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-[140px] md:w-[160px] shrink-0 text-center">
            <div className="aspect-[3/4] rounded-lg bg-muted/40 animate-pulse mb-3" />
            <div className="h-4 bg-muted/30 rounded w-3/4 mx-auto mb-1.5 animate-pulse" />
            <div className="h-3 bg-muted/20 rounded w-1/2 mx-auto animate-pulse" />
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
