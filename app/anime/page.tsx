import {
    HeroCarousel,
    TrendingSection,
    PopularSection,
    TopRatedSection,
    SeasonSection,
    UpcomingSection,
} from "@/features/anime";
import Profiler from "./_profiler";

export default function AnimePage() {
    return (
        <main className="min-h-screen w-full">
            <Profiler />
            <HeroCarousel />

            <div className="relative z-10 flex w-full flex-col gap-10 px-6 md:px-22 pt-4 pb-8 -mt-4">
                <TrendingSection />
                <PopularSection />
                <TopRatedSection />
                <SeasonSection />
                <UpcomingSection />
            </div>
        </main>
    );
}
