import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

async function main() {
  const episodeId =
    "animeparadise:2ad276c2-3492-4db4-b5de-1657ed207571:ASa7g4dGZREXdtzA";

  console.log("=== RESOLVE STREAM ===");
  console.log("Episode ID:", episodeId);

  const result = await provider.resolveStream(episodeId);

  console.log("\n=== RESULT ===");

  console.dir(result, {
    depth: null,
  });
}

main().catch((error) => {
  console.error("\nFAILED:");
  console.error(error);
  process.exit(1);
});