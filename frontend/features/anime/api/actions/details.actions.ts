import { getAnimeEpisodes } from "../services/details";

export async function fetchSeasonEpisodes(
  seasonId: number,
  rootAnimeId?: number,
  seasonNumber: number = 0
) {
  try {
    return await getAnimeEpisodes(rootAnimeId || seasonId, seasonNumber);
  } catch (error) {
    console.error("Failed to fetch season episodes:", error);
    return [];
  }
}
