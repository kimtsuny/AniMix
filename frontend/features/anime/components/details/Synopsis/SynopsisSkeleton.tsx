import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";

export function SynopsisSkeleton() {
  return (
    <SectionContainer>
      <SectionHeader title="Synopsis" />
      <div className="space-y-3">
        <div className="h-4 bg-muted/40 rounded-md w-full animate-pulse" />
        <div className="h-4 bg-muted/40 rounded-md w-full animate-pulse" />
        <div className="h-4 bg-muted/40 rounded-md w-[90%] animate-pulse" />
        <div className="h-4 bg-muted/40 rounded-md w-[95%] animate-pulse" />
      </div>
      <div className="h-6 w-24 bg-muted/30 rounded-md mt-2 animate-pulse" />
    </SectionContainer>
  );
}
