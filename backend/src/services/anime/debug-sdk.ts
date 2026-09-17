import {
  GogoanimeProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new GogoanimeProvider(http);

async function main() {
  console.log("=== SEARCH TEST ===");

  const results = await provider.search("One Piece");

  console.log("Count:", results.length);

  console.dir(results.slice(0, 3), {
    depth: null,
  });

  if (results.length === 0) {
    throw new Error("Search returned 0 results");
  }

  const anime = results[0];

  console.log("\n=== SELECTED ===");

  console.dir(anime, {
    depth: null,
  });

  console.log("\n=== EPISODE TEST ===");

  console.log("Using ID:", anime.id);

  const episodes = await provider.fetchContentUnits(anime.id);

  console.log("Episode count:", episodes.length);

  console.dir(episodes.slice(0, 5), {
    depth: null,
  });
}

main().catch((error) => {
  console.error("\nFAILED:");
  console.error(error);
  process.exit(1);
});
