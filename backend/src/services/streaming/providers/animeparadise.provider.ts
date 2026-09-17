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

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new SdkAnimeParadiseProvider(http);

export const animeParadiseProvider: StreamingProvider = {
  name: "animeparadise",

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