import crypto from "node:crypto";
import {
  AnikotoProvider as SdkAnikotoProvider,
  MegaPlayProvider as SdkMegaPlayProvider,
  HttpClient,
} from "anime-sdk";
import type {
  ResolvedMediaStream,
  IMediaSearchResult,
  IContentUnit,
  ISubtitleTrack,
} from "anime-sdk";
import type { StreamingProvider } from "../provider.interface.js";
import { StreamProxyService } from "../stream-proxy.service.js";
import { getAnimeById } from "../../anilist/anilist.service.js";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const http = new HttpClient({
  timeoutMs: 25000,
});

const sdkAnikoto = new SdkAnikotoProvider(http);
const sdkMegaPlay = new SdkMegaPlayProvider(http);

// ── In-Memory Stream Cache for Resolved Master URLs (4-Hour TTL) ────
interface CachedStreamSession {
  sessionId: string;
  resolvedAt: number;
}
const STREAM_SESSION_CACHE = new Map<string, CachedStreamSession>();
const CACHE_VALID_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Decrypts AES-256-CBC encrypted sources payload from MegaPlay.
 */
function decryptMegaPlaySource(enc: string): { file?: string; sources?: Array<{ file: string }> } {
  const key = Buffer.alloc(32);
  Buffer.from("i?LMTAx0Q6,:}50U", "utf8").copy(key);
  const iv = Buffer.from("W0;27ToaUpl_P%'c", "utf8");

  // Normalize base64url to base64
  let b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(b64, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted);
}

/**
 * AniKoto Streaming Provider
 *
 * Implements the standard AniMix StreamingProvider interface.
 * Connects to AniKoto and its underlying MegaPlay streaming network.
 */
export const aniKotoProvider: StreamingProvider = {
  name: "anikoto",

  async search(query: string): Promise<IMediaSearchResult[]> {
    try {
      return await sdkAnikoto.search(query);
    } catch (err: any) {
      console.error("[AniKoto Provider] Search error:", err.message);
      return [];
    }
  },

  async getEpisodes(mediaId: string): Promise<IContentUnit[]> {
    const isExplicitAnilist = mediaId.startsWith("anilist:");
    const rawId = mediaId.replace(/^anilist:/, "").replace(/^anikoto:/, "").replace(/^megaplay:/, "");
    const numericId = parseInt(rawId, 10);

    // Case 1: Try fetching real AniKoto series content units first (if not explicitly an AniList ID)
    if (!isExplicitAnilist) {
      try {
        const units = await sdkAnikoto.fetchContentUnits(rawId);
        if (units && units.length > 0) {
          console.log(`[AniKoto Provider] Fetched ${units.length} catalog episode(s) for AniKoto series "${rawId}"`);
          return units.map((u) => ({
            ...u,
            id: `anikoto:${u.id.replace(/^anikoto:/, "")}`,
          }));
        }
      } catch (err: any) {
        console.log(`[AniKoto Provider] Direct series fetch for "${rawId}" returned no units (${err.message}). Checking AniList ID fallback...`);
      }
    }

    // Case 2: Numeric AniList ID (from fallback or direct AniList ID)
    if (!isNaN(numericId)) {
      try {
        let totalEpisodes = 1;
        try {
          const aniListAnime = await getAnimeById(numericId);
          if (aniListAnime.episodes && aniListAnime.episodes > 0) {
            totalEpisodes = aniListAnime.episodes;
          }
        } catch (err: any) {
          console.warn(`[AniKoto Provider] AniList episode lookup failed: ${err.message}`);
        }

        // Fallback to MegaPlay content units if AniList metadata returned 1 or 0
        if (totalEpisodes <= 1) {
          try {
            const units = await sdkMegaPlay.fetchContentUnits(String(numericId));
            if (units.length > 1) {
              totalEpisodes = units.length;
            }
          } catch {
            // keep totalEpisodes as 1
          }
        }

        console.log(`[AniKoto Provider] Discovered ${totalEpisodes} episode(s) for AniList ID ${numericId}`);

        return Array.from({ length: totalEpisodes }, (_, i) => ({
          id: `anikoto:${numericId}:${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          availableLanguages: ["sub", "dub"] as const,
        }));
      } catch (err: any) {
        console.error(`[AniKoto Provider] getEpisodes error for AniList ID ${rawId}:`, err.message);
        return [];
      }
    }

    return [];
  },

  async getStream(episodeId: string): Promise<ResolvedMediaStream> {
    const cleaned = episodeId.replace(/^anikoto:/, "").replace(/^megaplay:/, "");

    // Check in-memory session cache first (avoid repeat upstream resolutions)
    const cacheKey = `anikoto:${cleaned}`;
    const cached = STREAM_SESSION_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.resolvedAt < CACHE_VALID_MS) {
      const activeSession = StreamProxyService.getProxySession(cached.sessionId);
      if (activeSession) {
        console.log(`[AniKoto Provider] Serving cached proxy session for ${cacheKey}`);
        return {
          type: "video",
          streams: [
            {
              sourceUrl: `/api/stream/anikoto/${cached.sessionId}/master.m3u8`,
              isHLS: true,
              quality: "auto",
              language: "sub",
              headers: {
                Referer: "https://megaplay.buzz/",
              },
              subtitles: activeSession.subtitles.map((sub, idx) => ({
                url: `/api/stream/anikoto/${cached.sessionId}/subtitles/${idx}`,
                label: sub.label,
                language: sub.language,
                format: sub.format,
                default: sub.default,
              })),
            },
          ],
        };
      }
    }

    console.log(`[AniKoto Provider] Resolving stream for episode identifier: "${cleaned}"...`);

    const parts = cleaned.split(":");
    let embedUrl = "";
    let refererUrl = "https://megaplay.buzz/";

    if (parts.length >= 2) {
      // Format: anilistId:episodeNumber[:language]
      const anilistId = parseInt(parts[0], 10);
      const episodeNum = parseInt(parts[1], 10);
      const language = parts[2] || "sub";

      if (isNaN(anilistId) || isNaN(episodeNum)) {
        throw new Error(`[AniKoto Provider] Malformed episodeId: "${episodeId}"`);
      }

      embedUrl = `https://megaplay.buzz/stream/ani/${anilistId}/${episodeNum}/${language}`;
    } else {
      // Format: unitId from AniKoto series
      const unitId = parts[0];
      embedUrl = `https://megaplay.buzz/stream/s-2/${unitId}/sub`;
      refererUrl = "https://anikototv.to/";
    }

    // 1. Fetch MegaPlay embed page
    let embedRes = await fetch(embedUrl, {
      headers: {
        "User-Agent": DEFAULT_UA,
        Referer: refererUrl,
      },
    });

    let embedPage = embedRes.ok ? await embedRes.text() : "";

    // If direct MegaPlay AniList endpoint failed or returned Error, attempt catalog search resolution
    if (
      (!embedRes.ok || embedPage.includes("<title>Error - MegaPlay</title>")) &&
      parts.length >= 2
    ) {
      const anilistId = parseInt(parts[0], 10);
      const episodeNum = parseInt(parts[1], 10);

      try {
        console.log(
          `[AniKoto Provider] Direct AniList stream unindexed for #${anilistId}. Attempting AniKoto catalog resolution...`
        );
        const aniListAnime = await getAnimeById(anilistId);
        const titlesToTry = [
          aniListAnime.title.english,
          aniListAnime.title.romaji,
        ].filter(Boolean) as string[];

        let catalogUnitId: string | null = null;
        for (const title of titlesToTry) {
          const searchResults = await sdkAnikoto.search(title);
          if (searchResults.length > 0) {
            const rawSeriesId = searchResults[0].id.replace(/^anikoto:/, "");
            const units = await sdkAnikoto.fetchContentUnits(rawSeriesId);
            const matchingEp = units.find((u) => u.number === episodeNum);
            if (matchingEp) {
              catalogUnitId = matchingEp.id.replace(/^anikoto:/, "");
              break;
            }
          }
        }

        if (catalogUnitId) {
          console.log(
            `[AniKoto Provider] Catalog resolution succeeded! Found unitId "${catalogUnitId}" for #${anilistId} ep ${episodeNum}`
          );
          embedUrl = `https://megaplay.buzz/stream/s-2/${catalogUnitId}/sub`;
          refererUrl = "https://anikototv.to/";

          embedRes = await fetch(embedUrl, {
            headers: {
              "User-Agent": DEFAULT_UA,
              Referer: refererUrl,
            },
          });
          if (embedRes.ok) {
            embedPage = await embedRes.text();
          }
        }
      } catch (catErr: any) {
        console.warn(
          `[AniKoto Provider] Catalog resolution failed for #${anilistId}: ${catErr.message}`
        );
      }
    }

    if (!embedRes.ok) {
      throw new Error(`[AniKoto Provider] Embed fetch failed: HTTP ${embedRes.status}`);
    }

    if (embedPage.includes("<title>Error - MegaPlay</title>")) {
      throw new Error(`[AniKoto Provider] MegaPlay has no mapping for "${cleaned}"`);
    }

    const fileIdMatch = embedPage.match(/File\s+(\d+)\s+-/);
    if (!fileIdMatch) {
      throw new Error(`[AniKoto Provider] Could not find file ID on MegaPlay embed page for "${cleaned}"`);
    }
    const fileId = fileIdMatch[1];

    // 2. Fetch getSources from MegaPlay
    const sourcesRes = await fetch(`https://megaplay.buzz/stream/getSources?id=${fileId}`, {
      headers: {
        "User-Agent": DEFAULT_UA,
        Referer: embedUrl,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!sourcesRes.ok) {
      throw new Error(`[AniKoto Provider] getSources failed: HTTP ${sourcesRes.status}`);
    }

    const sourcesJson = await sourcesRes.json();

    // 3. Extract stream master playlist URL (handling plaintext or encrypted payload)
    let streamUrl = "";

    if (sourcesJson.sources?.file) {
      streamUrl = sourcesJson.sources.file;
    } else if (sourcesJson.enc) {
      try {
        const decrypted = decryptMegaPlaySource(sourcesJson.enc);
        streamUrl = decrypted.file || decrypted.sources?.[0]?.file || "";
      } catch (decErr: any) {
        console.warn(`[AniKoto Provider] Decryption failed: ${decErr.message}`);
      }
    } else if (Array.isArray(sourcesJson.sources) && sourcesJson.sources[0]?.file) {
      streamUrl = sourcesJson.sources[0].file;
    }

    if (!streamUrl) {
      throw new Error(`[AniKoto Provider] No video sources found in MegaPlay response for "${cleaned}"`);
    }

    // 4. Subtitles
    const rawTracks: any[] = sourcesJson.tracks || [];
    const subtitles = rawTracks
      .filter((t: any) => t.kind === "captions" && t.file)
      .map((t: any) => {
        const ext = (t.file || "").split(".").pop()?.toLowerCase();
        const format: "vtt" | "srt" | "ass" = ext === "ass" ? "ass" : ext === "srt" ? "srt" : "vtt";
        return {
          url: t.file as string,
          label: (t.label || "English") as string,
          language: (t.label || "English").toLowerCase(),
          format,
          default: !!t.default,
        };
      });

    // 5. Create Proxy Session for Referer-protected playback
    const session = StreamProxyService.createProxySession({
      streamUrl,
      referer: "https://megaplay.buzz/",
      subtitles,
    });

    // Cache the session ID for this episode
    STREAM_SESSION_CACHE.set(cacheKey, {
      sessionId: session.sessionId,
      resolvedAt: Date.now(),
    });

    console.log(`[AniKoto Provider] Stream successfully resolved! Session: ${session.sessionId}`);

    const formattedSubtitles: ISubtitleTrack[] = session.subtitles.map((sub, idx) => ({
      url: `/api/stream/anikoto/${session.sessionId}/subtitles/${idx}`,
      label: sub.label,
      language: sub.language,
      format: sub.format,
      default: sub.default,
    }));

    return {
      type: "video",
      streams: [
        {
          sourceUrl: `/api/stream/anikoto/${session.sessionId}/master.m3u8`,
          isHLS: true,
          quality: "auto",
          language: "sub",
          headers: {
            Referer: "https://megaplay.buzz/",
          },
          subtitles: formattedSubtitles,
        },
      ],
    };
  },
};
