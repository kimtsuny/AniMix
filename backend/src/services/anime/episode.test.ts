import { syncSeasonEpisodes } from "./episode.service.js";

async function main() {
  const episodes = await syncSeasonEpisodes(1);

  console.log(`Saved episodes: ${episodes.length}`);

  console.log("First 5 episodes:");

  console.dir(episodes.slice(0, 5), {
    depth: null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});