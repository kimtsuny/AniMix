import { notFound } from "next/navigation";
import { getAnimeDetailsPage } from "@/features/anime/api/services/details";
import { getSeasonEpisodes } from "@/features/watch/api/services/episode.service";
import { Episode } from "@/features/anime/types/episode";
import { Relation } from "@/features/anime/types/relation";
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

  // Fetch static metadata from AniList and watch-page seasons/episodes from AniMix
  const [pageData, seasonEpisodesData] = await Promise.all([
    getAnimeDetailsPage(initialSeasonId),
    getSeasonEpisodes(initialSeasonId, 0).catch((err) => {
      console.warn("Failed to fetch AniMix season episodes on details page:", err);
      return null;
    }),
  ]);

  // Handle not found
  if (!pageData || !pageData.details) {
    notFound();
  }

  const { details: anime, relations, characters, staff, recommendations } = pageData;

  const rootAnimeId = seasonEpisodesData?.anime?.anilistId || initialSeasonId;
  const currentSeasonNumber = seasonEpisodesData?.season?.number || 1;

  // Map AniMix backend seasons to Relation format with exact AniList IDs & season numbers
  const seasons: (Relation & { number?: number })[] = (
    seasonEpisodesData?.seasons ?? []
  ).map((s) => ({
    id: s.anilistId ?? s.id ?? s.number,
    number: s.number,
    title: s.title || `Season ${s.number}`,
    coverImage: null,
    relationType: "SEASON",
    format: "TV",
    status: null,
    startDate: null,
  }));

  // Map AniMix backend episodes to Episode format with direct watch URLs
  const episodes: Episode[] = (
    seasonEpisodesData?.season?.episodes ?? []
  ).map((ep) => ({
    number: ep.number,
    title: ep.title
      ? ep.title.startsWith("Episode ")
        ? ep.title
        : `Episode ${ep.number} - ${ep.title}`
      : `Episode ${ep.number}`,
    thumbnail: ep.thumbnail,
    url: `/watch/${rootAnimeId}/${currentSeasonNumber}/${ep.number}`,
    site: "AniMix",
  }));

  // Exclude TV seasons from related content
  const seasonIds = new Set(seasons.map((s) => s.id));
  const relatedContent = relations.filter((r) => !seasonIds.has(r.id));

  const fallbackImage = anime.bannerImage || anime.coverImage.large;

  // Determine the season number for the current anime within its seasons list
  const currentSeason = seasons.find((s) => s.id === anime.id);
  const seasonNumber = currentSeason?.number ?? currentSeasonNumber;

  return (
    <main className="dark min-h-screen bg-black text-white pb-16">
      <Hero anime={anime} seasonNumber={seasonNumber} />

      <div className="relative z-10 flex w-full flex-col gap-10 px-6 md:px-22 pt-24 md:pt-28 pb-8">
        <SeasonsAndEpisodes
          seasons={seasons}
          initialEpisodes={episodes}
          initialSeasonId={initialSeasonId}
          fallbackImage={fallbackImage}
          rootAnimeId={rootAnimeId}
        />

        <Characters characters={characters} />
        <Staff staff={staff} />
        <Recommendations recommendations={recommendations} />
        <RelatedContent relations={relatedContent} />
      </div>
    </main>
  );
}