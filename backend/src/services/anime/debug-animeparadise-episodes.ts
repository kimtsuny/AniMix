import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

async function main() {
  const animeId = "animeparadise:ASa7g4dGZREXdtzA";

  console.log("=== FETCH CONTENT ===");
  console.log("Anime ID:", animeId);

  const episodes = await provider.fetchContentUnits(animeId);

  console.log("Count:", episodes.length);

  console.dir(episodes.slice(0, 10), {
    depth: null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});