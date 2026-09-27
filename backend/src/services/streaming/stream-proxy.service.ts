import crypto from "node:crypto";

export interface ProxySession {
  sessionId: string;
  streamUrl: string;
  pkKey: Buffer;
  subtitles: Array<{
    url: string;
    language: string;
    label: string;
    format: "vtt" | "srt" | "ass";
    default?: boolean;
  }>;
  createdAt: number;
  expiresAt: number;
}

// Bounded in-memory session cache (Max 1,000 sessions, 4-hour TTL)
const SESSIONS = new Map<string, ProxySession>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (conservative, upstream JWT is 6h)
const MAX_SESSIONS = 1000;

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of SESSIONS.entries()) {
    if (session.expiresAt <= now) {
      SESSIONS.delete(id);
    }
  }
}, 10 * 60 * 1000).unref();

// Strict SSRF Allowlist - only FlixCloud and RundownCDN hosts
const ALLOWED_CDN_DOMAINS = [
  "flixcloud.cc",
  "rundowncdn.top",
  "toprundowncdn.top",
];

export function isAllowedUpstreamUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_CDN_DOMAINS.some(
      (allowed) => hostname === allowed || hostname.endsWith("." + allowed)
    );
  } catch {
    return false;
  }
}

export function createProxySession(params: {
  streamUrl: string;
  pkKey: Buffer;
  subtitles?: Array<{
    url: string;
    language: string;
    label: string;
    format: "vtt" | "srt" | "ass";
    default?: boolean;
  }>;
}): ProxySession {
  // Evict oldest session if limit reached
  if (SESSIONS.size >= MAX_SESSIONS) {
    const oldestKey = SESSIONS.keys().next().value;
    if (oldestKey) SESSIONS.delete(oldestKey);
  }

  const sessionId = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const session: ProxySession = {
    sessionId,
    streamUrl: params.streamUrl,
    pkKey: params.pkKey,
    subtitles: params.subtitles || [],
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
  };

  SESSIONS.set(sessionId, session);
  return session;
}

export function getProxySession(sessionId: string): ProxySession | null {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    SESSIONS.delete(sessionId);
    return null;
  }
  return session;
}

export function unmaskM3u8(rawPayload: string, pkKey: Buffer): string {
  if (rawPayload.startsWith("#EXTM3U")) {
    return rawPayload;
  }
  const cipher = Buffer.from(rawPayload.trim(), "base64");
  const plain = Buffer.alloc(cipher.length);
  for (let i = 0; i < cipher.length; i++) {
    plain[i] = cipher[i] ^ pkKey[i % pkKey.length];
  }
  return plain.toString("utf8");
}

export function srtToWebVtt(srtText: string): string {
  const normalized = srtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withDots = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${withDots}`;
}

export const StreamProxyService = {
  createProxySession,
  getProxySession,
  isAllowedUpstreamUrl,
  unmaskM3u8,
  srtToWebVtt,
};
