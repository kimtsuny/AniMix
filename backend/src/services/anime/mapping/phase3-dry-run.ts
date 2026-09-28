import { planFranchiseMapping } from "./phase3-planner.js";

async function main() {
  const argId = process.argv[2];
  const anilistId = argId ? parseInt(argId, 10) : 16498; // Default AoT

  console.log(`\n======================================================================`);
  console.log(`  PHASE 3 DRY-RUN: ANIKOTO-FIRST MAPPING & MULTI-PART PLANNER`);
  console.log(`  (Read-only, no database writes)`);
  console.log(`======================================================================\n`);

  console.log(`Analyzing franchise for AniList ID: ${anilistId}...`);
  const plan = await planFranchiseMapping(anilistId);

  console.log(`\nFranchise Root: "${plan.rootAnime.title.english ?? plan.rootAnime.title.romaji}" (AniList #${plan.rootAnime.id})`);
  console.log(`Requested:      "${plan.requestedAnime.title.english ?? plan.requestedAnime.title.romaji}" (AniList #${plan.requestedAnime.id})`);
  console.log(`Total Provider Candidates Discovered: ${plan.allDiscoveredCandidates.length}`);
  console.log(`Logical Seasons Planned: ${plan.seasons.length}\n`);

  console.log(`Discovered Candidates Summary:`);
  plan.allDiscoveredCandidates.forEach((c, idx) => {
    console.log(`  [${idx + 1}] [${c.provider}] ID: ${c.providerId} | "${c.title}" | Episodes: ${c.episodeCount}${c.alternativeTitle?.romaji ? ` (Alt: "${c.alternativeTitle.romaji}")` : ""}`);
  });
  console.log("");

  for (const s of plan.seasons) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`Logical Season ${s.seasonNumber}: "${s.title}" (AniList #${s.anilistId ?? "None"})`);
    console.log(`Provider Parts Count: ${s.parts.length} | Total Episodes: ${s.totalEpisodes}`);

    const isAniKotoMapped = s.parts.some((p) => p.provider === "anikoto");
    const isParadiseFallback = s.parts.some((p) => p.provider === "animeparadise");
    let fallbackStatus = "Not Required (Mapped via AniKoto)";
    if (isParadiseFallback) {
      fallbackStatus = "REQUIRED & ACTIVE (Mapped via AnimeParadise fallback)";
    } else if (s.parts.length === 0) {
      fallbackStatus = "Attempted (Both AniKoto & AnimeParadise yielded 0 parts / unreleased)";
    }
    console.log(`AnimeParadise Fallback: ${fallbackStatus}`);

    // Candidate scoring breakdown
    if (s.candidatesScored && s.candidatesScored.length > 0) {
      console.log(`\nCandidate Evaluations:`);
      const topEvaluations = s.candidatesScored.slice(0, 5);
      for (const ev of topEvaluations) {
        console.log(`  - [${ev.decision}] Score: ${ev.score} | [${ev.candidate.provider}] ID: ${ev.candidate.providerId} | "${ev.candidate.title}" (eps: ${ev.candidate.episodeCount})`);
        if (ev.reasons.length > 0) {
          console.log(`    Signals: ${ev.reasons.join("; ")}`);
        }
        if (ev.conflicts.length > 0) {
          console.log(`    Conflicts: ${ev.conflicts.join("; ")}`);
        }
      }
    }

    if (s.parts.length === 0) {
      console.log(`\n  ⚠️ No valid provider parts mapped for this season.`);
      continue;
    }

    console.log(`\nSelected Provider Mappings:`);
    s.parts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. Provider:      ${p.provider}`);
      console.log(`     Series ID:     ${p.providerId}`);
      console.log(`     Part Title:    "${p.title}"`);
      console.log(`     Part Number:   ${p.partNumber}`);
      console.log(`     Episode Count: ${p.episodeCount}`);
      console.log(`     Offset:        ${p.episodeOffset}`);
    });

    console.log(`\nLogical Episodes Mapping Summary:`);
    const epsToShow = s.parts.flatMap((p) =>
      p.episodes.map((ep) => ({
        logical: ep.logicalNumber,
        partNum: p.partNumber,
        providerEp: ep.providerNumber,
        title: ep.title,
        id: ep.id,
      }))
    );

    if (epsToShow.length <= 6) {
      for (const ep of epsToShow) {
        console.log(`  Ep ${ep.logical} → Part ${ep.partNum} ep ${ep.providerEp} [${ep.id}] ("${ep.title}")`);
      }
    } else {
      // First 2
      for (const ep of epsToShow.slice(0, 2)) {
        console.log(`  Ep ${ep.logical} → Part ${ep.partNum} ep ${ep.providerEp} [${ep.id}] ("${ep.title}")`);
      }
      console.log(`  ... [${epsToShow.length - 4} intermediate episodes] ...`);
      // Last 2
      for (const ep of epsToShow.slice(-2)) {
        console.log(`  Ep ${ep.logical} → Part ${ep.partNum} ep ${ep.providerEp} [${ep.id}] ("${ep.title}")`);
      }
    }

    if (s.skippedCandidates.length > 0) {
      console.log(`\n  Skipped Candidates:`);
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

