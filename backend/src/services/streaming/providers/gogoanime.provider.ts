import {
  GogoanimeProvider as SdkGogoanimeProvider,
  HttpClient,
} from "anime-sdk";
import type {
  ResolvedMediaStream,
  IMediaSearchResult,
  IContentUnit,
} from "anime-sdk";
import type { StreamingProvider } from "../provider.interface.js";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new SdkGogoanimeProvider(http);

/**
 * Gogoanime streaming provider.
 *
 * Wraps the anime-sdk GogoanimeProvider and conforms to the
 * application's StreamingProvider interface.
 */
export const gogoanimeProvider: StreamingProvider = {
  name: "gogoanime",

  async search(query: string): Promise<IMediaSearchResult[]> {
    return provider.search(query);
  },

  async getEpisodes(mediaId: string): Promise<IContentUnit[]> {
    return provider.fetchContentUnits(mediaId);
  },

  async getStream(episodeId: string): Promise<ResolvedMediaStream> {
    return provider.resolveStream(episodeId);
  },
};

/**
 * Convenience function preserved from the original JS implementation.
 * Resolves the raw stream data for a given episode ID.
 */
export async function getEpisodeStream(
  episodeId: string
): Promise<ResolvedMediaStream> {
  return provider.resolveStream(episodeId);
}
