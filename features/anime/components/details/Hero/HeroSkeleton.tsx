import { LoadingContainer } from "../common/LoadingContainer";

export function HeroSkeleton() {
  return (
    <div className="relative w-full overflow-hidden bg-black">
      {/* Banner Skeleton */}
      <div className="absolute inset-0 h-[60vh] md:h-[80vh] w-full bg-muted/20 animate-pulse" />

      <div className="container relative z-10 mx-auto px-4 pt-24 pb-12 md:pt-40 md:pb-16 flex flex-col md:flex-row gap-8 md:gap-12 items-start">
        {/* Poster Skeleton */}
        <div className="w-[200px] md:w-[280px] shrink-0 mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl bg-muted/40 aspect-[2/3] animate-pulse" />

        {/* Info Skeleton */}
        <div className="flex-1 flex flex-col items-center md:items-start gap-6 w-full mt-4 md:mt-8">

          <div className="space-y-4 w-full flex flex-col items-center md:items-start">
            <div className="h-12 md:h-16 bg-muted/40 rounded-lg w-3/4 md:w-2/3 animate-pulse" />
            <div className="h-6 md:h-8 bg-muted/30 rounded-md w-1/2 md:w-1/3 animate-pulse" />
          </div>

          {/* Quick Stats Grid Skeleton */}
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-16 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Format / Status row Skeleton */}
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-20 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Detailed Stats Row Skeleton */}
          <div className="hidden md:flex gap-8 py-4 border-y border-border/40 w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 bg-muted/20 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Genres Skeleton */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-20 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
            <div className="h-12 w-40 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-12 w-36 bg-muted/30 rounded-xl animate-pulse" />
            <div className="h-12 w-12 bg-muted/30 rounded-xl hidden md:block animate-pulse" />
          </div>

        </div>
      </div>
    </div>
  );
}
