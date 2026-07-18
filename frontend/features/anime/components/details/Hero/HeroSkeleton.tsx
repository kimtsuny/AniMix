export function HeroSkeleton() {
  return (
    <div className="relative w-full overflow-hidden bg-black">
      {/* ─── Desktop Banner Skeleton (md+) ─── */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[85vh] bg-muted/20 animate-pulse" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 via-35% to-transparent" />
        <div 
          className="absolute inset-x-0 top-0 h-[100vh]" 
          style={{
            background: 'linear-gradient(to top, black 0%, black 15%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.15) 75%, transparent 100%)'
          }} 
        />
      </div>

      {/* ─── Mobile Banner Skeleton (<md) ─── */}
      <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[50vh] bg-muted/15 animate-pulse" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute inset-x-0 top-0 h-[65vh]"
          style={{
            background: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 80%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1700px] mx-auto px-6 md:px-16 xl:px-24 pt-24 pb-12 md:pt-[22vh] lg:pt-[28vh] md:pb-24 flex flex-col md:flex-row gap-8 lg:gap-16 items-center md:items-start">
        {/* Poster Skeleton */}
        <div className="w-[180px] md:w-[280px] lg:w-[320px] shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl bg-muted/40 aspect-[2/3] animate-pulse" />

        {/* Info Skeleton */}
        <div className="flex-1 flex flex-col items-center md:items-start gap-5 w-full mt-4 md:mt-10 lg:mt-12">

          <div className="space-y-4 w-full flex flex-col items-center md:items-start">
            <div className="h-12 md:h-20 bg-muted/40 rounded-lg w-3/4 md:w-2/3 animate-pulse" />
            <div className="h-6 md:h-8 bg-muted/30 rounded-md w-1/2 md:w-1/3 animate-pulse" />
          </div>

          {/* Quick Stats Skeleton */}
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Format / Status Skeleton */}
          <div className="flex gap-3 mt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-20 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Stats Row Skeleton */}
          <div className="hidden md:flex gap-8 py-4 border-y border-white/10 w-full mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 bg-muted/20 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Genres Skeleton */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-20 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 w-full">
            <div className="h-12 w-full md:w-40 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-12 w-full md:w-36 bg-muted/30 rounded-xl animate-pulse" />
            <div className="h-12 w-12 bg-muted/30 rounded-xl hidden md:block animate-pulse" />
          </div>

        </div>
      </div>
    </div>
  );
}
