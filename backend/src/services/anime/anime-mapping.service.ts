import prisma from "../../config/prisma.js";
import { getAnimeById } from "../anilist/anilist.service.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTitles(anime: Awaited<ReturnType<typeof getAnimeById>>) {
  return [
    anime.title.english,
    anime.title.romaji,
    anime.title.native,
  ].filter(Boolean) as string[];
}

/**
 * Remove common season suffixes.
 *
 * Example:
 *
 * Frieren: Beyond Journey’s End
 * Frieren: Beyond Journey’s End Season 2
 *
 * -> Frieren: Beyond Journey’s End
 */
function getBaseTitle(title: string): string {
  return normalizeTitle(title)
    .replace(/\s+season\s+\d+.*$/, "")
    .replace(/\s+part\s+\d+.*$/, "")
    .replace(/\s+cour\s+\d+.*$/, "")
    .trim();
}

/**
 * Detect season number from AnimeParadise title.
 */
function detectSeasonNumber(
  title: string,
  baseTitles: string[]
): number | null {
  const normalized = normalizeTitle(title);

  for (const baseTitle of baseTitles) {
    const base = getBaseTitle(baseTitle);

    if (normalized === base) {
      return 1;
    }

    const seasonMatch = normalized.match(
      new RegExp(
        `^${escapeRegExp(base)}\\s+season\\s+(\\d+)`
      )
    );

    if (seasonMatch) {
      return Number(seasonMatch[1]);
    }

    const partMatch = normalized.match(
      new RegExp(
        `^${escapeRegExp(base)}\\s+part\\s+(\\d+)`
      )
    );

    if (partMatch) {
      return Number(partMatch[1]);
    }

    const courMatch = normalized.match(
      new RegExp(
        `^${escapeRegExp(base)}\\s+cour\\s+(\\d+)`
      )
    );

    if (courMatch) {
      return Number(courMatch[1]);
    }
  }

  return null;
}

/**
 * Find the main/base AniList anime.
 *
 * If the requested anime is already the base anime,
 * use it directly.
 *
 * If it's a sequel/season, walk through PREQUEL relations
 * until we find the earliest TV anime.
 */
async function resolveRootAnime(
  anime: Awaited<ReturnType<typeof getAnimeById>>
) {
  let current = anime;

  const visited = new Set<number>();

  while (!visited.has(current.id)) {
    visited.add(current.id);

    const prequel = current.relations.edges.find(
      (edge) =>
        edge.relationType === "PREQUEL" &&
        edge.node.type === "ANIME" &&
        edge.node.format === "TV"
    );

    if (!prequel) {
      break;
    }

    current = await getAnimeById(prequel.node.id);
  }

  return current;
}

import {
  persistFranchiseMapping,
  persistRequestedSeason,
  type PersistResult,
} from "./mapping/phase3-persistence.js";

const inFlightMappings = new Map<number, Promise<PersistResult>>();
const inFlightSeasonMappings = new Map<
  string,
  Promise<Awaited<ReturnType<typeof persistRequestedSeason>>>
>();

export async function mapRequestedSeason(
  anilistId: number,
  seasonNumber: number
): Promise<Awaited<ReturnType<typeof persistRequestedSeason>>> {
  const key = `${anilistId}:${seasonNumber}`;
  const existing = inFlightSeasonMappings.get(key);
  if (existing) {
    console.log(
      `[Anime Mapping] Awaiting in-flight requested-season promise for #${key}...`
    );
    return existing;
  }

  const promise = (async () => {
    try {
      return await persistRequestedSeason(anilistId, seasonNumber);
    } finally {
      inFlightSeasonMappings.delete(key);
    }
  })();

  inFlightSeasonMappings.set(key, promise);
  return promise;
}

export async function mapAnimeToAnimeParadise(
  anilistId: number
): Promise<PersistResult> {
  const existing = inFlightMappings.get(anilistId);
  if (existing) {
    console.log(`[Anime Mapping] Awaiting in-flight mapping promise for #${anilistId}...`);
    return existing;
  }

  const promise = (async () => {
    try {
      return await persistFranchiseMapping(anilistId);
    } finally {
      inFlightMappings.delete(anilistId);
    }
  })();

  inFlightMappings.set(anilistId, promise);
  return promise;
}

export async function legacyMapAnimeToAnimeParadise(
  anilistId: number
) {

  const requestedAnime = await getAnimeById(anilistId);

  const requestedTitles = getTitles(requestedAnime);

  if (requestedTitles.length === 0) {
    throw new Error(
      `Anime ${anilistId} has no usable title`
    );
  }

  // ============================================================
  // 2. Resolve root/base Anime
  // ============================================================

  const rootAnime =
    await resolveRootAnime(requestedAnime);

  const rootTitles = getTitles(rootAnime);

  if (rootTitles.length === 0) {
    throw new Error(
      `Root anime ${rootAnime.id} has no usable title`
    );
  }

  // ============================================================
  // 3. Search AnimeParadise using root title
  // ============================================================

  const searchTitle =
    rootAnime.title.english ??
    rootAnime.title.romaji ??
    rootAnime.title.native!;

  const results =
    await animeParadiseProvider.search(searchTitle);

  if (results.length === 0) {
    throw new Error(
      `No AnimeParadise results found for "${searchTitle}"`
    );
  }

  // ============================================================
  // 4. Create/update root Anime
  // ============================================================

  const dbAnime = await prisma.anime.upsert({
    where: {
      anilistId: rootAnime.id,
    },

    update: {
      title:
        rootAnime.title.english ??
        rootAnime.title.romaji ??
        rootAnime.title.native ??
        "Unknown",

      description: rootAnime.description,

      coverImage:
        rootAnime.coverImage.extraLarge ??
        rootAnime.coverImage.large,

      bannerImage: rootAnime.bannerImage,
    },

    create: {
      anilistId: rootAnime.id,

      title:
        rootAnime.title.english ??
        rootAnime.title.romaji ??
        rootAnime.title.native ??
        "Unknown",

      description: rootAnime.description,

      coverImage:
        rootAnime.coverImage.extraLarge ??
        rootAnime.coverImage.large,

      bannerImage: rootAnime.bannerImage,
    },
  });

  // ============================================================
  // 5. Find all AnimeParadise seasons
  // ============================================================

  const detectedSeasons = results
    .map((result) => {
      const number = detectSeasonNumber(
        result.title,
        rootTitles
      );

      if (number === null) {
        return null;
      }

      return {
        number,
        title: result.title,
        provider: "animeparadise",
        providerId: result.id,
      };
    })
    .filter(
      (
        season
      ): season is {
        number: number;
        title: string;
        provider: string;
        providerId: string;
      } => season !== null
    );

  // Remove duplicate season numbers
  const uniqueSeasons = Array.from(
    new Map(
      detectedSeasons.map((season) => [
        season.number,
        season,
      ])
    ).values()
  );

  // ============================================================
  // 6. Make sure requested season exists
  // ============================================================

  const requestedSeasonNumber =
    detectSeasonNumber(
      requestedAnime.title.english ??
        requestedAnime.title.romaji ??
        requestedAnime.title.native ??
        "",
      rootTitles
    ) ?? 1;

  const requestedProviderSeason =
    uniqueSeasons.find(
      (season) =>
        season.number === requestedSeasonNumber
    );

  if (!requestedProviderSeason) {
    throw new Error(
      `Could not find Season ${requestedSeasonNumber} on AnimeParadise for "${searchTitle}"`
    );
  }

  // ============================================================
  // 7. Save all seasons
  // ============================================================

  const savedSeasons = [];

  for (const season of uniqueSeasons) {
    const dbSeason =
      await prisma.animeSeason.upsert({
        where: {
          animeId_number: {
            animeId: dbAnime.id,
            number: season.number,
          },
        },

        update: {
          title: season.title,
          provider: season.provider,
          providerId: season.providerId,
        },

        create: {
          animeId: dbAnime.id,
          number: season.number,
          title: season.title,
          provider: season.provider,
          providerId: season.providerId,
        },
      });

    savedSeasons.push(dbSeason);
  }

  // ============================================================
  // 8. Return everything
  // ============================================================

  return {
    anime: dbAnime,

    requestedAnime: {
      anilistId: requestedAnime.id,
      title:
        requestedAnime.title.english ??
        requestedAnime.title.romaji ??
        requestedAnime.title.native,
      season: requestedSeasonNumber,
    },

    seasons: savedSeasons,

    results,
  };
}