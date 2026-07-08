import { HeroSkeleton } from "@/features/anime/components/details/Hero";
import { SynopsisSkeleton } from "@/features/anime/components/details/Synopsis";
import { RelatedSeriesSkeleton } from "@/features/anime/components/details/RelatedSeries";

export default function AnimeDetailsLoading() {
  return (
    <main className="dark min-h-screen bg-black text-white pb-16">
      <HeroSkeleton />
      <div className="container mx-auto px-4 py-8 space-y-12">
        <SynopsisSkeleton />
        <RelatedSeriesSkeleton />
        <div className="h-64 bg-muted/20 animate-pulse rounded-xl" />
        <div className="h-64 bg-muted/20 animate-pulse rounded-xl" />
      </div>
    </main>
  );
}
