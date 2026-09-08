import { WatchPageContent } from "@/features/watch/components/WatchPageContent";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ animeId: string; season: string; episode: string }>;
}) {
  const { animeId, season, episode } = await params;

  return (
    <WatchPageContent
      animeId={animeId}
      season={season}
      episode={episode}
    />
  );
}
