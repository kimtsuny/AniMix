import prisma from "../../config/prisma.js";
import type { StreamingProvider } from "./provider.interface.js";
import {
  normalizeStreamResult,
  type NormalizedStreamResult,
} from "./stream.mapper.js";

import { animeParadiseProvider } from "./providers/animeparadise.provider.js";
import { reanimeProvider } from "./providers/reanime.provider.js";
import { gogoanimeProvider } from "./providers/gogoanime.provider.js";

/**
 * Streaming providers ordered by priority.
 *
 * The provider is selected using the EpisodeProviderMapping
 * stored in the database.
 */
const providers: StreamingProvider[] = [
  animeParadiseProvider,
  reanimeProvider,
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
      season: {
        include: {
          anime: true,
        },
      },
    },
  });

  if (!episode) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  // Prioritize mappings with an active providerSeasonMapping from Phase 3
  // and prioritize AnimeParadise as primary provider
  const sortedMappings = [...episode.providerMappings].sort((a, b) => {
    if (a.provider === "animeparadise" && b.provider !== "animeparadise") return -1;
    if (a.provider !== "animeparadise" && b.provider === "animeparadise") return 1;
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

  // Fallback: If primary provider mappings failed or none were present, try ReAnime
  const anilistId = episode.season?.anilistId ?? episode.season?.anime?.anilistId;
  const reanimeAlreadyAttempted = sortedMappings.some((m) => m.provider === "reanime");

  if (anilistId && !reanimeAlreadyAttempted) {
    try {
      console.log(
        `[Streaming] Primary provider(s) failed. Attempting ReAnime fallback for episode ${episodeId} (AniList: ${anilistId}, Episode: ${episode.number})...`
      );
      const reanimeRaw = await reanimeProvider.getStream(
        `reanime:${anilistId}:${episode.number}`
      );
      const normalizedReanime = normalizeStreamResult(reanimeRaw as any);

      if (
        normalizedReanime.type === "video" &&
        normalizedReanime.streams.length > 0
      ) {
        console.log(
          `[Streaming] ReAnime fallback succeeded for episode ${episodeId}`
        );

        // Record the ReAnime mapping for this episode
        await prisma.episodeProviderMapping
          .upsert({
            where: {
              episodeId_provider: {
                episodeId,
                provider: "reanime",
              },
            },
            update: {
              providerId: `reanime:${anilistId}:${episode.number}`,
            },
            create: {
              episodeId,
              provider: "reanime",
              providerId: `reanime:${anilistId}:${episode.number}`,
            },
          })
          .catch((err) => {
            console.warn("[Streaming] Failed to persist ReAnime mapping:", err.message);
          });

        return normalizedReanime;
      }
    } catch (fallbackError: any) {
      console.warn(
        `[Streaming] ReAnime fallback failed for episode ${episodeId}:`,
        fallbackError.message
      );
    }
  }

  throw new Error(
    `All streaming providers failed for episode ${episodeId}`
  );
}