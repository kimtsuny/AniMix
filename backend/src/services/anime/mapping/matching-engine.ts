import { getAnimeById, type AniListAnime } from "../../anilist/anilist.service.js";
import {
  discoverCandidatesForAnime,
  type DiscoveredCandidate,
} from "./candidate-discovery.js";
import {
  scoreCandidate,
  type CandidateScoreResult,
  type ScorerWeights,
} from "./candidate-scorer.js";

export interface MatchingEngineResult {
  anilist: AniListAnime;
  searchQueries: string[];
  allCandidates: DiscoveredCandidate[];
  scoredCandidates: CandidateScoreResult[];
  matchedCandidates: CandidateScoreResult[];
  ambiguousCandidates: CandidateScoreResult[];
  unmappedCandidates: CandidateScoreResult[];
  summary: {
    totalDiscovered: number;
    matchedCount: number;
    ambiguousCount: number;
    unmappedCount: number;
  };
}

/**
 * Executes Phase 2 candidate discovery and scoring for an AniList anime.
 *
 * Flow:
 * 1. Fetch AniList metadata and relation context.
 * 2. Generate deduplicated multi-term search queries.
 * 3. Query AnimeParadise and deduplicate candidates by provider ID.
 * 4. Parse title semantics (seasons, parts, formats, years).
 * 5. Deterministically score each candidate against target context.
 * 6. Categorize into MATCHED / AMBIGUOUS / UNMAPPED without modifying database state.
 */
export async function matchAnimeCandidates(
  anilistId: number,
  customWeights?: ScorerWeights
): Promise<MatchingEngineResult> {
  const anilistAnime = await getAnimeById(anilistId);

  const discovery = await discoverCandidatesForAnime(anilistAnime);

  const scoredCandidates: CandidateScoreResult[] = discovery.candidates.map(
    (candidate) => scoreCandidate(anilistAnime, candidate, customWeights)
  );

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const matchedCandidates = scoredCandidates.filter(
    (c) => c.decision === "MATCHED"
  );
  const ambiguousCandidates = scoredCandidates.filter(
    (c) => c.decision === "AMBIGUOUS"
  );
  const unmappedCandidates = scoredCandidates.filter(
    (c) => c.decision === "UNMAPPED"
  );

  return {
    anilist: anilistAnime,
    searchQueries: discovery.searchQueries,
    allCandidates: discovery.candidates,
    scoredCandidates,
    matchedCandidates,
    ambiguousCandidates,
    unmappedCandidates,
    summary: {
      totalDiscovered: discovery.candidates.length,
      matchedCount: matchedCandidates.length,
      ambiguousCount: ambiguousCandidates.length,
      unmappedCount: unmappedCandidates.length,
    },
  };
}
