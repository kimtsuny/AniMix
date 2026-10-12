import {
  calculateEpisodeBatches,
  findBatchIndexForEpisode,
  getEpisodeKey,
  getBatchEpisodes,
  DEFAULT_BATCH_SIZE,
  shouldShowEpisodeRangeSelector,
} from "../episodeBatching";
import type { Episode } from "../../api/services/episode.service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

function createMockEpisodes(count: number, startNumber = 1): Episode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i,
    number: startNumber + i,
    title: `Episode ${startNumber + i}`,
    thumbnail: `https://example.com/thumb-${startNumber + i}.jpg`,
    provider: "anikoto",
    providerId: `koto-${startNumber + i}`,
  }));
}

console.log("--- Starting Episode Batching & Presentation Tests ---\n");

// 1. Safe baseline and boundary calculations with DEFAULT_BATCH_SIZE = 100
console.log("1. Boundary calculations for episode batches (batch size 100):");
{
  assert(DEFAULT_BATCH_SIZE === 100, "DEFAULT_BATCH_SIZE is exactly 100");

  const emptyBatches = calculateEpisodeBatches([]);
  assert(emptyBatches.length === 0, "Empty episodes returns 0 batches");

  const singleBatches = calculateEpisodeBatches(createMockEpisodes(1));
  assert(singleBatches.length === 1, "1 episode produces 1 batch");
  assert(singleBatches[0].label === "1–1", "1 episode label is 1–1");
  assert(singleBatches[0].count === 1, "1 episode count is 1");

  const twelveBatches = calculateEpisodeBatches(createMockEpisodes(12));
  assert(twelveBatches.length === 1, "12 episodes produces 1 batch");
  assert(twelveBatches[0].label === "1–12", "12 episodes label is 1–12");
  assert(twelveBatches[0].count === 12, "12 episodes count is 12");

  const fiftyBatches = calculateEpisodeBatches(createMockEpisodes(50));
  assert(fiftyBatches.length === 1, "50 episodes produces 1 batch");
  assert(fiftyBatches[0].label === "1–50", "50 episodes label is 1–50");
  assert(fiftyBatches[0].count === 50, "50 episodes count is 50");

  const ninetyNineBatches = calculateEpisodeBatches(createMockEpisodes(99));
  assert(ninetyNineBatches.length === 1, "99 episodes produces 1 batch");
  assert(ninetyNineBatches[0].label === "1–99", "99 episodes label is 1–99");
  assert(ninetyNineBatches[0].count === 99, "99 episodes count is 99");

  const hundredBatches = calculateEpisodeBatches(createMockEpisodes(100));
  assert(hundredBatches.length === 1, "100 episodes produces exactly 1 batch (exact boundary)");
  assert(hundredBatches[0].label === "1–100", "100 episodes label is 1–100");
  assert(hundredBatches[0].count === 100, "100 episodes count is 100");

  const hundredOneBatches = calculateEpisodeBatches(createMockEpisodes(101));
  assert(hundredOneBatches.length === 2, "101 episodes produces 2 batches");
  assert(hundredOneBatches[0].label === "1–100", "101 episodes first batch is 1–100");
  assert(hundredOneBatches[0].count === 100, "101 episodes first batch count is 100");
  assert(hundredOneBatches[1].label === "101–101", "101 episodes second batch is 101–101");
  assert(hundredOneBatches[1].count === 1, "101 episodes second batch count is 1");

  const twoHundredBatches = calculateEpisodeBatches(createMockEpisodes(200));
  assert(twoHundredBatches.length === 2, "200 episodes produces 2 batches");
  assert(twoHundredBatches[0].label === "1–100", "200 episodes batch 0 is 1–100");
  assert(twoHundredBatches[1].label === "101–200", "200 episodes batch 1 is 101–200");

  const twoHundredOneBatches = calculateEpisodeBatches(createMockEpisodes(201));
  assert(twoHundredOneBatches.length === 3, "201 episodes produces 3 batches");
  assert(twoHundredOneBatches[2].label === "201–201", "201 episodes batch 2 is 201–201");
}

// 2. Episode Range Selector visibility threshold
console.log("\n2. Episode Range Selector visibility threshold (<= 100 hidden, > 100 shown):");
{
  assert(shouldShowEpisodeRangeSelector(0) === false, "0 episodes: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(1) === false, "1 episode: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(12) === false, "12 episodes: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(50) === false, "50 episodes: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(99) === false, "99 episodes: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(100) === false, "Exactly 100 episodes: range selector is hidden completely (no empty space or borders)");
  assert(shouldShowEpisodeRangeSelector(101) === true, "Exactly 101 episodes: range selector is visible");
  assert(shouldShowEpisodeRangeSelector(101, true) === false, "101 episodes during loading: range selector is hidden");
  assert(shouldShowEpisodeRangeSelector(200) === true, "200 episodes: range selector is visible");
  assert(shouldShowEpisodeRangeSelector(1176) === true, "1,176 episodes: range selector is visible");
}

// 3. 1,176-episode One Piece fixture verification (batch size 100)
console.log("\n3. 1,176-episode fixture (One Piece scale):");
{
  const onePiece = createMockEpisodes(1176);
  const batches = calculateEpisodeBatches(onePiece, DEFAULT_BATCH_SIZE);

  assert(batches.length === 12, "1,176 episodes produces exactly 12 batches (ceil(1176/100) = 12)");
  assert(batches[0].label === "1–100", "Batch 0 is 1–100");
  assert(batches[0].startIndex === 0 && batches[0].endIndex === 100, "Batch 0 indices are [0, 100)");
  assert(batches[0].count === 100, "Batch 0 has 100 episodes");

  assert(batches[1].label === "101–200", "Batch 1 is 101–200");
  assert(batches[10].label === "1001–1100", "Batch 10 is 1001–1100");

  const lastBatch = batches[11];
  assert(lastBatch.label === "1101–1176", "Batch 11 (last batch) is 1101–1176");
  assert(lastBatch.startIndex === 1100 && lastBatch.endIndex === 1176, "Last batch indices are [1100, 1176)");
  assert(lastBatch.count === 76, "Last batch count is 76 episodes (1176 - 1100 = 76)");

  // Sum of all batch counts equals 1,176
  const totalEpisodesInBatches = batches.reduce((sum, b) => sum + b.count, 0);
  assert(totalEpisodesInBatches === 1176, "Sum of all batch episodes strictly equals 1,176");
}

// 4. Non-contiguous and non-1-based episode numbers
console.log("\n4. Non-contiguous and non-standard episode numbering:");
{
  // Anime with missing numbers / specials: e.g. [1, 2, 2.5, 3, 5, 10, 100...]
  const irregularEpisodes: Episode[] = [
    { id: 1, number: 101, title: null, thumbnail: null },
    { id: 2, number: 102, title: null, thumbnail: null },
    { id: 3, number: 105, title: null, thumbnail: null },
    { id: 4, number: 110.5, title: null, thumbnail: null },
    { id: 5, number: 200, title: null, thumbnail: null },
  ];

  const batches = calculateEpisodeBatches(irregularEpisodes, 2);
  assert(batches.length === 3, "5 irregular episodes with batchSize 2 produces 3 batches");
  assert(batches[0].label === "101–102", "Irregular batch 0 label is 101–102");
  assert(batches[1].label === "105–110.5", "Irregular batch 1 label is 105–110.5 (handles decimals)");
  assert(batches[2].label === "200–200", "Irregular batch 2 label is 200–200");

  // Lookup in irregular list
  const idxFor105 = findBatchIndexForEpisode(irregularEpisodes, 105, 2);
  assert(idxFor105 === 1, "Episode 105 is at array index 2 -> batch index 1");

  const idxFor200 = findBatchIndexForEpisode(irregularEpisodes, 200, 2);
  assert(idxFor200 === 2, "Episode 200 is at array index 4 -> batch index 2");
}

// 5. Selected episode batch index resolution & boundary crossings
console.log("\n5. Selected episode batch index resolution:");
{
  const onePiece = createMockEpisodes(1176);

  assert(findBatchIndexForEpisode(onePiece, 1) === 0, "Episode 1 -> Batch 0");
  assert(findBatchIndexForEpisode(onePiece, 50) === 0, "Episode 50 -> Batch 0");
  assert(findBatchIndexForEpisode(onePiece, 100) === 0, "Episode 100 -> Batch 0 (exact boundary)");
  assert(findBatchIndexForEpisode(onePiece, 101) === 1, "Episode 101 -> Batch 1 (boundary 100 -> 101)");
  assert(findBatchIndexForEpisode(onePiece, 200) === 1, "Episode 200 -> Batch 1");
  assert(findBatchIndexForEpisode(onePiece, 201) === 2, "Episode 201 -> Batch 2 (boundary 200 -> 201)");
  assert(findBatchIndexForEpisode(onePiece, 1050) === 10, "Episode 1050 -> Batch 10 (deep link)");
  assert(findBatchIndexForEpisode(onePiece, 1176) === 11, "Episode 1176 -> Batch 11 (last episode)");

  // Fallback for missing episode numbers
  assert(findBatchIndexForEpisode(onePiece, 9999) === 0, "Unmatched episode number falls back safely to 0");
  assert(findBatchIndexForEpisode([], 1) === 0, "Empty list falls back to 0");
}

// 6. Batch episode slice retrieval and clamping
console.log("\n6. Batch episode slice retrieval:");
{
  const episodes = createMockEpisodes(1176);

  const batch0 = getBatchEpisodes(episodes, 0, DEFAULT_BATCH_SIZE);
  assert(batch0.length === 100, "Batch 0 slice has 100 episodes");
  assert(batch0[0].number === 1, "Batch 0 starts at episode 1");
  assert(batch0[99].number === 100, "Batch 0 ends at episode 100");

  const batch1 = getBatchEpisodes(episodes, 1, DEFAULT_BATCH_SIZE);
  assert(batch1.length === 100, "Batch 1 slice has 100 episodes");
  assert(batch1[0].number === 101, "Batch 1 starts at episode 101");
  assert(batch1[99].number === 200, "Batch 1 ends at episode 200");

  const lastBatch = getBatchEpisodes(episodes, 11, DEFAULT_BATCH_SIZE);
  assert(lastBatch.length === 76, "Batch 11 slice has 76 episodes");
  assert(lastBatch[0].number === 1101, "Batch 11 starts at episode 1101");
  assert(lastBatch[75].number === 1176, "Batch 11 ends at episode 1176");

  // Clamping
  const clampedNeg = getBatchEpisodes(episodes, -5, DEFAULT_BATCH_SIZE);
  assert(clampedNeg[0].number === 1, "Negative batch index clamps to batch 0");

  const clampedOver = getBatchEpisodes(episodes, 999, DEFAULT_BATCH_SIZE);
  assert(clampedOver[0].number === 1101, "Excess batch index clamps to last batch (11)");
}

// 7. Hardened Episode Keys & null IDs
console.log("\n7. Unique, null-safe episode key generation:");
{
  const persistedEp: Episode = { id: 450, number: 1, title: null, thumbnail: null };
  assert(getEpisodeKey(persistedEp) === "ep-1-450", "Persisted episode key format");

  const nullIdEpWithProvider: Episode = {
    id: null,
    number: 2,
    title: null,
    thumbnail: null,
    providerId: "koto-99",
  };
  assert(getEpisodeKey(nullIdEpWithProvider) === "ep-2-koto-99", "Null id with providerId key format");

  const completelyAnonEp: Episode = {
    id: null,
    number: 3,
    title: null,
    thumbnail: null,
  };
  assert(getEpisodeKey(completelyAnonEp) === "ep-3-anon", "Null id without providerId key format");

  // Ensure 100% uniqueness across 1,176 episodes with mixed null IDs
  const mixedEpisodes: Episode[] = Array.from({ length: 1176 }, (_, i) => ({
    id: i % 2 === 0 ? i + 1 : null,
    number: i + 1,
    title: `Ep ${i + 1}`,
    thumbnail: null,
    providerId: i % 2 !== 0 ? `anon-${i + 1}` : undefined,
  }));

  const keys = new Set(mixedEpisodes.map(getEpisodeKey));
  assert(keys.size === 1176, "All 1,176 keys are strictly unique with mixed null/persisted IDs");
}

// 8. Navigation & State Transitions Simulation
console.log("\n8. Navigation transitions state machine simulation:");
{
  const episodes = createMockEpisodes(1176);

  class MockSelectorState {
    selectedEpisodeNumber: number;
    browsingBatchIndex: number | null = null;
    currentSeason: string = "1";

    constructor(initialEp: number) {
      this.selectedEpisodeNumber = initialEp;
    }

    get batches() {
      return calculateEpisodeBatches(episodes, DEFAULT_BATCH_SIZE);
    }

    get selectedBatchIndex() {
      return findBatchIndexForEpisode(episodes, this.selectedEpisodeNumber, DEFAULT_BATCH_SIZE);
    }

    get activeBatchIndex() {
      return this.browsingBatchIndex ?? this.selectedBatchIndex;
    }

    get mountedEpisodes() {
      return getBatchEpisodes(episodes, this.activeBatchIndex, DEFAULT_BATCH_SIZE);
    }

    selectEpisode(epNum: number) {
      this.selectedEpisodeNumber = epNum;
      this.browsingBatchIndex = null; // Auto-resets on episode select
    }

    browseBatch(batchIdx: number) {
      this.browsingBatchIndex = batchIdx;
    }
  }

  const state = new MockSelectorState(100);
  assert(state.activeBatchIndex === 0, "Episode 100 is in Batch 0");
  assert(state.mountedEpisodes.length === 100, "Batch 0 mounts exactly 100 cards");
  assert(state.mountedEpisodes[99].number === 100, "Episode 100 is mounted");

  // Step across boundary: 100 -> 101
  state.selectEpisode(101);
  assert(state.activeBatchIndex === 1, "Boundary crossing 100 -> 101 switches active batch to 1");
  assert(state.mountedEpisodes.length === 100, "Batch 1 mounts exactly 100 cards");
  assert(state.mountedEpisodes[0].number === 101, "Episode 101 is the first mounted card in Batch 1");

  // Step across boundary: 200 -> 201
  state.selectEpisode(200);
  assert(state.activeBatchIndex === 1, "Episode 200 is in Batch 1");
  state.selectEpisode(201);
  assert(state.activeBatchIndex === 2, "Boundary crossing 200 -> 201 switches active batch to 2");
  assert(state.mountedEpisodes[0].number === 201, "Episode 201 is the first card in Batch 2");

  // Step backwards across boundary: 201 -> 200
  state.selectEpisode(200);
  assert(state.activeBatchIndex === 1, "Boundary crossing 201 -> 200 switches back to Batch 1");

  // Step backwards across boundary: 101 -> 100
  state.selectEpisode(100);
  assert(state.activeBatchIndex === 0, "Boundary crossing 101 -> 100 switches back to Batch 0");

  // User manually browses another batch
  state.browseBatch(10); // episodes 1001–1100
  assert(state.activeBatchIndex === 10, "User manually browses Batch 10");
  assert(state.mountedEpisodes[0].number === 1001, "Batch 10 starts with episode 1001");
  assert(state.selectedEpisodeNumber === 100, "Episode 100 is still the playing episode");

  // User selects an episode in that batch
  state.selectEpisode(1025);
  assert(state.activeBatchIndex === 10, "Selecting episode 1025 clears browsing override and keeps Batch 10");

  // Next episode playback triggers 1025 -> 1026
  state.selectEpisode(1026);
  assert(state.activeBatchIndex === 10, "Playing next episode 1026 stays within Batch 10");
}

console.log(`\n========================================`);
console.log(`Episode Batching Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
