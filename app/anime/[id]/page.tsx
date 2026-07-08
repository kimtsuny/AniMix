import { notFound } from "next/navigation";
import {
  getAnimeDetails,
  getAnimeRelations,
  getAnimeEpisodes,
  getAnimeCharacters,
  getAnimeStaff,
  getAnimeRecommendations,
  buildSeasonChain
} from "@/features/anime/api/services/details";
import { Hero } from "@/features/anime/components/details/Hero";
import { Synopsis } from "@/features/anime/components/details/Synopsis";
import { Characters } from "@/features/anime/components/details/Characters";
import { Staff } from "@/features/anime/components/details/Staff";
import { Recommendations } from "@/features/anime/components/details/Recommendations";
import { SeasonsAndEpisodes } from "@/features/anime/components/details/SeasonsAndEpisodes";
import { RelatedContent } from "@/features/anime/components/details/RelatedContent/RelatedContent";

export const revalidate = 3600; // Revalidate every hour

export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialSeasonId = parseInt(id, 10);

  // Fetch ALL data in parallel at the page level
  const [
    anime,
    relations,
    episodes,
    characters,
    staff,
    recommendations,
  ] = await Promise.all([
    getAnimeDetails(initialSeasonId),
    getAnimeRelations(initialSeasonId),
    getAnimeEpisodes(initialSeasonId),
    getAnimeCharacters(initialSeasonId),
    getAnimeStaff(initialSeasonId),
    getAnimeRecommendations(initialSeasonId),
  ]);

  // Handle not found
  if (!anime) {
    notFound();
  }

  // Fetch season chain
  const seasons = await buildSeasonChain(initialSeasonId, anime);

  // Exclude TV seasons from related content
  const seasonIds = new Set(seasons.map(s => s.id));
  const relatedContent = relations.filter(r => !seasonIds.has(r.id));

  const fallbackImage = anime.bannerImage || anime.coverImage.large;

  return (
    <main className="dark min-h-screen bg-black text-white pb-16">
      <Hero anime={anime} />

      <div className="relative z-10 flex w-full flex-col gap-10 px-6 md:px-22 pt-4 pb-8">          <SeasonsAndEpisodes
        seasons={seasons}
        initialEpisodes={episodes}
        initialSeasonId={initialSeasonId}
        fallbackImage={fallbackImage}
      />

        <Characters characters={characters} />
        <Staff staff={staff} />
        <Recommendations recommendations={recommendations} />
        <RelatedContent relations={relatedContent} />
      </div>
    </main>
  );
}