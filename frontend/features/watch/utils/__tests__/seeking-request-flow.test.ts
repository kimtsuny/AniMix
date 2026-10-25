import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getSeasonEpisodes,
  getAnimeSeasons,
  getCachedSeasonEpisodes,
  getCachedAnimeSeasons,
  clearSeasonEpisodesCache,
  clearAnimeSeasonsCache,
  buildSeasonEpisodesKey,
  type GetSeasonEpisodesResponse,
  type GetAnimeSeasonsResponse,
} from "../../api/services/episode.service";
import { HttpError, isUnauthorizedError } from "@/shared/api/http-client";

// Mock fetch helper for testing
let originalFetch: typeof globalThis.fetch;
let fetchCallCount = 0;
let fetchUrls: string[] = [];
let mockFetchHandler: (url: string, init?: RequestInit) => Promise<Response>;

function setupMockFetch() {
  originalFetch = globalThis.fetch;
  fetchCallCount = 0;
  fetchUrls = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount++;
    const url = typeof input === "string" ? input : input.toString();
    fetchUrls.push(url);
    if (mockFetchHandler) {
      return mockFetchHandler(url, init);
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };
}

function restoreMockFetch() {
  globalThis.fetch = originalFetch;
}

const mockEpisodesResponse: GetSeasonEpisodesResponse = {
  anime: {
    id: 1,
    anilistId: 20439,
    title: "Chainsaw Man",
    description: "Chainsaw Devil anime",
    coverImage: "https://example.com/cover.jpg",
    bannerImage: "https://example.com/banner.jpg",
  },
  seasons: [
    { id: 1, number: 1, title: "Season 1", episodeCount: 12 },
    { id: 2, number: 2, title: "Season 2", episodeCount: 12 },
  ],
  season: {
    id: 2,
    number: 2,
    title: "Season 2",
    episodes: [
      { id: 101, number: 1, title: "Episode 1", thumbnail: "ep1.jpg" },
      { id: 102, number: 2, title: "Episode 2", thumbnail: "ep2.jpg" },
    ],
  },
};

const mockSeasonsResponse: GetAnimeSeasonsResponse = {
  rootAnimeId: 195539,
  requestedSeasonNumber: 1,
  anime: {
    id: 1,
    anilistId: 195539,
    title: "Test Anime",
    description: "Description",
    coverImage: null,
    bannerImage: null,
  },
  seasons: [
    { id: 1, number: 1, title: "Season 1", episodeCount: 12 },
  ],
};

describe("AniMix — Seeking Interaction and Request Flow Verification", () => {
  beforeEach(() => {
    clearSeasonEpisodesCache();
    clearAnimeSeasonsCache();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Slider Interaction & Committed Seek State Machine
  // ─────────────────────────────────────────────────────────────
  describe("1. Slider Interaction: Drag Preview vs Committed Seek", () => {
    class SeekSliderSimulation {
      currentTime = 0;
      duration = 1440; // 24 minutes
      isDragging = false;
      dragTime: number | null = null;
      seekCommittedEvents: number[] = [];
      continuousPreviewEvents: number[] = [];

      onSeek(time: number) {
        this.currentTime = time;
        this.seekCommittedEvents.push(time);
      }

      onSeekChange(time: number) {
        this.continuousPreviewEvents.push(time);
      }

      startDrag(clientX: number, trackWidth: number) {
        this.isDragging = true;
        const time = (clientX / trackWidth) * this.duration;
        this.dragTime = time;
        this.onSeekChange(time);
      }

      dragMove(clientX: number, trackWidth: number) {
        if (!this.isDragging) return;
        const time = Math.max(0, Math.min(this.duration, (clientX / trackWidth) * this.duration));
        this.dragTime = time;
        this.onSeekChange(time);
      }

      endDrag() {
        if (!this.isDragging) return;
        const finalTime = this.dragTime ?? this.currentTime;
        this.isDragging = false;
        this.dragTime = null;
        this.onSeek(finalTime);
      }

      keySeek(key: string) {
        let nextTime: number | null = null;
        if (key === "ArrowLeft" || key === "ArrowDown") nextTime = Math.max(0, this.currentTime - 5);
        if (key === "ArrowRight" || key === "ArrowUp") nextTime = Math.min(this.duration, this.currentTime + 5);
        if (key === "PageDown") nextTime = Math.max(0, this.currentTime - 10);
        if (key === "PageUp") nextTime = Math.min(this.duration, this.currentTime + 10);
        if (key === "Home") nextTime = 0;
        if (key === "End") nextTime = this.duration;
        if (nextTime !== null) {
          this.onSeek(nextTime);
        }
      }
    }

    it("does not commit video seek on intermediate drag moves, only on release", () => {
      const slider = new SeekSliderSimulation();

      // User starts dragging at 10%
      slider.startDrag(100, 1000);
      assert.strictEqual(slider.seekCommittedEvents.length, 0, "No seek committed on mouse down");
      assert.strictEqual(slider.continuousPreviewEvents.length, 1);

      // User drags rapidly across 50 intermediate positions
      for (let x = 110; x <= 500; x += 10) {
        slider.dragMove(x, 1000);
      }

      assert.strictEqual(slider.seekCommittedEvents.length, 0, "Zero seeks committed during continuous drag move");
      assert.strictEqual(slider.continuousPreviewEvents.length, 41, "Visual preview updated smoothly");

      // User releases mouse at 50%
      slider.endDrag();
      assert.strictEqual(slider.seekCommittedEvents.length, 1, "Exactly one seek committed on release");
      assert.strictEqual(slider.seekCommittedEvents[0], 720, "Committed to exactly 50% of 1440s");
      assert.strictEqual(slider.currentTime, 720);
    });

    it("supports keyboard seeking for accessibility", () => {
      const slider = new SeekSliderSimulation();
      slider.currentTime = 100;

      slider.keySeek("ArrowRight");
      assert.strictEqual(slider.currentTime, 105);

      slider.keySeek("ArrowLeft");
      assert.strictEqual(slider.currentTime, 100);

      slider.keySeek("PageUp");
      assert.strictEqual(slider.currentTime, 110);

      slider.keySeek("PageDown");
      assert.strictEqual(slider.currentTime, 100);

      slider.keySeek("End");
      assert.strictEqual(slider.currentTime, 1440);

      slider.keySeek("Home");
      assert.strictEqual(slider.currentTime, 0);

      assert.strictEqual(slider.seekCommittedEvents.length, 6);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Metadata Request Deduplication & In-Memory Caching
  // ─────────────────────────────────────────────────────────────
  describe("2. Metadata Caching and Deduplication", () => {
    beforeEach(() => {
      setupMockFetch();
    });

    afterEach(() => {
      restoreMockFetch();
    });

    it("coalesces concurrent requests for the same anime and season into one network call", async () => {
      let resolvePromise: (val: Response) => void;
      const pendingResponse = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchHandler = async () => pendingResponse;

      // Dispatch 3 concurrent requests
      const p1 = getSeasonEpisodes(20439, 2);
      const p2 = getSeasonEpisodes(20439, 2);
      const p3 = getSeasonEpisodes(20439, 2);

      assert.strictEqual(fetchCallCount, 1, "Exactly 1 network call dispatched for 3 concurrent requests");

      resolvePromise!(
        new Response(JSON.stringify(mockEpisodesResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      assert.strictEqual(r1.season.number, 2);
      assert.strictEqual(r2.season.number, 2);
      assert.strictEqual(r3.season.number, 2);
      assert.strictEqual(fetchCallCount, 1);
    });

    it("serves subsequent requests immediately from cache with 0 network calls", async () => {
      mockFetchHandler = async () =>
        new Response(JSON.stringify(mockEpisodesResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      // Initial call
      const res1 = await getSeasonEpisodes(20439, 2);
      assert.strictEqual(fetchCallCount, 1);
      assert.strictEqual(res1.season.episodes.length, 2);

      // Verify cached
      const cached = getCachedSeasonEpisodes(20439, 2);
      assert.notStrictEqual(cached, null);
      assert.strictEqual(cached?.season.number, 2);

      // Subsequent call
      const res2 = await getSeasonEpisodes(20439, 2);
      assert.strictEqual(fetchCallCount, 1, "Zero additional network calls when serving from cache");
      assert.deepStrictEqual(res1, res2);
    });

    it("strictly isolates cache entries between different anime IDs and seasons", async () => {
      mockFetchHandler = async (url) => {
        if (url.includes("/20439/seasons/2/episodes")) {
          return new Response(JSON.stringify(mockEpisodesResponse), { status: 200 });
        }
        if (url.includes("/195539/seasons/1/episodes")) {
          return new Response(
            JSON.stringify({
              ...mockEpisodesResponse,
              anime: { ...mockEpisodesResponse.anime, anilistId: 195539 },
              season: { ...mockEpisodesResponse.season, number: 1 },
            }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 404 });
      };

      const res20439_s2 = await getSeasonEpisodes(20439, 2);
      const res195539_s1 = await getSeasonEpisodes(195539, 1);

      assert.strictEqual(fetchCallCount, 2, "Separate network calls for different anime/seasons");
      assert.strictEqual(res20439_s2.anime.anilistId, 20439);
      assert.strictEqual(res20439_s2.season.number, 2);
      assert.strictEqual(res195539_s1.anime.anilistId, 195539);
      assert.strictEqual(res195539_s1.season.number, 1);

      // Keys are distinct
      const k1 = buildSeasonEpisodesKey(20439, 2);
      const k2 = buildSeasonEpisodesKey(195539, 1);
      assert.notStrictEqual(k1, k2);
    });

    it("bypasses cache when force option is set during refetch", async () => {
      mockFetchHandler = async () =>
        new Response(JSON.stringify(mockEpisodesResponse), { status: 200 });

      await getSeasonEpisodes(20439, 2);
      assert.strictEqual(fetchCallCount, 1);

      // Forced refetch
      await getSeasonEpisodes(20439, 2, undefined, { force: true });
      assert.strictEqual(fetchCallCount, 2, "Refetch bypassed cache as expected");
    });

    it("coalesces and caches getAnimeSeasons requests", async () => {
      mockFetchHandler = async () =>
        new Response(JSON.stringify(mockSeasonsResponse), { status: 200 });

      const [s1, s2] = await Promise.all([
        getAnimeSeasons(195539),
        getAnimeSeasons(195539),
      ]);

      assert.strictEqual(fetchCallCount, 1, "Concurrent getAnimeSeasons deduplicated to 1 call");
      assert.strictEqual(s1.rootAnimeId, 195539);
      assert.strictEqual(s2.rootAnimeId, 195539);

      // Subsequent call from cache
      const s3 = await getAnimeSeasons(195539);
      assert.strictEqual(fetchCallCount, 1, "Cached getAnimeSeasons served with 0 network calls");
      assert.strictEqual(s3.rootAnimeId, 195539);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Error Handling for 429 and 503
  // ─────────────────────────────────────────────────────────────
  describe("3. HTTP 429 & 503 Error Handling", () => {
    beforeEach(() => {
      setupMockFetch();
    });

    afterEach(() => {
      restoreMockFetch();
    });

    it("captures Retry-After header for 429 Too Many Requests", async () => {
      mockFetchHandler = async () =>
        new Response(
          JSON.stringify({ message: "Rate limit exceeded" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          }
        );

      await assert.rejects(
        async () => {
          await getSeasonEpisodes(195539, 1);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.status, 429);
          assert.strictEqual(err.retryAfter, 60);
          assert.strictEqual(isUnauthorizedError(err), false);
          return true;
        }
      );
    });

    it("handles 503 Service Unavailable without misclassifying as 401 unauthorized", async () => {
      mockFetchHandler = async () =>
        new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        });

      await assert.rejects(
        async () => {
          await getSeasonEpisodes(20439, 2);
        },
        (err: unknown) => {
          assert(err instanceof HttpError);
          assert.strictEqual(err.status, 503);
          assert.strictEqual(
            isUnauthorizedError(err),
            false,
            "503 must not be classified as 401 unauthorized"
          );
          return true;
        }
      );
    });
  });
});
