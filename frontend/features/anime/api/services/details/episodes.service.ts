import { getSeasonEpisodes } from "@/features/watch/api/services/episode.service";
import { Episode } from "@/features/anime/types/episode";

export async function getAnimeEpisodes(
  id: string | number,
  seasonNumber: number = 0
): Promise<Episode[]> {
  try {
    const anilistId = Number(id);
    const data = await getSeasonEpisodes(anilistId, seasonNumber);
    const rootAnimeId = data.anime.anilistId || anilistId;
    const resolvedSeasonNumber =
      data.season.number || (seasonNumber > 0 ? seasonNumber : 1);

    return data.season.episodes.map((ep) => ({
      number: ep.number,
      title: ep.title
        ? ep.title.startsWith("Episode ")
          ? ep.title
          : `Episode ${ep.number} - ${ep.title}`
        : `Episode ${ep.number}`,
      thumbnail: ep.thumbnail,
      url: `/watch/${rootAnimeId}/${resolvedSeasonNumber}/${ep.number}`,
      site: "AniMix",
    }));
  } catch (error) {
    console.error("Failed to fetch anime episodes from AniMix backend:", error);
    return [];
  }
}
