import type { IVideoPayload } from "anime-sdk";

/**
 * Normalized stream data for the application layer.
 *
 * Provider-specific raw responses are mapped into this shape so the
 * rest of the backend (and eventually the frontend) works with a
 * consistent structure regardless of which provider resolved the stream.
 */
export interface NormalizedStream {
  url: string;
  isHLS: boolean;
  quality: IVideoPayload["quality"];
  headers?: Record<string, string>;
}

export interface NormalizedStreamResult {
  type: "video" | "manga";
  streams: NormalizedStream[];
}

/**
 * Map a raw video stream result from any provider into the normalized
 * application-level format.
 *
 * Currently handles the "video" type from ResolvedMediaStream.
 * Manga support can be added here when needed.
 */
export function normalizeStreamResult(
  raw: { type: string; streams?: IVideoPayload[] }
): NormalizedStreamResult {
  if (raw.type === "video" && raw.streams) {
    return {
      type: "video",
      streams: raw.streams.map((stream) => ({
        url: stream.sourceUrl,
        isHLS: stream.isHLS,
        quality: stream.quality,
        headers: stream.headers,
      })),
    };
  }

  // Fallback for unsupported types — return empty streams
  return {
    type: raw.type as "video" | "manga",
    streams: [],
  };
}
