import prisma from "../../config/prisma.js";
import type { StreamingProvider } from "./provider.interface.js";
import {
  normalizeStreamResult,
  type NormalizedStreamResult,
} from "./stream.mapper.js";

import { animeParadiseProvider } from "./providers/animeparadise.provider.js";
import { gogoanimeProvider } from "./providers/gogoanime.provider.js";

/**
 * Streaming providers ordered by priority.
 *
 * The provider is selected using the EpisodeProviderMapping
 * stored in the database.
 */
const providers: StreamingProvider[] = [
  animeParadiseProvider,
  gogoanimeProvider,
];

/**
 * Resolve a playable stream for an Episode stored in our database.
 *
 * Flow:
 *
 * Episode DB ID
 *      ↓
 * EpisodeProviderMapping
 *      ↓
 * Provider
 *      ↓
 * Provider Episode ID
 *      ↓
 * Streaming Provider
 *      ↓
 * Normalized Stream
 */
export async function getStream(
  episodeId: number
): Promise<NormalizedStreamResult> {
  const episode = await prisma.episode.findUnique({
    where: {
      id: episodeId,
    },

    include: {
      providerMappings: {
        include: {
          providerSeasonMapping: true,
        },
      },
    },
  });

  if (!episode) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  if (episode.providerMappings.length === 0) {
    throw new Error(
      `No provider mapping found for episode ${episodeId}`
    );
  }

  // Prioritize mappings with an active providerSeasonMapping from Phase 3
  const sortedMappings = [...episode.providerMappings].sort((a, b) => {
    if (a.providerSeasonMappingId && !b.providerSeasonMappingId) return -1;
    if (!a.providerSeasonMappingId && b.providerSeasonMappingId) return 1;
    return 0;
  });

  for (const mapping of sortedMappings) {
    const provider = providers.find(
      (item) => item.name === mapping.provider
    );

    if (!provider) {
      console.warn(
        `[Streaming] Provider "${mapping.provider}" is not registered`
      );

      continue;
    }

    try {
      console.log(
        `[Streaming] Trying provider "${provider.name}" for episode ${episodeId}`
      );

      const rawResult = await provider.getStream(
        mapping.providerId
      );

      const normalizedResult =
        normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0
      ) {
        console.log(
          `[Streaming] Provider "${provider.name}" succeeded for episode ${episodeId}`
        );

        return normalizedResult;
      }

      console.warn(
        `[Streaming] Provider "${provider.name}" returned no streams`
      );
    } catch (error) {
      console.error(
        `[Streaming] Provider "${provider.name}" failed:`,
        error
      );
    }
  }

  throw new Error(
    `All streaming providers failed for episode ${episodeId}`
  );
}