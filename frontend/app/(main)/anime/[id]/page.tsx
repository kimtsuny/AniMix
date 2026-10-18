import { notFound } from "next/navigation";
import { getAnimeDetailsPage } from "@/features/anime/api/services/details";
import { Hero } from "@/features/anime/components/details/Hero";
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

  // Fetch static metadata from AniList (fast server query, unblocks initial page render)
  const pageData = await getAnimeDetailsPage(initialSeasonId);

  // Handle not found
  if (!pageData || !pageData.details) {
    notFound();
  }

  const { details: anime, relations, characters, staff, recommendations } = pageData;

  // Filter out TV sequels and prequels from related content so they don't duplicate seasons
  const relatedContent = relations.filter(
    (r) =>
      !(
        (r.relationType === "PREQUEL" || r.relationType === "SEQUEL") &&
        r.format === "TV"
      )
  );

  const fallbackImage = anime.bannerImage || anime.coverImage.large;

  // Determine season number for direct sequel viewing if specified in title, defaulting to 1
  const titleSeasonMatch = (
    anime.title.english ||
    anime.title.romaji ||
    ""
  ).match(/season\s+(\d+)/i);
  const seasonNumber = titleSeasonMatch ? parseInt(titleSeasonMatch[1], 10) : 1;

  return (
    <main className="dark min-h-screen bg-black text-white pb-16">
      <Hero anime={anime} seasonNumber={seasonNumber} />

      <div className="relative z-10 flex w-full flex-col gap-10 px-6 md:px-22 pt-24 md:pt-28 pb-8">
        <SeasonsAndEpisodes
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