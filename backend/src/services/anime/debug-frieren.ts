import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

async function main() {
  console.log("=== FRIEREN SEARCH ===");

  const results = await provider.search("Frieren");

  console.log("Count:", results.length);

  console.dir(results, {
    depth: null,
  });

  for (const anime of results.slice(0, 5)) {
    console.log("\n================================");
    console.log("Anime:", anime.title);
    console.log("ID:", anime.id);

    const episodes = await provider.fetchContentUnits(anime.id);

    console.log("Episodes:", episodes.length);

    console.dir(episodes.slice(0, 3), {
      depth: null,
    });

    console.dir(episodes.slice(-3), {
      depth: null,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
