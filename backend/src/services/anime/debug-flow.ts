import { gogoanimeProvider } from "../streaming/providers/gogoanime.provider.js";

async function main() {
  console.log("1. Searching...");

  const results = await gogoanimeProvider.search("One Piece");

  console.log("Search count:", results.length);

  const onePiece = results.find(
    (result) => result.title.toLowerCase() === "one piece"
  );

  console.log("Selected result:");
  console.dir(onePiece, { depth: null });

  if (!onePiece) {
    throw new Error("One Piece not found");
  }

  console.log("\n2. Fetching episodes using result.id...");
  console.log("ID:", onePiece.id);

  const episodes = await gogoanimeProvider.getEpisodes(
    onePiece.id
  );

  console.log("\n3. Episodes count:", episodes.length);

  console.dir(episodes.slice(0, 5), {
    depth: null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
