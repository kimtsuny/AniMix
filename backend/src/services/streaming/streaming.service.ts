import prisma from "../../config/prisma.js";
import type { StreamingProvider } from "./provider.interface.js";
import {
  normalizeStreamResult,
  type NormalizedStreamResult,
} from "./stream.mapper.js";

import { aniKotoProvider } from "./providers/anikoto.provider.js";
import { animeParadiseProvider } from "./providers/animeparadise.provider.js";

/**
 * Streaming providers ordered by priority.
 *
 * 1. AniKoto = primary provider
 * 2. AnimeParadise = secondary / fallback provider
 */
const providers: StreamingProvider[] = [
  aniKotoProvider,
  animeParadiseProvider,
];

/**
 * Resolve a playable stream for an Episode stored in our database.
 *
 * Flow:
 *
 * Episode DB ID
 *      ↓
 * Try Primary Provider: AniKoto
 *      ↓
 * If AniKoto succeeds → return normalized stream
 *      ↓
 * If AniKoto fails → Try Fallback Provider: AnimeParadise
 *      ↓
 * If AnimeParadise succeeds → return normalized stream
 *      ↓
 * If both fail → throw Error
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

  const anilistId = episode.season?.anilistId ?? episode.season?.anime?.anilistId;

  // ============================================================
  // 1. PRIMARY PROVIDER: AniKoto
  // ============================================================
  const anikotoMapping = episode.providerMappings.find(
    (m) => m.provider === "anikoto"
  );
  const anikotoIdentifier =
    anikotoMapping?.providerId ??
    (anilistId ? `anikoto:${anilistId}:${episode.number}` : null);

  if (anikotoIdentifier) {
    try {
      console.log(
        `[Streaming] [Primary: AniKoto] Attempting stream resolution for episode ${episodeId} ("${anikotoIdentifier}")...`
      );

      const rawResult = await aniKotoProvider.getStream(anikotoIdentifier);
      const normalizedResult = normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0 &&
        normalizedResult.streams.some((s) => !!s.url)
      ) {
        console.log(
          `[Streaming] [Primary: AniKoto] Stream resolution succeeded for episode ${episodeId}`
        );

        // Record the successful AniKoto mapping if not already stored
        if (!anikotoMapping && anilistId) {
          await prisma.episodeProviderMapping
            .upsert({
              where: {
                episodeId_provider: {
                  episodeId,
                  provider: "anikoto",
                },
              },
              update: {
                providerId: anikotoIdentifier,
              },
              create: {
                episodeId,
                provider: "anikoto",
                providerId: anikotoIdentifier,
              },
            })
            .catch((err) => {
              console.warn(
                "[Streaming] Failed to persist AniKoto mapping:",
                err.message
              );
            });
        }

        return normalizedResult;
      }

      console.warn(
        `[Streaming] [Primary: AniKoto] Returned no usable video streams for episode ${episodeId}`
      );
    } catch (anikotoError: any) {
      console.warn(
        `[Streaming] [Primary: AniKoto] Failed for episode ${episodeId}: ${anikotoError.message}`
      );
    }
  } else {
    console.log(
      `[Streaming] [Primary: AniKoto] No AniKoto identifier or AniList ID available for episode ${episodeId}`
    );
  }

  // ============================================================
  // 2. SECONDARY / EMERGENCY FALLBACK: AnimeParadise
  // ============================================================
  console.log(
    `[Streaming] Primary provider AniKoto failed or unavailable. Falling back to AnimeParadise for episode ${episodeId}...`
  );

  const animeParadiseMapping = episode.providerMappings.find(
    (m) => m.provider === "animeparadise"
  );

  if (animeParadiseMapping) {
    try {
      console.log(
        `[Streaming] [Fallback: AnimeParadise] Attempting stream for episode ${episodeId} (providerId: "${animeParadiseMapping.providerId}")...`
      );

      const rawResult = await animeParadiseProvider.getStream(
        animeParadiseMapping.providerId
      );
      const normalizedResult = normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0 &&
        normalizedResult.streams.some((s) => !!s.url)
      ) {
        console.log(
          `[Streaming] [Fallback: AnimeParadise] Succeeded for episode ${episodeId}`
        );

        return normalizedResult;
      }

      console.warn(
        `[Streaming] [Fallback: AnimeParadise] Returned no usable video streams for episode ${episodeId}`
      );
    } catch (apError: any) {
      console.error(
        `[Streaming] [Fallback: AnimeParadise] Failed for episode ${episodeId}:`,
        apError.message
      );
    }
  } else {
    console.warn(
      `[Streaming] [Fallback: AnimeParadise] No AnimeParadise mapping found for episode ${episodeId}`
    );
  }

  // ============================================================
  // 3. OTHER REGISTERED PROVIDERS (if any exist)
  // ============================================================
  for (const mapping of episode.providerMappings) {
    if (mapping.provider === "anikoto" || mapping.provider === "animeparadise") {
      continue;
    }

    const provider = providers.find((item) => item.name === mapping.provider);
    if (!provider) continue;

    try {
      console.log(
        `[Streaming] Trying other registered provider "${provider.name}" for episode ${episodeId}`
      );

      const rawResult = await provider.getStream(mapping.providerId);
      const normalizedResult = normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0 &&
        normalizedResult.streams.some((s) => !!s.url)
      ) {
        return normalizedResult;
      }
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

/**
 * Resolves a playable stream for an anonymous episode request without any database lookups or records.
 *
 * Flow:
 * Provider & ProviderId
 *      ↓
 * Try Primary Provider: AniKoto
 *      ↓
 * If AniKoto succeeds → return normalized stream
 *      ↓
 * If AniKoto fails → Try Fallback Provider: AnimeParadise
 *      ↓
 * If AnimeParadise succeeds → return normalized stream
 *      ↓
 * If both fail → throw Error
 */
export async function getAnonymousStream(
  provider: string,
  providerId: string
): Promise<NormalizedStreamResult> {
  if (!provider || !providerId) {
    throw new Error("Provider and providerId are required for anonymous stream");
  }

  // 1. PRIMARY PROVIDER: AniKoto
  if (provider === "anikoto") {
    try {
      console.log(
        `[Streaming] [Anonymous] [Primary: AniKoto] Resolving stream for "${providerId}"...`
      );
      const rawResult = await aniKotoProvider.getStream(providerId);
      const normalizedResult = normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0 &&
        normalizedResult.streams.some((s) => !!s.url)
      ) {
        console.log(
          `[Streaming] [Anonymous] [Primary: AniKoto] Stream resolution succeeded for "${providerId}"`
        );
        return normalizedResult;
      }

      console.warn(
        `[Streaming] [Anonymous] [Primary: AniKoto] Returned no usable video streams for "${providerId}"`
      );
    } catch (anikotoError: any) {
      console.warn(
        `[Streaming] [Anonymous] [Primary: AniKoto] Failed for "${providerId}": ${anikotoError.message}`
      );
    }
  }

  // 2. SECONDARY / EMERGENCY FALLBACK: AnimeParadise
  const shouldTryAnimeParadise =
    provider === "animeparadise" ||
    (provider === "anikoto" && !providerId.startsWith("na_"));

  if (shouldTryAnimeParadise) {
    try {
      console.log(
        `[Streaming] [Anonymous] [Fallback: AnimeParadise] Attempting stream for "${providerId}"...`
      );

      const rawResult = await animeParadiseProvider.getStream(providerId);
      const normalizedResult = normalizeStreamResult(rawResult as any);

      if (
        normalizedResult.type === "video" &&
        normalizedResult.streams.length > 0 &&
        normalizedResult.streams.some((s) => !!s.url)
      ) {
        console.log(
          `[Streaming] [Anonymous] [Fallback: AnimeParadise] Succeeded for "${providerId}"`
        );
        return normalizedResult;
      }
    } catch (apError: any) {
      console.warn(
        `[Streaming] [Anonymous] [Fallback: AnimeParadise] Failed for "${providerId}": ${apError.message}`
      );
    }
  }

  // 3. OTHER REGISTERED PROVIDERS
  for (const prov of providers) {
    if (prov.name === "anikoto" || prov.name === "animeparadise") continue;
    if (prov.name === provider) {
      try {
        console.log(
          `[Streaming] [Anonymous] Trying provider "${prov.name}" for "${providerId}"`
        );
        const rawResult = await prov.getStream(providerId);
        const normalizedResult = normalizeStreamResult(rawResult as any);
        if (
          normalizedResult.type === "video" &&
          normalizedResult.streams.length > 0 &&
          normalizedResult.streams.some((s) => !!s.url)
        ) {
          return normalizedResult;
        }
      } catch (err: any) {
        console.error(
          `[Streaming] [Anonymous] Provider "${prov.name}" failed:`,
          err.message
        );
      }
    }
  }

  throw new Error(
    `All streaming providers failed for provider "${provider}" and providerId "${providerId}"`
  );
}