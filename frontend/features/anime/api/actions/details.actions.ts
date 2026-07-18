import { getAnimeEpisodes } from "../services/details";

export async function fetchSeasonEpisodes(seasonId: number) {
  try {
    return await getAnimeEpisodes(seasonId);
  } catch (error) {
    console.error("Failed to fetch season episodes:", error);
    return [];
  }
}
