import { HeroCarousel, getHeroAnime } from "@/features/anime";

export default async function HomePage() {
    const heroData = await getHeroAnime().catch(() => []);

    return (
        <main className="min-h-screen">
            <HeroCarousel data={heroData} />
        </main>
    );
}
