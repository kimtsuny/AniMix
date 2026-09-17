import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

async function main() {
  console.log("=== AnimeParadise SEARCH ===");

  const results = await provider.search("One Piece");

  console.log("Count:", results.length);

  console.dir(results.slice(0, 5), {
    depth: null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});