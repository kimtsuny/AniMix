import { getAnimeById, type AniListAnime } from "../../anilist/anilist.service.js";
import { animeParadiseProvider } from "../../streaming/providers/animeparadise.provider.js";
import { aniKotoProvider } from "../../streaming/providers/anikoto.provider.js";
import {
  discoverCandidatesForAnime,
  type DiscoveredCandidate,
  type MappingProviderName,
} from "./candidate-discovery.js";
import { scoreCandidate, type CandidateScoreResult } from "./candidate-scorer.js";
import { classifyTitle } from "./candidate-classifier.js";

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
 * Harvests candidates specifically for one logical season (plus root anime for context).
 * Defaults to AniKoto as provider.
 */
export async function discoverCandidatesForSeason(
  targetGroup: LogicalSeasonDefinition,
  rootAnime: AniListAnime,
  provider: MappingProviderName = "anikoto"
): Promise<DiscoveredCandidate[]> {
  const candidateMap = new Map<string, DiscoveredCandidate>();
  const toHarvest: AniListAnime[] = [targetGroup.primaryAnilistAnime];

  if (targetGroup.primaryAnilistAnime.id !== rootAnime.id) {
    toHarvest.push(rootAnime);
  }

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

  return Array.from(candidateMap.values());
}

/**
 * Scores candidates, validates episode units, deduplicates parts, and computes offsets for a single season group.
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

      const units = rawUnits
        ? rawUnits.map((u) => ({
            number: u.number,
            title: u.title ?? `Episode ${u.number}`,
            id: u.id,
          }))
        : null;

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
      const rawPart =
        pMain.partNumber ??
        pEn?.partNumber ??
        pMain.courNumber ??
        pEn?.courNumber ??
        1;

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
 * Defaults to AniKoto as primary provider, with automatic AnimeParadise fallback if AniKoto mapping yields 0 parts.
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
  const primaryCandidates = await discoverCandidatesForSeason(
    targetGroup,
    rootAnime,
    preferredProvider
  );
  const primaryPlan = await planSeasonFromCandidates(
    targetGroup,
    primaryCandidates
  );

  if (primaryPlan.parts.length > 0) {
    return primaryPlan;
  }

  // 2. Fallback: If primary is anikoto and failed, fallback to animeparadise
  if (preferredProvider === "anikoto") {
    console.log(
      `[Planner] AniKoto yielded 0 parts for season ${targetGroup.logicalSeasonNumber} ("${targetGroup.displayTitle}"). Falling back to AnimeParadise...`
    );
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
  }

  return primaryPlan;
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
