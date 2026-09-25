import { matchAnimeCandidates } from "./matching-engine.js";

async function run() {
  const argId = process.argv[2];
  const anilistId = argId ? parseInt(argId, 10) : 16498; // Default: Attack on Titan (16498)

  if (isNaN(anilistId) || anilistId <= 0) {
    console.error("Usage: pnpm exec tsx src/services/anime/mapping/dry-run.ts <anilistId>");
    process.exit(1);
  }

  console.log(`\n======================================================================`);
  console.log(`  ANIMEPARADISE CANDIDATE MATCHING ENGINE (DRY RUN)`);
  console.log(`======================================================================\n`);

  console.log(`Fetching AniList Media #${anilistId}...`);
  const result = await matchAnimeCandidates(anilistId);

  const anime = result.anilist;
  console.log(`\n--- ANILIST CANONICAL METADATA ---`);
  console.log(`ID:        ${anime.id}`);
  console.log(`English:   ${anime.title.english ?? "N/A"}`);
  console.log(`Romaji:    ${anime.title.romaji ?? "N/A"}`);
  console.log(`Native:    ${anime.title.native ?? "N/A"}`);
  console.log(`Format:    ${anime.format ?? "N/A"}`);
  console.log(`Year:      ${anime.seasonYear ?? anime.startDate?.year ?? "N/A"}`);
  console.log(`Episodes:  ${anime.episodes ?? "Unknown"}`);
  console.log(`Synonyms:  ${anime.synonyms?.length ? anime.synonyms.join(", ") : "None"}`);

  console.log(`\n--- SEARCH QUERIES ISSUED (${result.searchQueries.length}) ---`);
  result.searchQueries.forEach((q, idx) => console.log(`  ${idx + 1}. "${q}"`));

  console.log(`\n--- DISCOVERED CANDIDATES (${result.summary.totalDiscovered}) ---`);

  if (result.scoredCandidates.length === 0) {
    console.log("No candidates found on AnimeParadise.");
    return;
  }

  for (let i = 0; i < result.scoredCandidates.length; i++) {
    const sc = result.scoredCandidates[i];
    const cand = sc.candidate;
    const parsed = cand.parsedMain;

    const parts: string[] = [];
    if (parsed.explicitSeasonNumber !== null) parts.push(`S${parsed.explicitSeasonNumber}`);
    if (parsed.ordinalSeasonNumber !== null) parts.push(`${parsed.ordinalSeasonNumber}th S`);
    if (parsed.isFinalSeason) parts.push("Final Season");
    if (parsed.partNumber !== null) parts.push(`Part ${parsed.partNumber}`);
    if (parsed.courNumber !== null) parts.push(`Cour ${parsed.courNumber}`);
    if (parsed.isMovie) parts.push("Movie");
    if (parsed.isOVA) parts.push("OVA");
    if (parsed.isSpecial) parts.push("Special");

    const parsedDesc = parts.length > 0 ? parts.join(" | ") : "Base / S1";

    const badge =
      sc.decision === "MATCHED"
        ? "✅ MATCHED"
        : sc.decision === "AMBIGUOUS"
        ? "⚠️ AMBIGUOUS"
        : "❌ UNMAPPED";

    console.log(`\n[${i + 1}] ${badge}  (Score: ${(sc.score * 100).toFixed(1)}%)`);
    console.log(`    Title:        "${cand.title}"`);
    if (cand.alternativeTitle?.english) {
      console.log(`    Alt Title:    "${cand.alternativeTitle.english}"`);
    }
    console.log(`    Provider ID:  ${cand.providerId}`);
    console.log(`    Year:         ${cand.year ?? "Unknown"} | Episodes: ${cand.episodeCount}`);
    console.log(`    Parsed Tags:  ${parsedDesc} (Base: "${parsed.baseTitle}")`);

    if (sc.reasons.length > 0) {
      console.log(`    Reasons:      ${sc.reasons.join(" • ")}`);
    }
    if (sc.conflicts.length > 0) {
      console.log(`    Conflicts:    ${sc.conflicts.join(" • ")}`);
    }
  }

  console.log(`\n======================================================================`);
  console.log(`  SUMMARY`);
  console.log(`  Total: ${result.summary.totalDiscovered} | Matched: ${result.summary.matchedCount} | Ambiguous: ${result.summary.ambiguousCount} | Unmapped: ${result.summary.unmappedCount}`);
  console.log(`======================================================================\n`);
}

run().catch((err) => {
  console.error("Fatal error during dry run:", err);
  process.exit(1);
});
