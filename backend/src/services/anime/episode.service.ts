import prisma from "../../config/prisma.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";

export async function syncSeasonEpisodes(
  seasonId: number
) {
  // 1. Get season
  const season = await prisma.animeSeason.findUnique({
    where: {
      id: seasonId,
    },
  });

  if (!season) {
    throw new Error(
      `Anime season ${seasonId} not found`
    );
  }

  // 2. Make sure the season has a provider mapping
  if (!season.provider || !season.providerId) {
    throw new Error(
      `No provider mapping found for season ${seasonId}`
    );
  }

  // 3. Currently AnimeParadise is our provider
  if (season.provider !== "animeparadise") {
    throw new Error(
      `Unsupported episode provider: ${season.provider}`
    );
  }

  // 4. Fetch episodes from AnimeParadise
  const episodes =
    await animeParadiseProvider.getEpisodes(
      season.providerId
    );

  if (episodes.length === 0) {
    throw new Error(
      `No episodes found for season ${seasonId}`
    );
  }

  console.log(
    `[Episodes] Found ${episodes.length} episodes for season ${seasonId}`
  );

  // 5. Save episodes
  for (const episode of episodes) {
    const dbEpisode = await prisma.episode.upsert({
      where: {
        seasonId_number: {
          seasonId,
          number: episode.number,
        },
      },

      update: {
        title: episode.title,
      },

      create: {
        seasonId,
        number: episode.number,
        title: episode.title,
      },
    });

    // 6. Save provider mapping
    await prisma.episodeProviderMapping.upsert({
      where: {
        episodeId_provider: {
          episodeId: dbEpisode.id,
          provider: "animeparadise",
        },
      },

      update: {
        providerId: episode.id,
      },

      create: {
        episodeId: dbEpisode.id,
        provider: "animeparadise",
        providerId: episode.id,
      },
    });
  }

  // 7. Return saved episodes
  return prisma.episode.findMany({
    where: {
      seasonId,
    },

    include: {
      providerMappings: true,
    },

    orderBy: {
      number: "asc",
    },
  });
}