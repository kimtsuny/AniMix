import crypto from "node:crypto";

export interface ProxySession {
  sessionId: string;
  streamUrl: string;
  referer: string;
  allowedHosts: Set<string>;
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

// Base trusted domains for MegaPlay / AniKoto infrastructure
const ALLOWED_CDN_DOMAINS = [
  "megaplay.buzz",
  "nexabloom.top",
  "lunarfrontier.top",
];

export function addAllowedHost(
  session: ProxySession,
  urlOrHost: string
): void {
  try {
    let hostname = urlOrHost.trim().toLowerCase();
    if (urlOrHost.includes("://")) {
      const parsed = new URL(urlOrHost);
      if (parsed.protocol !== "https:") return;
      hostname = parsed.hostname.toLowerCase();
    }
    if (hostname) {
      session.allowedHosts.add(hostname);
    }
  } catch {
    // Ignore invalid URL formats
  }
}

export function isAllowedUpstreamUrl(
  rawUrl: string,
  session?: ProxySession | null
): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();

    // 1. Session-scoped validation:
    // If an active session is provided, only allow hosts that were registered
    // by the session's stream manifest chain or base origin.
    if (session) {
      if (session.allowedHosts.has(hostname)) {
        return true;
      }

      // Also allow exact subdomains of any host registered in session.allowedHosts
      for (const allowed of session.allowedHosts) {
        if (hostname === allowed || hostname.endsWith("." + allowed)) {
          return true;
        }
      }
    }

    // 2. Fallback check against known base infrastructure domains
    return ALLOWED_CDN_DOMAINS.some(
      (allowed) => hostname === allowed || hostname.endsWith("." + allowed)
    );
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

  const allowedHosts = new Set<string>();
  try {
    const streamHost = new URL(params.streamUrl).hostname.toLowerCase();
    allowedHosts.add(streamHost);
  } catch {
    // Ignore invalid stream URL
  }
  for (const d of ALLOWED_CDN_DOMAINS) {
    allowedHosts.add(d);
  }

  const session: ProxySession = {
    sessionId,
    streamUrl: params.streamUrl,
    referer: params.referer || "https://megaplay.buzz/",
    allowedHosts,
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
  addAllowedHost,
  isAllowedUpstreamUrl,
  srtToWebVtt,
};
