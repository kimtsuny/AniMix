import prisma from "../../config/prisma.js";
import { mapAnimeToAnimeParadise } from "./anime-mapping.service.js";
import { syncSeasonEpisodes } from "./episode.service.js";
import { animeParadiseProvider } from "../streaming/providers/animeparadise.provider.js";

const FRIEREN_ANILIST_ID = 154587;

async function main() {
  console.log("========================================");
  console.log("   ANIMEPARADISE DATABASE FLOW TEST");
  console.log("========================================");

  // ============================================================
  // 1. Map Anime + Seasons
  // ============================================================

  console.log("\n=== 1. MAP FRIEREN ===\n");

  const mapping =
    await mapAnimeToAnimeParadise(
      FRIEREN_ANILIST_ID
    );

  console.log("Anime:");
  console.dir(mapping.anime, {
    depth: null,
  });

  console.log("\nSeasons:");

  console.dir(mapping.seasons, {
    depth: null,
  });

  // ============================================================
  // 2. Sync episodes for every season
  // ============================================================

  console.log("\n========================================");
  console.log("=== 2. SYNC SEASON EPISODES ===");
  console.log("========================================");

  for (const season of mapping.seasons) {
    console.log(
      `\n--- Season ${season.number}: ${season.title} ---`
    );

    const episodes =
      await syncSeasonEpisodes(season.id);

    console.log(
      `Saved episodes: ${episodes.length}`
    );

    console.log(
      "First episode:"
    );

    console.dir(episodes[0], {
      depth: null,
    });

    console.log(
      "Last episode:"
    );

    console.dir(
      episodes[episodes.length - 1],
      {
        depth: null,
      }
    );
  }

  // ============================================================
  // 3. Read everything directly from DB
  // ============================================================

  console.log("\n========================================");
  console.log("=== 3. READ FROM DATABASE ===");
  console.log("========================================");

  const anime =
    await prisma.anime.findUnique({
      where: {
        id: mapping.anime.id,
      },

      include: {
        seasons: {
          include: {
            episodes: {
              include: {
                providerMappings: true,
              },

              orderBy: {
                number: "asc",
              },
            },
          },

          orderBy: {
            number: "asc",
          },
        },
      },
    });

  console.dir(anime, {
    depth: null,
  });

  // ============================================================
  // 4. Resolve Season 1 Episode 1 stream
  // ============================================================

  console.log("\n========================================");
  console.log("=== 4. TEST STREAM ===");
  console.log("========================================");

  const season1 = anime?.seasons.find(
    (season) => season.number === 1
  );

  const episode1 =
    season1?.episodes.find(
      (episode) => episode.number === 1
    );

  if (!episode1) {
    throw new Error(
      "Season 1 Episode 1 not found in database"
    );
  }

  const providerMapping =
    episode1.providerMappings.find(
      (mapping) =>
        mapping.provider === "animeparadise"
    );

  if (!providerMapping) {
    throw new Error(
      "AnimeParadise episode mapping not found"
    );
  }

  console.log("\nEpisode:");
  console.dir(episode1, {
    depth: null,
  });

  console.log("\nResolving stream...");

  const stream =
    await animeParadiseProvider.getStream(
      providerMapping.providerId
    );

  console.log("\nStream:");
  console.dir(stream, {
    depth: null,
  });

  // ============================================================
  // 5. Summary
  // ============================================================

  console.log("\n========================================");
  console.log("             SUMMARY");
  console.log("========================================");

  console.log(
    `Anime: ${anime?.title}`
  );

  console.log(
    `Seasons: ${anime?.seasons.length ?? 0}`
  );

  for (const season of anime?.seasons ?? []) {
    console.log(
      `Season ${season.number}: ${season.episodes.length} episodes`
    );
  }

  console.log(
    `Stream type: ${stream.type}`
  );

  console.log(
    `Streams: ${stream.type === "video" ? stream.streams.length : 0}`
  );

  console.log("\n========================================");
  console.log("          DATABASE FLOW SUCCESS");
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("\n❌ TEST FAILED\n");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
