import {
  getAnimeById,
  getAnimeBasicById,
  type AniListAnime,
} from "../../anilist/anilist.service.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";
import {
  discoverCandidatesForAnime,
  type DiscoveredCandidate,
  type MappingProviderName,
} from "./candidate-discovery.js";
import { scoreCandidate, type CandidateScoreResult } from "./candidate-scorer.js";
import { classifyTitle } from "./candidate-classifier.js";
import { isSameLogicalSeriesSeason } from "./season-classifier.js";

export interface PlannedPart {
  partNumber: number;
  provider: MappingProviderName;
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
  const queue: AniListAnime[] = [rootAnime];

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Find all SEQUEL edges that represent TV, TV_SHORT, or ONA series
    const sequelEdges = current.relations.edges.filter(
      (edge) =>
        edge.relationType === "SEQUEL" &&
        edge.node.type === "ANIME" &&
        (edge.node.format === "TV" ||
          edge.node.format === null ||
          edge.node.format === "TV_SHORT" ||
          edge.node.format === "ONA")
    );

    for (const edge of sequelEdges) {
      if (!visited.has(edge.node.id)) {
        visited.add(edge.node.id);
        try {
          const nextAnime = await getAnimeById(edge.node.id);
          seasons.push(nextAnime);
          queue.push(nextAnime);
        } catch {
          // ignore error fetching node
        }
      }
    }

    // Also check intermediate non-TV sequels (like an OVA/Movie/Special) that bridge to another TV sequel
    const nonTvSequels = current.relations.edges.filter(
      (edge) =>
        edge.relationType === "SEQUEL" &&
        edge.node.type === "ANIME" &&
        edge.node.format !== "TV" &&
        edge.node.format !== "TV_SHORT" &&
        edge.node.format !== "ONA" &&
        !visited.has(edge.node.id)
    );

    for (const nonTv of nonTvSequels) {
      try {
        const intermediate = await getAnimeById(nonTv.node.id);
        visited.add(intermediate.id);
        const nextTvSequels = intermediate.relations.edges.filter(
          (edge) =>
            edge.relationType === "SEQUEL" &&
            edge.node.type === "ANIME" &&
            (edge.node.format === "TV" ||
              edge.node.format === null ||
              edge.node.format === "TV_SHORT" ||
              edge.node.format === "ONA") &&
            !visited.has(edge.node.id)
        );
        for (const nextEdge of nextTvSequels) {
          if (!visited.has(nextEdge.node.id)) {
            visited.add(nextEdge.node.id);
            const nextAnime = await getAnimeById(nextEdge.node.id);
            seasons.push(nextAnime);
            queue.push(nextAnime);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return seasons;
}

/**
 * Groups AniList franchise entries into logical seasons.
 * Handles split-cours / parts belonging to the same season (e.g. AoT S3 P1 & P2).
 * For franchises without explicit season numbers, sorts chronologically by release year.
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
  // Sort franchise entries:
  // If explicit season numbers exist on entries, respect them.
  // Otherwise, sort chronologically by release year / start date (Critical Rule #4).
  const sortedEntries = [...franchiseEntries].sort((a, b) => {
    const parsedA = classifyTitle(a.title.english || a.title.romaji || "");
    const parsedB = classifyTitle(b.title.english || b.title.romaji || "");
    const numA = parsedA.explicitSeasonNumber ?? parsedA.ordinalSeasonNumber;
    const numB = parsedB.explicitSeasonNumber ?? parsedB.ordinalSeasonNumber;

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    }

    const yearA = a.seasonYear ?? a.startDate?.year ?? 0;
    const yearB = b.seasonYear ?? b.startDate?.year ?? 0;

    // Entries with missing or unannounced release year sort at the end (future/TBA)
    if (yearA === 0 && yearB !== 0) return 1;
    if (yearB === 0 && yearA !== 0) return -1;

    const dateA =
      yearA * 10000 +
      ((a.startDate?.month ?? 1) * 100) +
      (a.startDate?.day ?? 1);

    const dateB =
      yearB * 10000 +
      ((b.startDate?.month ?? 1) * 100) +
      (b.startDate?.day ?? 1);

    if (dateA !== dateB) return dateA - dateB;

    return a.id - b.id;
  });

  const groups: LogicalSeasonDefinition[] = [];

  for (const entry of sortedEntries) {
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
 * Bounded Series Structure for Watch-Path Resolution.
 * Only resolves genuine seasons of the requested logical series,
 * without traversing unrelated franchise works.
 */
export interface BoundedSeriesStructure {
  seriesRootAnime: AniListAnime;
  requestedAnime: AniListAnime;
  seasons: Array<{
    seasonNumber: number;
    anilistId: number;
    title: string;
    anime: AniListAnime;
  }>;
  requestedSeasonNumber: number;
  logicalGroups: LogicalSeasonDefinition[];
}

const MAX_RELATION_NODES_INSPECTED = 6;
const MAX_PROVIDER_CANDIDATE_RETRIES = 2;

/**
 * Resolves a bounded series structure specifically for the watch critical path.
 * Strict limits:
 * - At most 2 backward steps through PREQUEL to find root (only if isSameLogicalSeriesSeason is true).
 * - At most 4 forward steps through SEQUEL to find genuine seasons.
 * - Maximum 6 total relation nodes inspected.
 * - Never walk into spin-offs, movies, OVAs, or separate franchise eras.
 */
export async function resolveBoundedSeriesStructure(
  anilistId: number
): Promise<BoundedSeriesStructure> {
  const requestedAnime = await getAnimeById(anilistId);
  let inspectedCount = 0;

  // 1. Identify Series Root (bounded backward walk through PREQUEL, max 2 steps)
  let seriesRoot = requestedAnime;
  let currentBackward = requestedAnime;
  const backwardVisited = new Set<number>([requestedAnime.id]);
  let backwardSteps = 0;

  while (backwardSteps < 2 && inspectedCount < MAX_RELATION_NODES_INSPECTED) {
    const prequelEdge = (currentBackward.relations?.edges ?? []).find(
      (e) => e.relationType === "PREQUEL" && e.node?.type === "ANIME"
    );
    if (!prequelEdge || backwardVisited.has(prequelEdge.node.id)) break;

    inspectedCount++;
    backwardVisited.add(prequelEdge.node.id);

    // Check if prequel is genuine prior season of this series
    const isSame = isSameLogicalSeriesSeason(
      currentBackward,
      prequelEdge.node,
      "PREQUEL"
    );
    if (!isSame) break;

    try {
      const prequelAnime = await getAnimeBasicById(prequelEdge.node.id);
      seriesRoot = prequelAnime;
      currentBackward = prequelAnime;
      backwardSteps++;
    } catch {
      break;
    }
  }

  // 2. Collect genuine seasons forward from seriesRoot (bounded forward walk through SEQUEL, max 4 steps)
  const seasonEntries: AniListAnime[] = [seriesRoot];
  const forwardVisited = new Set<number>([seriesRoot.id]);
  let currentForward = seriesRoot;
  let forwardSteps = 0;

  while (forwardSteps < 4 && inspectedCount < MAX_RELATION_NODES_INSPECTED) {
    const sequelEdges = (currentForward.relations?.edges ?? []).filter(
      (e) => e.relationType === "SEQUEL" && e.node?.type === "ANIME"
    );

    let nextSeasonFound = false;
    for (const edge of sequelEdges) {
      if (forwardVisited.has(edge.node.id)) continue;
      if (inspectedCount >= MAX_RELATION_NODES_INSPECTED) break;

      inspectedCount++;
      forwardVisited.add(edge.node.id);

      const isSame = isSameLogicalSeriesSeason(
        currentForward,
        edge.node,
        "SEQUEL"
      );
      if (isSame) {
        try {
          const nextAnime =
            edge.node.id === requestedAnime.id
              ? requestedAnime
              : await getAnimeBasicById(edge.node.id);
          seasonEntries.push(nextAnime);
          currentForward = nextAnime;
          forwardSteps++;
          nextSeasonFound = true;
          break;
        } catch {
          // ignore error fetching node
        }
      }
    }

    if (!nextSeasonFound) break;
  }

  // Ensure requested anime is always present
  if (!seasonEntries.some((e) => e.id === requestedAnime.id)) {
    seasonEntries.push(requestedAnime);
  }

  // 3. Group genuine season entries into logical seasons
  const logicalGroups = groupIntoLogicalSeasons(seasonEntries);

  // 4. Map logicalGroups to seasons list and identify requestedSeasonNumber
  let requestedSeasonNumber = 1;
  const seasons = logicalGroups.map((group) => {
    const isTarget =
      group.primaryAnilistAnime.id === requestedAnime.id ||
      group.relatedAnilistEntries.some((e) => e.id === requestedAnime.id);

    if (isTarget) {
      requestedSeasonNumber = group.logicalSeasonNumber;
    }

    return {
      seasonNumber: group.logicalSeasonNumber,
      anilistId: group.primaryAnilistAnime.id,
      title: group.displayTitle,
      anime: group.primaryAnilistAnime,
    };
  });

  return {
    seriesRootAnime: seriesRoot,
    requestedAnime,
    seasons,
    requestedSeasonNumber,
    logicalGroups,
  };
}

/**
 * Plans franchise mapping and multi-part episode offsets without touching the DB.
 */

export interface FranchiseStructure {
  rootAnime: AniListAnime;
  requestedAnime: AniListAnime;
  franchiseEntries: AniListAnime[];
  logicalGroups: LogicalSeasonDefinition[];
}

/**
 * Lightweight franchise metadata discovery using AniList GraphQL only.
 * Fast: does not query AnimeParadise or fetch episodes.
 */
export async function discoverFranchiseStructure(
  anilistId: number
): Promise<FranchiseStructure> {
  const requestedAnime = await getAnimeById(anilistId);
  const rootAnime = await resolveRootTvAnime(requestedAnime);
  const franchiseEntries = await collectFranchiseSeasons(rootAnime);
  const logicalGroups = groupIntoLogicalSeasons(franchiseEntries);

  return {
    rootAnime,
    requestedAnime,
    franchiseEntries,
    logicalGroups,
  };
}

/**
 * Harvests candidates specifically for one logical season.
 * Searches primarily for the target season entry; only falls back to root if 0 candidates found.
 * Defaults to AniKoto as provider.
 */
export async function discoverCandidatesForSeason(
  targetGroup: LogicalSeasonDefinition,
  rootAnime: AniListAnime,
  provider: MappingProviderName = "anikoto"
): Promise<DiscoveredCandidate[]> {
  const candidateMap = new Map<string, DiscoveredCandidate>();
  const toHarvest: AniListAnime[] = [targetGroup.primaryAnilistAnime];

  for (const rel of targetGroup.relatedAnilistEntries) {
    if (!toHarvest.some((e) => e.id === rel.id)) {
      toHarvest.push(rel);
    }
  }

  for (const entry of toHarvest) {
    try {
      const disc = await discoverCandidatesForAnime(entry, provider);
      for (const c of disc.candidates) {
        if (!candidateMap.has(c.providerId)) {
          candidateMap.set(c.providerId, c);
        }
      }
    } catch (err: any) {
      console.warn(
        `[Planner] Candidate discovery failed for entry #${entry.id} (${provider}): ${err.message}`
      );
    }
  }

  // If targetGroup has no candidates and is a subsequent season, fallback to rootAnime title search
  if (candidateMap.size === 0 && targetGroup.primaryAnilistAnime.id !== rootAnime.id) {
    try {
      const disc = await discoverCandidatesForAnime(rootAnime, provider);
      for (const c of disc.candidates) {
        if (!candidateMap.has(c.providerId)) {
          candidateMap.set(c.providerId, c);
        }
      }
    } catch (err: any) {
      // ignore
    }
  }

  return Array.from(candidateMap.values());
}

/**
 * Scores candidates, ranks them, selects the best valid candidate per part,
 * and fetches episodes ONCE (with strict retry limit on failure) to eliminate N+1 calls.
 */
export async function planSeasonFromCandidates(
  group: LogicalSeasonDefinition,
  allCandidates: DiscoveredCandidate[]
): Promise<PlannedSeason> {
  const target = group.primaryAnilistAnime;
  const scoredList = allCandidates.map((cand) =>
    scoreCandidate(target, cand)
  );

  scoredList.sort((a, b) => b.score - a.score);

  // Consider candidates with decision === "MATCHED" or score >= 0.72
  const viable = scoredList.filter(
    (c) => c.decision === "MATCHED" || c.score >= 0.72
  );

  const skippedCandidates: Array<{
    providerId: string;
    title: string;
    reason: string;
  }> = [];

  // Group viable candidates by partNumber
  const candidatesByPart = new Map<number, typeof viable>();
  for (const match of viable) {
    const pMain = match.candidate.parsedMain;
    const pEn = match.candidate.parsedEnglish;
    const rawPart =
      pMain.partNumber ??
      pEn?.partNumber ??
      pMain.courNumber ??
      pEn?.courNumber ??
      1;

    if (!candidatesByPart.has(rawPart)) {
      candidatesByPart.set(rawPart, []);
    }
    candidatesByPart.get(rawPart)!.push(match);
  }

  const validParts: Array<{
    candidate: DiscoveredCandidate;
    partNumber: number;
    actualUnits: Array<{
      providerNumber: number;
      title: string;
      id: string;
    }>;
  }> = [];

  // For each detected part number, try the best candidate first!
  const sortedPartNumbers = Array.from(candidatesByPart.keys()).sort((a, b) => a - b);

  for (const partNum of sortedPartNumbers) {
    const partCandidates = candidatesByPart.get(partNum)!;
    let retries = 0;

    for (const match of partCandidates) {
      if (retries > MAX_PROVIDER_CANDIDATE_RETRIES) break;

      try {
        let rawUnits: Array<{ number: number; title?: string; id: string }> | null = null;
        if (match.candidate.provider === "anikoto") {
          const kotoUnits = await aniKotoProvider.getEpisodes(
            match.candidate.providerId
          );
          if (kotoUnits && kotoUnits.length > 0) {
            rawUnits = kotoUnits.map((u) => ({
              number: u.number,
              title: u.title || `Episode ${u.number}`,
              id: u.id,
            }));
          }
        } else {
          const paradiseUnits = await animeParadiseProvider.getEpisodes(
            match.candidate.providerId
          );
          if (paradiseUnits && paradiseUnits.length > 0) {
            rawUnits = paradiseUnits.map((u) => ({
              number: u.number,
              title: u.title || `Episode ${u.number}`,
              id: u.id,
            }));
          }
        }

        if (!rawUnits || rawUnits.length === 0) {
          skippedCandidates.push({
            providerId: match.candidate.providerId,
            title: match.candidate.title,
            reason: "Provider episode endpoint returned 0 episodes",
          });
          retries++;
          continue;
        }

        validParts.push({
          candidate: match.candidate,
          partNumber: partNum,
          actualUnits: rawUnits.map((u) => ({
            providerNumber: u.number,
            title: u.title ?? `Episode ${u.number}`,
            id: u.id,
          })),
        });
        break; // Successfully resolved this part with the best candidate!
      } catch (err: any) {
        skippedCandidates.push({
          providerId: match.candidate.providerId,
          title: match.candidate.title,
          reason: `Failed to fetch episodes: ${err.message}`,
        });
        retries++;
      }
    }
  }

  const uniqueParts = validParts.sort((a, b) => a.partNumber - b.partNumber);

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
      provider: vp.candidate.provider,
      providerId: vp.candidate.providerId,
      title: vp.candidate.title,
      episodeOffset: currentOffset,
      episodeCount: partEpCount,
      episodes: plannedEps,
    });

    currentOffset += partEpCount;
  }

  return {
    seasonNumber: group.logicalSeasonNumber,
    anilistId: target.id,
    title: group.displayTitle,
    parts: partsWithOffsets,
    totalEpisodes: currentOffset,
    candidatesScored: scoredList,
    skippedCandidates,
  };
}

/**
 * Plans mapping for ONLY one requested season.
 * Rule:
 * 1. AniKoto candidate score >= 0.72 -> use AniKoto
 * 2. If AniKoto yields no candidate >= 0.72 or search/episodes fail -> emergency fallback to AnimeParadise.
 */
export async function planSingleSeason(
  targetGroup: LogicalSeasonDefinition,
  rootAnime: AniListAnime,
  candidates?: DiscoveredCandidate[],
  preferredProvider: MappingProviderName = "anikoto"
): Promise<PlannedSeason> {
  if (candidates && candidates.length > 0) {
    return planSeasonFromCandidates(targetGroup, candidates);
  }

  // 1. Primary: Try preferredProvider (default AniKoto)
  let primaryPlan: PlannedSeason | null = null;
  try {
    const primaryCandidates = await discoverCandidatesForSeason(
      targetGroup,
      rootAnime,
      preferredProvider
    );

    const hasViableCandidate = primaryCandidates.some((c) => {
      const score = scoreCandidate(targetGroup.primaryAnilistAnime, c);
      return score.decision === "MATCHED" || score.score >= 0.72;
    });

    if (hasViableCandidate) {
      primaryPlan = await planSeasonFromCandidates(
        targetGroup,
        primaryCandidates
      );
      if (primaryPlan.parts.length > 0) {
        return primaryPlan;
      }
    }
  } catch (err: any) {
    console.warn(
      `[Planner] Primary provider ${preferredProvider} candidate discovery failed: ${err.message}`
    );
  }

  // 2. Fallback: If primary is anikoto and failed, fallback to animeparadise
  if (preferredProvider === "anikoto") {
    console.log(
      `[Planner] AniKoto yielded 0 parts for season ${targetGroup.logicalSeasonNumber} ("${targetGroup.displayTitle}"). Falling back to AnimeParadise...`
    );
    try {
      const fallbackCandidates = await discoverCandidatesForSeason(
        targetGroup,
        rootAnime,
        "animeparadise"
      );
      const fallbackPlan = await planSeasonFromCandidates(
        targetGroup,
        fallbackCandidates
      );

      if (fallbackPlan.parts.length > 0) {
        console.log(
          `[Planner] AnimeParadise fallback SUCCEEDED for season ${targetGroup.logicalSeasonNumber}: ${fallbackPlan.parts.length} part(s) mapped.`
        );
        return fallbackPlan;
      }
    } catch (err: any) {
      console.warn(
        `[Planner] AnimeParadise fallback failed: ${err.message}`
      );
    }
  }

  return (
    primaryPlan ?? {
      seasonNumber: targetGroup.logicalSeasonNumber,
      anilistId: targetGroup.primaryAnilistAnime.id,
      title: targetGroup.displayTitle,
      parts: [],
      totalEpisodes: 0,
      candidatesScored: [],
      skippedCandidates: [],
    }
  );
}

/**
 * Full franchise planning across all seasons.
 * Uses AniKoto as primary provider with season-level fallback to AnimeParadise.
 */
export async function planFranchiseMapping(
  anilistId: number,
  preferredProvider: MappingProviderName = "anikoto"
): Promise<FranchisePlan> {
  const structure = await discoverFranchiseStructure(anilistId);
  const { rootAnime, requestedAnime, franchiseEntries, logicalGroups } = structure;

  // Harvest candidates from preferred provider for all franchise entries
  const primaryCandidateMap = new Map<string, DiscoveredCandidate>();
  for (const entry of franchiseEntries) {
    try {
      const disc = await discoverCandidatesForAnime(entry, preferredProvider);
      for (const c of disc.candidates) {
        if (!primaryCandidateMap.has(c.providerId)) {
          primaryCandidateMap.set(c.providerId, c);
        }
      }
    } catch (err: any) {
      console.warn(
        `[Planner] ${preferredProvider} candidate discovery failed for entry #${entry.id}: ${err.message}`
      );
    }
  }

  const allPrimaryCandidates = Array.from(primaryCandidateMap.values());
  const allDiscoveredCandidates: DiscoveredCandidate[] = [...allPrimaryCandidates];
  const plannedSeasons: PlannedSeason[] = [];

  for (const group of logicalGroups) {
    let plannedSeason = await planSeasonFromCandidates(group, allPrimaryCandidates);

    // If preferred provider is AniKoto and produced 0 parts, attempt AnimeParadise fallback for this season
    if (plannedSeason.parts.length === 0 && preferredProvider === "anikoto") {
      console.log(
        `[Planner] AniKoto yielded 0 parts for season ${group.logicalSeasonNumber} ("${group.displayTitle}"). Attempting AnimeParadise fallback...`
      );
      const fallbackCandidates = await discoverCandidatesForSeason(
        group,
        rootAnime,
        "animeparadise"
      );
      for (const fc of fallbackCandidates) {
        if (!allDiscoveredCandidates.some((c) => c.provider === fc.provider && c.providerId === fc.providerId)) {
          allDiscoveredCandidates.push(fc);
        }
      }

      const fallbackSeason = await planSeasonFromCandidates(group, fallbackCandidates);
      if (fallbackSeason.parts.length > 0) {
        console.log(
          `[Planner] AnimeParadise fallback SUCCEEDED for season ${group.logicalSeasonNumber}: ${fallbackSeason.parts.length} part(s) mapped.`
        );
        plannedSeason = fallbackSeason;
      }
    }

    plannedSeasons.push(plannedSeason);
  }

  return {
    rootAnime,
    requestedAnime,
    allDiscoveredCandidates,
    seasons: plannedSeasons,
  };
}
