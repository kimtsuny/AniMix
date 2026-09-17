/**
 * Subtitle track returned by a streaming provider.
 */
export interface RawSubtitle {
  url: string;
  label: string;
  language: string;
  format: string;
}

/**
 * Raw stream returned by a streaming provider.
 */
export interface RawStream {
  sourceUrl: string;
  isHLS: boolean;
  quality: string;
  language?: string;
  headers?: Record<string, string>;
  subtitles?: RawSubtitle[];
}

/**
 * Raw result returned by a streaming provider.
 */
export interface RawStreamResult {
  type: "video" | "manga";
  streams?: RawStream[];
}

/**
 * Normalized subtitle used by the application layer.
 */
export interface NormalizedSubtitle {
  url: string;
  label: string;
  language: string;
  format: string;
}

/**
 * Normalized stream used by the application layer.
 */
export interface NormalizedStream {
  url: string;
  isHLS: boolean;
  quality: string;
  language?: string;
  headers?: Record<string, string>;
  subtitles: NormalizedSubtitle[];
}

/**
 * Normalized result returned by the streaming layer.
 */
export interface NormalizedStreamResult {
  type: "video" | "manga";
  streams: NormalizedStream[];
}

/**
 * Converts provider stream data into
 * the application's normalized format.
 */
export function normalizeStreamResult(
  raw: RawStreamResult
): NormalizedStreamResult {
  if (raw.type !== "video") {
    return {
      type: raw.type,
      streams: [],
    };
  }

  return {
    type: "video",

    streams: (raw.streams ?? []).map((stream) => ({
      url: stream.sourceUrl,
      isHLS: stream.isHLS,
      quality: stream.quality,
      language: stream.language,
      headers: stream.headers,

      subtitles: (stream.subtitles ?? []).map(
        (subtitle) => ({
          url: subtitle.url,
          label: subtitle.label,
          language: subtitle.language,
          format: subtitle.format,
        })
      ),
    })),
  };
}