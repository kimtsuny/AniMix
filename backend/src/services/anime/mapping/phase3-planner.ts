import { getAnimeById, type AniListAnime } from "../../anilist/anilist.service.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";
import { discoverCandidatesForAnime, type DiscoveredCandidate } from "./candidate-discovery.js";
import { scoreCandidate, type CandidateScoreResult } from "./candidate-scorer.js";
import { classifyTitle } from "./candidate-classifier.js";

export interface PlannedPart {
  partNumber: number;
  provider: "animeparadise";
  providerId: string;
  title: string;
  episodeOffset: number;
  episodeCount: number;
  episodes: Array<{
    providerNumber: number;
    logicalNumber: number;
    title: string;
    id: string;
  }>;
}

export interface PlannedSeason {
  seasonNumber: number;
  anilistId: number | null;
  title: string;
  parts: PlannedPart[];
  totalEpisodes: number;
  candidatesScored: CandidateScoreResult[];
  skippedCandidates: Array<{
    providerId: string;
    title: string;
    reason: string;
  }>;
}

export interface FranchisePlan {
  rootAnime: AniListAnime;
  requestedAnime: AniListAnime;
  allDiscoveredCandidates: DiscoveredCandidate[];
  seasons: PlannedSeason[];
}

/**
 * Resolves the root TV anime by traversing backwards through PREQUEL edges.
 */
export async function resolveRootTvAnime(
  anime: AniListAnime
): Promise<AniListAnime> {
  let current = anime;
  let rootTv = anime;
  const visited = new Set<number>();

  while (!visited.has(current.id)) {
    visited.add(current.id);

    const prequel = current.relations.edges.find(
      (edge) =>
        edge.relationType === "PREQUEL" &&
        edge.node.type === "ANIME"
    );

    if (!prequel) break;

    try {
      current = await getAnimeById(prequel.node.id);
      if (current.format === "TV" || current.format === "TV_SHORT" || current.format === null) {
        rootTv = current;
      }
    } catch {
      break;
    }
  }

  return rootTv;
}

/**
 * Traverses SEQUEL relations forward from root to discover all TV seasons in franchise.
 */
export async function collectFranchiseSeasons(
  rootAnime: AniListAnime
): Promise<AniListAnime[]> {
  const seasons: AniListAnime[] = [rootAnime];
  const visited = new Set<number>([rootAnime.id]);
  let current = rootAnime;

  while (current) {
    const sequelEdges = current.relations.edges.filter(
      (edge) =>
        edge.relationType === "SEQUEL" &&
        edge.node.type === "ANIME" &&
        (edge.node.format === "TV" || edge.node.format === null || edge.node.format === "TV_SHORT")
    );

    if (sequelEdges.length === 0) {
      // Check if there is an intermediate sequel (like an OVA/Movie/Special) that leads to another TV sequel
      const nonTvSequel = current.relations.edges.find(
        (edge) =>
          edge.relationType === "SEQUEL" &&
          edge.node.type === "ANIME" &&
          !visited.has(edge.node.id)
      );
      if (nonTvSequel) {
        try {
          const intermediate = await getAnimeById(nonTvSequel.node.id);
          visited.add(intermediate.id);
          const nextTvSequel = intermediate.relations.edges.find(
            (edge) =>
              edge.relationType === "SEQUEL" &&
              edge.node.type === "ANIME" &&
              (edge.node.format === "TV" || edge.node.format === null || edge.node.format === "TV_SHORT") &&
              !visited.has(edge.node.id)
          );
          if (nextTvSequel) {
            const nextAnime = await getAnimeById(nextTvSequel.node.id);
            visited.add(nextAnime.id);
            seasons.push(nextAnime);
            current = nextAnime;
            continue;
          }
        } catch {
          // ignore
        }
      }
      break;
    }

    let nextFound = false;
    for (const edge of sequelEdges) {
      if (!visited.has(edge.node.id)) {
        visited.add(edge.node.id);
        try {
          const nextAnime = await getAnimeById(edge.node.id);
          seasons.push(nextAnime);
          current = nextAnime;
          nextFound = true;
          break;
        } catch {
          // continue
        }
      }
    }

    if (!nextFound) break;
  }

  return seasons;
}

/**
 * Groups AniList franchise entries into logical seasons.
 * Handles split-cours / parts belonging to the same season (e.g. AoT S3 P1 & P2).
 */
export interface LogicalSeasonDefinition {
  logicalSeasonNumber: number;
  primaryAnilistAnime: AniListAnime;
  relatedAnilistEntries: AniListAnime[];
  displayTitle: string;
}

export function groupIntoLogicalSeasons(
  franchiseEntries: AniListAnime[]
): LogicalSeasonDefinition[] {
  const groups: LogicalSeasonDefinition[] = [];

  for (const entry of franchiseEntries) {
    const titleEn = entry.title.english ?? "";
    const titleRo = entry.title.romaji ?? "";
    const parsed = classifyTitle(titleEn || titleRo);

    const detectedNum =
      parsed.explicitSeasonNumber ?? parsed.ordinalSeasonNumber;

    const isPartOrCour =
      (parsed.partNumber !== null && parsed.partNumber > 1) ||
      (parsed.courNumber !== null && parsed.courNumber > 1);

    // If this is a subsequent part/cour of the previous season, attach to last group
    if (isPartOrCour && groups.length > 0) {
      const lastGroup = groups[groups.length - 1];
      // Verify base title compatibility
      lastGroup.relatedAnilistEntries.push(entry);
      continue;
    }

    // Determine logical season number
    let seasonNumber: number;
    if (detectedNum !== null) {
      seasonNumber = detectedNum;
    } else if (groups.length > 0) {
      seasonNumber = groups[groups.length - 1].logicalSeasonNumber + 1;
    } else {
      seasonNumber = 1;
    }

    // Check if an existing group with this exact seasonNumber already exists
    const existingGroup = groups.find(
      (g) => g.logicalSeasonNumber === seasonNumber
    );

    if (existingGroup) {
      existingGroup.relatedAnilistEntries.push(entry);
    } else {
      groups.push({
        logicalSeasonNumber: seasonNumber,
        primaryAnilistAnime: entry,
        relatedAnilistEntries: [entry],
        displayTitle:
          entry.title.english ?? entry.title.romaji ?? `Season ${seasonNumber}`,
      });
    }
  }

  return groups;
}

/**
 * Plans franchise mapping and multi-part episode offsets without touching the DB.
 */
// In-memory episode cache to avoid repeated network calls for the same provider entry
const episodeUnitsCache = new Map<
  string,
  Array<{ number: number; title: string; id: string }>
>();

export async function planFranchiseMapping(
  anilistId: number
): Promise<FranchisePlan> {
  const requestedAnime = await getAnimeById(anilistId);
  const rootAnime = await resolveRootTvAnime(requestedAnime);

  // Collect franchise chain
  const franchiseEntries = await collectFranchiseSeasons(rootAnime);
  const logicalGroups = groupIntoLogicalSeasons(franchiseEntries);

  // Harvest candidates from all franchise entries
  const candidateMap = new Map<string, DiscoveredCandidate>();
  for (const entry of franchiseEntries) {
    try {
      const disc = await discoverCandidatesForAnime(entry);
      for (const c of disc.candidates) {
        if (!candidateMap.has(c.providerId)) {
          candidateMap.set(c.providerId, c);
        }
      }
    } catch (err: any) {
      console.warn(`[Planner] Candidate discovery failed for entry #${entry.id}: ${err.message}`);
    }
  }

  const allCandidates = Array.from(candidateMap.values());
  const plannedSeasons: PlannedSeason[] = [];

  for (const group of logicalGroups) {
    const target = group.primaryAnilistAnime;
    const scoredList = allCandidates.map((cand) =>
      scoreCandidate(target, cand)
    );

    scoredList.sort((a, b) => b.score - a.score);

    // Keep MATCHED candidates
    const matched = scoredList.filter((c) => c.decision === "MATCHED");
    const skippedCandidates: Array<{
      providerId: string;
      title: string;
      reason: string;
    }> = [];

    // Filter and validate candidates with actual episode endpoint
    const validParts: Array<{
      candidate: DiscoveredCandidate;
      partNumber: number;
      actualUnits: Array<{
        providerNumber: number;
        title: string;
        id: string;
      }>;
    }> = [];

    for (const match of matched) {
      try {
        let units = episodeUnitsCache.get(match.candidate.providerId);
        if (!units) {
          const rawUnits = await animeParadiseProvider.getEpisodes(
            match.candidate.providerId
          );
          if (rawUnits) {
            units = rawUnits.map((u) => ({
              number: u.number,
              title: u.title,
              id: u.id,
            }));
            episodeUnitsCache.set(match.candidate.providerId, units);
          }
        }

        if (!units || units.length === 0) {
          skippedCandidates.push({
            providerId: match.candidate.providerId,
            title: match.candidate.title,
            reason: "Provider episode endpoint returned 0 episodes",
          });
          continue;
        }

        // Determine part number
        const pMain = match.candidate.parsedMain;
        const pEn = match.candidate.parsedEnglish;
        const rawPart = pMain.partNumber ?? pEn?.partNumber ?? pMain.courNumber ?? pEn?.courNumber ?? 1;

        validParts.push({
          candidate: match.candidate,
          partNumber: rawPart,
          actualUnits: units.map((u) => ({
            providerNumber: u.number,
            title: u.title,
            id: u.id,
          })),
        });
      } catch (err: any) {
        skippedCandidates.push({
          providerId: match.candidate.providerId,
          title: match.candidate.title,
          reason: `Failed to fetch episodes: ${err.message}`,
        });
      }
    }

    // Deduplicate parts by partNumber:
    // If multiple candidates have the same partNumber (e.g. part 1), pick the best candidate (highest score)
    const bestByPartNumber = new Map<number, (typeof validParts)[0]>();
    for (const vp of validParts) {
      const existing = bestByPartNumber.get(vp.partNumber);
      if (!existing) {
        bestByPartNumber.set(vp.partNumber, vp);
      } else {
        const existingScore =
          scoredList.find((s) => s.candidate.providerId === existing.candidate.providerId)?.score ?? 0;
        const newScore =
          scoredList.find((s) => s.candidate.providerId === vp.candidate.providerId)?.score ?? 0;
        if (newScore > existingScore) {
          bestByPartNumber.set(vp.partNumber, vp);
        }
      }
    }

    const uniqueParts = Array.from(bestByPartNumber.values()).sort(
      (a, b) => a.partNumber - b.partNumber
    );

    const partsWithOffsets: PlannedPart[] = [];
    let currentOffset = 0;

    for (const vp of uniqueParts) {
      const uniqueEpNumbers = new Set(vp.actualUnits.map((u) => u.providerNumber));
      const partEpCount = uniqueEpNumbers.size > 0 ? uniqueEpNumbers.size : vp.actualUnits.length;
      const plannedEps = vp.actualUnits.map((u) => ({
        providerNumber: u.providerNumber,
        logicalNumber: u.providerNumber + currentOffset,
        title: u.title,
        id: u.id,
      }));

      partsWithOffsets.push({
        partNumber: vp.partNumber,
        provider: "animeparadise",
        providerId: vp.candidate.providerId,
        title: vp.candidate.title,
        episodeOffset: currentOffset,
        episodeCount: partEpCount,
        episodes: plannedEps,
      });

      currentOffset += partEpCount;
    }

    plannedSeasons.push({
      seasonNumber: group.logicalSeasonNumber,
      anilistId: target.id,
      title: group.displayTitle,
      parts: partsWithOffsets,
      totalEpisodes: currentOffset,
      candidatesScored: scoredList,
      skippedCandidates,
    });
  }

  return {
    rootAnime,
    requestedAnime,
    allDiscoveredCandidates: allCandidates,
    seasons: plannedSeasons,
  };
}
