import {
  AnimeParadiseProvider as SdkAnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

import type {
  ResolvedMediaStream,
  IMediaSearchResult,
  IContentUnit,
} from "anime-sdk";

import type { StreamingProvider } from "../provider.interface.js";

// ── AnimeParadise raw API response shape ────────────────────────────
/** Shape of a single episode object returned by the AnimeParadise API. */
interface AnimeParadiseRawEpisode {
  _id: string;
  uid: string;
  title?: string;
  number: string;
  image?: string;
  origin?: string;
}

// ── Extended episode result with thumbnail ──────────────────────────
/** IContentUnit extended with an optional `thumbnail` sourced from AnimeParadise's `image` field. */
export interface AnimeParadiseEpisode extends IContentUnit {
  thumbnail?: string;
}

// ── Shared HTTP client & SDK provider ───────────────────────────────
const API_BASE = "https://api.animeparadise.moe";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new SdkAnimeParadiseProvider(http);

// ── Provider export ─────────────────────────────────────────────────
export const animeParadiseProvider: StreamingProvider = {
  name: "animeparadise",

  async search(query: string): Promise<IMediaSearchResult[]> {
    return provider.search(query);
  },

  /**
   * Fetch episodes directly from the AnimeParadise API so we can
   * capture the `image` field that the SDK strips when mapping to
   * `IContentUnit`.
   *
   * The returned objects extend `IContentUnit` with an optional
   * `thumbnail` property, keeping the same provider-ID format
   * (`uid:animeId`) that `resolveStream` depends on.
   */
  async getEpisodes(mediaId: string): Promise<AnimeParadiseEpisode[]> {
    // The database stores provider IDs as "animeparadise:<rawId>",
    // but the API expects just the raw ID.
    const rawId = mediaId.startsWith("animeparadise:")
      ? mediaId.slice("animeparadise:".length)
      : mediaId;

    const res = await http.get(
      `${API_BASE}/anime/${rawId}/episode`
    );

    const json: { data?: AnimeParadiseRawEpisode[] } =
      await res.json();

    const episodes: AnimeParadiseRawEpisode[] = json?.data ?? [];

    return episodes.map((ep) => ({
      id: `${ep.uid}:${rawId}`,
      title: ep.title ?? `Episode ${ep.number}`,
      number: parseFloat(ep.number),
      availableLanguages: ["sub"] as const,
      thumbnail: ep.image ?? undefined,
    }));
  },

  async getStream(episodeId: string): Promise<ResolvedMediaStream> {
    return provider.resolveStream(episodeId);
  },
};