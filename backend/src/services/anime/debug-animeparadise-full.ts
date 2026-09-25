import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

async function main() {
  console.log("========================================");
  console.log("     ANIMEPARADISE FULL FLOW TEST");
  console.log("========================================\n");

  // ========================================
  // 1. SEARCH
  // ========================================

  console.log("=== 1. SEARCH FRIEREN ===\n");

  const results = await provider.search("Frieren");

  console.log("Results:", results.length);
  console.dir(results, { depth: null });

  if (results.length === 0) {
    throw new Error("No Frieren results found");
  }

  // Find the original Frieren and Season 2
  const season1 = results.find(
    (anime) =>
      anime.title.toLowerCase() ===
      "frieren: beyond journey’s end".toLowerCase()
  );

  const season2 = results.find((anime) =>
    anime.title.toLowerCase().includes("season 2")
  );

  if (!season1) {
    throw new Error("Frieren Season 1 not found");
  }

  if (!season2) {
    throw new Error("Frieren Season 2 not found");
  }

  console.log("\n=== SELECTED SEASONS ===\n");

  console.log("Season 1:");
  console.dir(season1, { depth: null });

  console.log("\nSeason 2:");
  console.dir(season2, { depth: null });

  // ========================================
  // 2. FETCH SEASON 1 EPISODES
  // ========================================

  console.log("\n========================================");
  console.log("     2. SEASON 1 EPISODES");
  console.log("========================================\n");

  const season1Episodes = await provider.fetchContentUnits(
    season1.id
  );

  console.log("Season 1 ID:", season1.id);
  console.log("Episode count:", season1Episodes.length);

  console.log("\nFirst 3 episodes:");
  console.dir(season1Episodes.slice(0, 3), {
    depth: null,
  });

  console.log("\nLast 3 episodes:");
  console.dir(season1Episodes.slice(-3), {
    depth: null,
  });

  // ========================================
  // 3. FETCH SEASON 2 EPISODES
  // ========================================

  console.log("\n========================================");
  console.log("     3. SEASON 2 EPISODES");
  console.log("========================================\n");

  const season2Episodes = await provider.fetchContentUnits(
    season2.id
  );

  console.log("Season 2 ID:", season2.id);
  console.log("Episode count:", season2Episodes.length);

  console.log("\nFirst 3 episodes:");
  console.dir(season2Episodes.slice(0, 3), {
    depth: null,
  });

  console.log("\nLast 3 episodes:");
  console.dir(season2Episodes.slice(-3), {
    depth: null,
  });

  // ========================================
  // 4. RESOLVE STREAM SEASON 1 EP 1
  // ========================================

  console.log("\n========================================");
  console.log("     4. SEASON 1 EPISODE 1 STREAM");
  console.log("========================================\n");

  const season1Episode1 = season1Episodes[0];

  if (!season1Episode1) {
    throw new Error("Season 1 Episode 1 not found");
  }

  console.log("Episode:");
  console.dir(season1Episode1, { depth: null });

  const season1Stream = await provider.resolveStream(
    season1Episode1.id
  );

  console.log("\nStream result:");
  console.dir(season1Stream, {
    depth: null,
  });

  // ========================================
  // 5. RESOLVE STREAM SEASON 2 EP 1
  // ========================================

  console.log("\n========================================");
  console.log("     5. SEASON 2 EPISODE 1 STREAM");
  console.log("========================================\n");

  const season2Episode1 = season2Episodes[0];

  if (!season2Episode1) {
    throw new Error("Season 2 Episode 1 not found");
  }

  console.log("Episode:");
  console.dir(season2Episode1, { depth: null });

  const season2Stream = await provider.resolveStream(
    season2Episode1.id
  );

  console.log("\nStream result:");
  console.dir(season2Stream, {
    depth: null,
  });

  // ========================================
  // SUMMARY
  // ========================================

  console.log("\n========================================");
  console.log("              SUMMARY");
  console.log("========================================\n");

  console.log("✅ Search:", results.length, "results");

  console.log(
    "✅ Season 1:",
    season1.title,
    `(${season1Episodes.length} episodes)`
  );

  console.log(
    "✅ Season 2:",
    season2.title,
    `(${season2Episodes.length} episodes)`
  );

  console.log(
    "✅ Season 1 Episode 1 Stream:",
    "streams" in season1Stream ? season1Stream.streams?.length ?? 0 : 0,
    "stream(s)"
  );

  console.log(
    "✅ Season 2 Episode 1 Stream:",
    "streams" in season2Stream ? season2Stream.streams?.length ?? 0 : 0,
    "stream(s)"
  );

  console.log("\n========================================");
  console.log("          FULL FLOW SUCCESS");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);

  process.exit(1);
});