import prisma from "../../../config/prisma.js";
import { mapAnimeToAnimeParadise } from "../anime-mapping.service.js";

interface ValidationReport {
  anilistId: number;
  animeTitle: string;
  seasonCount: number;
  seasons: Array<{
    number: number;
    title: string | null;
    anilistId: number | null;
    providerMappingsCount: number;
    episodeCount: number;
  }>;
  isIdempotent: boolean;
  status: "PASSED" | "FAILED";
  errors: string[];
}

export async function validateAnimeMapping(anilistId: number): Promise<ValidationReport> {
  const errors: string[] = [];

  // Run 1
  const firstResult = await mapAnimeToAnimeParadise(anilistId);

  // Re-read DB
  const anime = await prisma.anime.findUnique({
    where: { anilistId: firstResult.anime.anilistId },
    include: {
      seasons: {
        orderBy: { number: "asc" },
        include: {
          providerMappings: true,
          episodes: { select: { id: true, number: true } },
        },
      },
    },
  });

  if (!anime) {
    errors.push(`Anime record missing for anilistId ${anilistId}`);
    return {
      anilistId,
      animeTitle: "Unknown",
      seasonCount: 0,
      seasons: [],
      isIdempotent: false,
      status: "FAILED",
      errors,
    };
  }

  if (anime.seasons.length === 0) {
    errors.push(`0 AnimeSeason records found for Anime #${anime.id}`);
  }

  // Check provider mappings and episode association
  for (const season of anime.seasons) {
    if (season.providerMappings.length === 0 && season.provider !== null) {
      errors.push(`Season ${season.number} has provider string but 0 providerMappings`);
    }

    // Verify episodes belong to correct season
    for (const ep of season.episodes) {
      if (ep.number <= 0) {
        errors.push(`Season ${season.number} has invalid episode number ${ep.number}`);
      }
    }
  }

  // Run 2 (Idempotency test)
  const secondResult = await mapAnimeToAnimeParadise(anilistId);
  const reReadAnime = await prisma.anime.findUnique({
    where: { anilistId: firstResult.anime.anilistId },
    include: {
      seasons: {
        orderBy: { number: "asc" },
        include: {
          providerMappings: true,
          episodes: { select: { id: true, number: true } },
        },
      },
    },
  });

  const isIdempotent =
    anime.seasons.length === reReadAnime?.seasons.length &&
    anime.seasons.every((s, idx) => {
      const s2 = reReadAnime?.seasons[idx];
      return (
        s2 &&
        s.number === s2.number &&
        s.episodes.length === s2.episodes.length &&
        s.providerMappings.length === s2.providerMappings.length
      );
    });

  if (!isIdempotent) {
    errors.push("Mapping is not idempotent; second run changed the database state");
  }

  const seasonSummary = anime.seasons.map((s) => ({
    number: s.number,
    title: s.title,
    anilistId: s.anilistId,
    providerMappingsCount: s.providerMappings.length,
    episodeCount: s.episodes.length,
  }));

  return {
    anilistId,
    animeTitle: anime.title,
    seasonCount: anime.seasons.length,
    seasons: seasonSummary,
    isIdempotent,
    status: errors.length === 0 ? "PASSED" : "FAILED",
    errors,
  };
}

async function runAcceptanceSuite() {
  console.log("======================================================================");
  console.log("  ANIME MAPPING ACCEPTANCE SUITE");
  console.log("======================================================================\n");

  const testIds = [
    1535,   // Death Note (Single-season, 37 eps, dual-audio 74 provider items)
    101922, // Demon Slayer (Multi-season named arcs, 5 TV seasons)
  ];

  for (const id of testIds) {
    console.log(`\n>>> Testing AniList Media #${id}...`);
    try {
      const report = await validateAnimeMapping(id);
      console.log(`Title:       ${report.animeTitle}`);
      console.log(`Status:      ${report.status === "PASSED" ? "✅ PASSED" : "❌ FAILED"}`);
      console.log(`Idempotent:  ${report.isIdempotent ? "YES" : "NO"}`);
      console.log(`Seasons:     ${report.seasonCount}`);
      for (const s of report.seasons) {
        console.log(`  Season ${s.number}: "${s.title}" (anilistId: ${s.anilistId}, mappings: ${s.providerMappingsCount}, eps: ${s.episodeCount})`);
      }
      if (report.errors.length > 0) {
        console.log(`Errors:`, report.errors);
      }
    } catch (err: any) {
      console.error(`❌ Exception testing #${id}:`, err.message);
    }
  }

  console.log("\n======================================================================");
  console.log("  ACCEPTANCE SUITE FINISHED");
  console.log("======================================================================");
}

runAcceptanceSuite()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
