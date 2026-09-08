import type { ResolvedMediaStream, IMediaSearchResult, IContentUnit } from "anime-sdk";

/**
 * Contract for streaming providers.
 *
 * Each provider wraps a specific anime source (e.g. Gogoanime) and exposes
 * a uniform interface. The backend can try providers in priority order
 * when building the future multi-provider fallback system.
 *
 * Methods are kept minimal — only add what is currently used or will be
 * needed imminently. The anime-sdk already defines the heavy types
 * (ResolvedMediaStream, IMediaSearchResult, IContentUnit), so we
 * re-use those directly.
 */
export interface StreamingProvider {
  /** Unique identifier for this provider (e.g. "gogoanime"). */
  readonly name: string;

  /** Search for anime titles on this provider. */
  search(query: string): Promise<IMediaSearchResult[]>;

  /** Fetch the list of episodes for a given media ID. */
  getEpisodes(mediaId: string): Promise<IContentUnit[]>;

  /** Resolve a playable stream for a given episode/unit ID. */
  getStream(episodeId: string): Promise<ResolvedMediaStream>;
}
