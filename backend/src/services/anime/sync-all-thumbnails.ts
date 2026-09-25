import prisma from "../../config/prisma.js";
import { syncSeasonEpisodes } from "./episode.service.js";

async function main() {
  console.log("========================================");
  console.log("   SYNC ALL EPISODE THUMBNAILS");
  console.log("========================================");

  const seasons = await prisma.animeSeason.findMany({
    orderBy: {
      id: "asc",
    },
  });

  console.log(`Found ${seasons.length} seasons`);

  for (const season of seasons) {
    console.log("");
    console.log(
      `[Sync] Season ${season.id}: ${season.title}`
    );

    try {
      const episodes = await syncSeasonEpisodes(season.id);

      const thumbnailsCount = episodes.filter(
        (episode) => episode.thumbnail
      ).length;

      console.log(
        `[Success] ${episodes.length} episodes synced`
      );

      console.log(
        `[Thumbnails] ${thumbnailsCount}/${episodes.length}`
      );
    } catch (error) {
      console.error(
        `[Failed] Season ${season.id}:`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("   THUMBNAIL SYNC COMPLETE");
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
