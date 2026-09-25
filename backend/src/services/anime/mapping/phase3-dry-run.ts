import { planFranchiseMapping } from "./phase3-planner.js";

async function main() {
  const argId = process.argv[2];
  const anilistId = argId ? parseInt(argId, 10) : 16498; // Default AoT

  console.log(`\n======================================================================`);
  console.log(`  PHASE 3 DRY-RUN: MULTI-PART EPISODE OFFSET & MAPPING PLANNER`);
  console.log(`  (Read-only, no database writes)`);
  console.log(`======================================================================\n`);

  console.log(`Analyzing franchise for AniList ID: ${anilistId}...`);
  const plan = await planFranchiseMapping(anilistId);

  console.log(`\nFranchise Root: "${plan.rootAnime.title.english ?? plan.rootAnime.title.romaji}" (AniList #${plan.rootAnime.id})`);
  console.log(`Requested:      "${plan.requestedAnime.title.english ?? plan.requestedAnime.title.romaji}" (AniList #${plan.requestedAnime.id})`);
  console.log(`Total Provider Candidates Discovered: ${plan.allDiscoveredCandidates.length}`);
  console.log(`Logical Seasons Planned: ${plan.seasons.length}\n`);

  for (const s of plan.seasons) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`Logical Season ${s.seasonNumber}: "${s.title}" (AniList #${s.anilistId ?? "None"})`);
    console.log(`Provider Parts Count: ${s.parts.length} | Total Episodes: ${s.totalEpisodes}`);

    if (s.parts.length === 0) {
      console.log(`  ⚠️ No valid provider parts mapped for this season.`);
      continue;
    }

    console.log(`\nProvider candidates:`);
    s.parts.forEach((p, idx) => {
      console.log(`\n  ${idx + 1}.`);
      console.log(`     provider:     ${p.provider}`);
      console.log(`     providerId:   ${p.providerId}`);
      console.log(`     partTitle:    "${p.title}"`);
      console.log(`     partNumber:   ${p.partNumber}`);
      console.log(`     episodeCount: ${p.episodeCount}`);
      console.log(`     offset:       ${p.episodeOffset}`);
      console.log(`     decision:     MATCHED`);
    });

    console.log(`\nLogical episodes mapping:`);
    const epsToShow = s.parts.flatMap((p) =>
      p.episodes.map((ep) => ({
        logical: ep.logicalNumber,
        partNum: p.partNumber,
        providerEp: ep.providerNumber,
        title: ep.title,
      }))
    );

    if (epsToShow.length <= 10) {
      for (const ep of epsToShow) {
        console.log(`  Ep ${ep.logical} → provider Part ${ep.partNum} episode ${ep.providerEp} ("${ep.title}")`);
      }
    } else {
      // First 3
      for (const ep of epsToShow.slice(0, 3)) {
        console.log(`  Ep ${ep.logical} → provider Part ${ep.partNum} episode ${ep.providerEp} ("${ep.title}")`);
      }
      console.log(`  ... [${epsToShow.length - 6} intermediate episodes] ...`);
      // Last 3
      for (const ep of epsToShow.slice(-3)) {
        console.log(`  Ep ${ep.logical} → provider Part ${ep.partNum} episode ${ep.providerEp} ("${ep.title}")`);
      }
    }

    if (s.skippedCandidates.length > 0) {
      console.log(`\n  Skipped/Invalid Candidates:`);
      for (const sk of s.skippedCandidates) {
        console.log(`  - "${sk.title}" (${sk.providerId}): ${sk.reason}`);
      }
    }
  }

  console.log(`\n======================================================================`);
  console.log(`  PHASE 3 DRY-RUN COMPLETED (0 DATABASE WRITES)`);
  console.log(`======================================================================\n`);
}

main().catch((err) => {
  console.error("Fatal error during Phase 3 dry-run:", err);
  process.exit(1);
});
