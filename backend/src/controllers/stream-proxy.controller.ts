import type { Request, Response } from "express";
import {
  StreamProxyService,
} from "../services/streaming/stream-proxy.service.js";

export async function getMasterPlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId);
    const session = StreamProxyService.getProxySession(sessionId);

    if (!session) {
      res.status(404).send("Stream session not found or expired");
      return;
    }

    const upstreamRes = await fetch(session.streamUrl, {
      headers: {
        "Referer": "https://flixcloud.cc/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).send(`Upstream CDN returned HTTP ${upstreamRes.status}`);
      return;
    }

    const rawBody = await upstreamRes.text();
    const unmasked = StreamProxyService.unmaskM3u8(rawBody, session.pkKey);

    // Rewrite variant and audio streams to relative proxy routes
    const lines = unmasked.split("\n");
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      // Audio stream URI
      if (trimmed.startsWith("#EXT-X-MEDIA:TYPE=AUDIO") && trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/, (_, relUri) => {
          const absUrl = new URL(relUri, session.streamUrl).toString();
          return `URI="variant?url=${encodeURIComponent(absUrl)}"`;
        });
      }
      // Variant stream URI
      if (!trimmed.startsWith("#") && trimmed.endsWith(".m3u8")) {
        const absUrl = new URL(trimmed, session.streamUrl).toString();
        return `variant?url=${encodeURIComponent(absUrl)}`;
      }
      return line;
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(rewritten.join("\n"));
  } catch (err: any) {
    res.status(500).send(`Proxy master playlist error: ${err.message}`);
  }
}

export async function getVariantPlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId);
    const session = StreamProxyService.getProxySession(sessionId);
    const targetUrl = req.query.url as string;

    if (!session || !targetUrl) {
      res.status(400).send("Invalid session or missing url parameter");
      return;
    }

    if (!StreamProxyService.isAllowedUpstreamUrl(targetUrl)) {
      res.status(403).send("Forbidden: Upstream host is not permitted");
      return;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "Referer": "https://flixcloud.cc/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).send(`Upstream variant error HTTP ${upstreamRes.status}`);
      return;
    }

    const rawBody = await upstreamRes.text();
    const unmasked = StreamProxyService.unmaskM3u8(rawBody, session.pkKey);

    const lines = unmasked.split("\n");
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      // Rewrite AES-128 key URI
      if (trimmed.startsWith("#EXT-X-KEY:") && trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/, (_, keyRel) => {
          const absKey = new URL(keyRel, targetUrl).toString();
          return `URI="key?url=${encodeURIComponent(absKey)}"`;
        });
      }
      // Rewrite media segment line
      if (!trimmed.startsWith("#") && trimmed.length > 0) {
        const absSeg = new URL(trimmed, targetUrl).toString();
        return `segment?url=${encodeURIComponent(absSeg)}`;
      }
      return line;
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(rewritten.join("\n"));
  } catch (err: any) {
    res.status(500).send(`Proxy variant playlist error: ${err.message}`);
  }
}

export async function getKey(req: Request, res: Response): Promise<void> {
  try {
    const targetUrl = req.query.url as string;

    if (!targetUrl || !StreamProxyService.isAllowedUpstreamUrl(targetUrl)) {
      res.status(403).send("Forbidden: Invalid key URL");
      return;
    }

    const kRes = await fetch(targetUrl, {
      headers: {
        "Referer": "https://flixcloud.cc/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!kRes.ok) {
      res.status(kRes.status).send(`Upstream key error HTTP ${kRes.status}`);
      return;
    }

    const keyBuf = Buffer.from(await kRes.arrayBuffer());
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Length", keyBuf.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(keyBuf);
  } catch (err: any) {
    res.status(500).send(`Proxy key error: ${err.message}`);
  }
}

export async function getSegment(req: Request, res: Response): Promise<void> {
  try {
    const targetUrl = req.query.url as string;

    if (!targetUrl || !StreamProxyService.isAllowedUpstreamUrl(targetUrl)) {
      res.status(403).send("Forbidden: Invalid segment URL");
      return;
    }

    const upstreamHeaders: Record<string, string> = {
      "Referer": "https://flixcloud.cc/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    if (req.headers.range) {
      upstreamHeaders["Range"] = req.headers.range;
    }

    const segRes = await fetch(targetUrl, {
      headers: upstreamHeaders,
    });

    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (segRes.headers.get("content-range")) {
      res.setHeader("Content-Range", segRes.headers.get("content-range")!);
    }
    if (segRes.headers.get("content-length")) {
      res.setHeader("Content-Length", segRes.headers.get("content-length")!);
    }

    res.status(segRes.status);
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const segBuf = Buffer.from(await segRes.arrayBuffer());
    res.send(segBuf);
  } catch (err: any) {
    res.status(500).send(`Proxy segment error: ${err.message}`);
  }
}

export async function getSubtitle(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId);
    const trackIndex = String(req.params.trackId);
    const session = StreamProxyService.getProxySession(sessionId);
    let targetUrl = req.query.url as string;

    if (!targetUrl && session && req.params.trackId !== undefined) {
      const idx = parseInt(trackIndex, 10);
      if (session.subtitles[idx]) {
        targetUrl = session.subtitles[idx].url;
      }
    }

    if (!targetUrl || !StreamProxyService.isAllowedUpstreamUrl(targetUrl)) {
      res.status(403).send("Forbidden: Invalid subtitle URL");
      return;
    }

    const subRes = await fetch(targetUrl);
    if (!subRes.ok) {
      res.status(subRes.status).send(`Upstream subtitle error HTTP ${subRes.status}`);
      return;
    }

    const rawText = await subRes.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");

    // Convert SRT to WebVTT for native video player track support
    if (targetUrl.endsWith(".srt") || rawText.includes("-->")) {
      const vtt = StreamProxyService.srtToWebVtt(rawText);
      res.setHeader("Content-Type", "text/vtt; charset=utf-8");
      res.status(200).send(vtt);
    } else {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.status(200).send(rawText);
    }
  } catch (err: any) {
    res.status(500).send(`Proxy subtitle error: ${err.message}`);
  }
}
