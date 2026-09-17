import { gogoanimeProvider } from "../streaming/providers/gogoanime.provider.js";

async function main() {
  const id = "gogoanime:/watch/one-piece";

  console.log("Testing ID:", id);

  const episodes = await gogoanimeProvider.getEpisodes(id);

  console.log("Count:", episodes.length);

  console.dir(episodes.slice(0, 5), {
    depth: null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
