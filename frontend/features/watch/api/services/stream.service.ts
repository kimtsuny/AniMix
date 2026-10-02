import { httpClient } from "@/shared/api/http-client";

export interface Subtitle {
  url: string;
  label: string;
  language: string;
  format: string;
}

export interface Stream {
  url: string;
  isHLS: boolean;
  quality: string;
  language?: string;
  headers?: Record<string, string>;
  subtitles: Subtitle[];
}

export interface StreamResponse {
  type: "video" | "manga";
  streams: Stream[];
}

export async function getEpisodeStream(
  episodeId: number
): Promise<StreamResponse> {
  return httpClient<StreamResponse>(
    `/episodes/${episodeId}/stream`
  );
}

export async function getAnonymousEpisodeStream(
  provider: string,
  providerId: string
): Promise<StreamResponse> {
  const query = new URLSearchParams({
    provider,
    providerId,
  });

  return httpClient<StreamResponse>(
    `/episodes/anonymous/stream?${query.toString()}`
  );
}