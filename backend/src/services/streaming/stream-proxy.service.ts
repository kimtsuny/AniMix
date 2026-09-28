import crypto from "node:crypto";

export interface ProxySession {
  sessionId: string;
  streamUrl: string;
  referer: string;
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
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
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

// Strict SSRF Allowlist for MegaPlay / AniKoto video delivery CDNs
const ALLOWED_CDN_DOMAINS = [
  "megaplay.buzz",
  "nexabloom.top",
  "lunarfrontier.top",
];

export function isAllowedUpstreamUrl(
  rawUrl: string,
  session?: ProxySession | null
): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();

    // Check if hostname matches or is subdomain of allowed CDNs
    const isDomainAllowed = ALLOWED_CDN_DOMAINS.some(
      (allowed) => hostname === allowed || hostname.endsWith("." + allowed)
    );
    if (isDomainAllowed) return true;

    // Also allow the exact host or domain of the active session's streamUrl
    if (session?.streamUrl) {
      try {
        const sessionHost = new URL(session.streamUrl).hostname.toLowerCase();
        if (hostname === sessionHost || hostname.endsWith("." + sessionHost)) {
          return true;
        }
      } catch {
        // ignore invalid session URL
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function createProxySession(params: {
  streamUrl: string;
  referer?: string;
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
    referer: params.referer || "https://megaplay.buzz/",
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

export function srtToWebVtt(srtText: string): string {
  const normalized = srtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withDots = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${withDots}`;
}

export const StreamProxyService = {
  createProxySession,
  getProxySession,
  isAllowedUpstreamUrl,
  srtToWebVtt,
};
