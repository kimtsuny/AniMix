import {
    HeroCarousel,
    LazySection,
    TrendingSection,
    PopularSection,
    TopRatedSection,
    SeasonSection,
    UpcomingSection,
    getHeroAnime,
    getTrendingAnime,
    getPopularAnime,
    getTopRatedAnime,
    getSeasonAnime,
    getUpcomingAnime,
} from "@/features/anime";
import type { HeroAnime, SectionAnime } from "@/features/anime";
import Profiler from "./_profiler";

function extractData<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === "fulfilled" ? result.value : fallback;
}

export default async function AnimePage() {
    const [heroResult, trendingResult, popularResult, topRatedResult, seasonResult, upcomingResult] =
        await Promise.allSettled([
            getHeroAnime(),
            getTrendingAnime(),
            getPopularAnime(),
            getTopRatedAnime(),
            getSeasonAnime({ season: "SUMMER", seasonYear: 2026 }),
            getUpcomingAnime(),
        ]);

    const heroData = extractData<HeroAnime[]>(heroResult, []);
    const trendingData = extractData<SectionAnime[]>(trendingResult, []);
    const popularData = extractData<SectionAnime[]>(popularResult, []);
    const topRatedData = extractData<SectionAnime[]>(topRatedResult, []);
    const seasonData = extractData<SectionAnime[]>(seasonResult, []);
    const upcomingData = extractData<SectionAnime[]>(upcomingResult, []);

    return (
        <main className="min-h-screen w-full">
            <Profiler />
            <HeroCarousel data={heroData} />

            <div className="relative z-10 flex w-full flex-col gap-10 px-6 md:px-22 pt-4 pb-8 -mt-4">
                <TrendingSection data={trendingData} />
                <LazySection title="Popular Anime">
                    <PopularSection data={popularData} />
                </LazySection>
                <LazySection title="Top Rated">
                    <TopRatedSection data={topRatedData} />
                </LazySection>
                <LazySection title="This Season">
                    <SeasonSection data={seasonData} />
                </LazySection>
                <LazySection title="Upcoming Anime">
                    <UpcomingSection data={upcomingData} />
                </LazySection>
            </div>
        </main>
    );
}
