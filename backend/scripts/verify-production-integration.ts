import express from "express";
import crypto from "node:crypto";
import type { Server } from "node:http";
import streamRoutes from "../src/routes/stream.routes.js";
import { reanimeProvider } from "../src/services/streaming/providers/reanime.provider.js";
import { animeParadiseProvider } from "../src/services/streaming/providers/animeparadise.provider.js";

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

interface TestReportItem {
  id: string;
  title: string;
  anilistId: number;
  expected: string;
  result: "PASS" | "FAIL" | "EXPECTED_ABSENCE";
  details: string;
}

const testCases = [
  { id: "gto", title: "Great Teacher Onizuka (GTO)", anilistId: 245 },
  { id: "sonny-boy", title: "Sonny Boy", anilistId: 132126 },
  { id: "your-name", title: "Your Name.", anilistId: 21519 },
  { id: "silent-voice", title: "A Silent Voice", anilistId: 20954 },
  { id: "suzume", title: "Suzume", anilistId: 142470 },
  { id: "death-note", title: "Death Note", anilistId: 1535 },
  { id: "one-piece", title: "One Piece", anilistId: 21 },
  { id: "rakugo", title: "Shouwa Genroku Rakugo Shinjuu", anilistId: 20973 },
];

async function main() {
  console.log("==================================================");
  console.log("REANIME PRODUCTION INTEGRATION VERIFICATION TEST");
  console.log("==================================================\n");

  // 1. Start ephemeral Express app mounting production streamRoutes
  const app = express();
  app.use("/api/stream", streamRoutes);
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, "127.0.0.1", () => resolve(s));
  });

  const results: TestReportItem[] = [];

  try {
    // PHASE A: ReAnime Provider Stream Resolution on 8 Target Titles
    console.log("--- PHASE A: ReAnime Provider Stream Resolution ---");
    let gtoSessionId = "";

    for (const tc of testCases) {
      process.stdout.write(`Testing ${tc.title} (AniList: ${tc.anilistId})... `);
      try {
        const streamRes = await reanimeProvider.getStream(`reanime:${tc.anilistId}:1`);
        if (streamRes.type === "video" && streamRes.streams.length > 0) {
          const stream = streamRes.streams[0];
          const match = stream.sourceUrl.match(/\/api\/stream\/reanime\/([a-f0-9]+)\/master\.m3u8/);
          const sessId = match ? match[1] : "";
          if (tc.id === "gto") gtoSessionId = sessId;

          console.log(`✅ SUCCESS (Session: ${sessId.substring(0, 8)}..., Subs: ${stream.subtitles?.length || 0})`);
          results.push({
            id: tc.id,
            title: tc.title,
            anilistId: tc.anilistId,
            expected: "ReAnime Stream Resolved",
            result: "PASS",
            details: `Master URL: ${stream.sourceUrl}, Subs: ${stream.subtitles?.length || 0}`,
          });
        } else {
          console.log(`❌ FAILED (No video stream)`);
          results.push({
            id: tc.id,
            title: tc.title,
            anilistId: tc.anilistId,
            expected: "ReAnime Stream Resolved",
            result: "FAIL",
            details: "Resolved object had no valid video streams",
          });
        }
      } catch (err: any) {
        if (tc.id === "rakugo") {
          console.log(`ℹ️ EXPECTED ABSENCE (Provider has no hosted servers: ${err.message})`);
          results.push({
            id: tc.id,
            title: tc.title,
            anilistId: tc.anilistId,
            expected: "Graceful failure (no servers)",
            result: "EXPECTED_ABSENCE",
            details: `Cleanly rejected with: ${err.message}`,
          });
        } else {
          console.log(`❌ ERROR: ${err.message}`);
          results.push({
            id: tc.id,
            title: tc.title,
            anilistId: tc.anilistId,
            expected: "ReAnime Stream Resolved",
            result: "FAIL",
            details: err.message,
          });
        }
      }
    }

    // PHASE B: Backend Proxy Endpoints Verification (Using GTO Session)
    console.log("\n--- PHASE B: Backend Proxy Endpoints (GTO Session) ---");
    if (!gtoSessionId) {
      console.error("❌ Cannot test proxy endpoints: GTO session was not created.");
      process.exit(1);
    }

    console.log(`Using Session: ${gtoSessionId}`);

    // 1. Master Playlist
    process.stdout.write("1. Testing Master Playlist (/api/stream/reanime/:id/master.m3u8)... ");
    const masterRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/master.m3u8`);
    if (!masterRes.ok) {
      console.log(`❌ FAILED HTTP ${masterRes.status}`);
    } else {
      const masterText = await masterRes.text();
      const hasRewrittenVariant = masterText.includes("variant?url=");
      const isM3u8 = masterText.startsWith("#EXTM3U");
      if (isM3u8 && hasRewrittenVariant) {
        console.log(`✅ PASS (M3U8 valid, variant URLs rewritten)`);
      } else {
        console.log(`❌ FAILED: Unexpected format (startsWith #EXTM3U: ${isM3u8}, has rewritten variant: ${hasRewrittenVariant})`);
      }

      // Extract first variant url
      const variantLine = masterText.split("\n").find((l) => l.trim().startsWith("variant?url="));
      if (variantLine) {
        const variantQuery = variantLine.trim();

        // 2. Variant Playlist
        process.stdout.write("2. Testing Variant Playlist (/api/stream/reanime/:id/variant)... ");
        const variantRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/${variantQuery}`);
        if (!variantRes.ok) {
          console.log(`❌ FAILED HTTP ${variantRes.status}`);
        } else {
          const variantText = await variantRes.text();
          const hasKey = variantText.includes("key?url=");
          const hasSegments = variantText.includes("segment?url=");
          if (hasKey && hasSegments) {
            console.log(`✅ PASS (AES-128 key URL rewritten, segments rewritten)`);
          } else {
            console.log(`❌ FAILED (hasKey: ${hasKey}, hasSegments: ${hasSegments})`);
          }

          // 3. AES-128 Key
          let keyBuf: Buffer = Buffer.alloc(0);
          let ivBuf: Buffer = Buffer.alloc(16);
          const keyLine = variantText.split("\n").find((l) => l.startsWith("#EXT-X-KEY:"));
          const keyMatch = keyLine?.match(/URI="([^"]*key\?url=[^"]+)"/);
          const ivMatch = keyLine?.match(/IV=0x([0-9a-fA-F]+)/);
          if (ivMatch) {
            ivBuf = Buffer.from(ivMatch[1], "hex");
          }

          if (keyMatch) {
            const keyPath = keyMatch[1];
            process.stdout.write("3. Testing AES-128 Key endpoint (/api/stream/reanime/:id/key)... ");
            const keyRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/${keyPath}`);
            keyBuf = Buffer.from(await keyRes.arrayBuffer());
            if (keyRes.ok && keyBuf.length === 16) {
              console.log(`✅ PASS (HTTP 200, exact 16-byte key received)`);
            } else {
              console.log(`❌ FAILED (HTTP ${keyRes.status}, length: ${keyBuf.length})`);
            }
          }

          // 4. Media Segment Range Request
          const segLine = variantText.split("\n").find((l) => l.trim().startsWith("segment?url="));
          if (segLine) {
            process.stdout.write("4. Testing Media Segment Range request (/api/stream/reanime/:id/segment)... ");
            const segRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/${segLine.trim()}`, {
              headers: {
                "Range": "bytes=0-1023",
              },
            });
            const segBuf = Buffer.from(await segRes.arrayBuffer());
            const is206 = segRes.status === 206;
            
            let isMpegTs = false;
            if (keyBuf.length === 16 && ivBuf.length === 16) {
              const decipher = crypto.createDecipheriv("aes-128-cbc", keyBuf, ivBuf);
              decipher.setAutoPadding(false);
              const decChunk = decipher.update(segBuf);
              isMpegTs = decChunk[0] === 0x47 && decChunk[188] === 0x47;
            }

            if (is206 && isMpegTs) {
              console.log(`✅ PASS (HTTP 206 Partial Content, 1024 bytes, MPEG-TS sync byte 0x47 verified after AES-128 deciphering)`);
            } else {
              console.log(`❌ FAILED (status: ${segRes.status}, len: ${segBuf.length}, isMpegTs: ${isMpegTs})`);
            }
          }
        }
      }
    }

    // 5. Subtitles (Arabic on GTO)
    process.stdout.write("5. Testing Subtitles (/api/stream/reanime/:id/subtitles/0)... ");
    const subRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/subtitles/0`);
    if (subRes.ok) {
      const subText = await subRes.text();
      const isVtt = subText.startsWith("WEBVTT");
      const contentType = subRes.headers.get("content-type") || "";
      if (isVtt && contentType.includes("text/vtt")) {
        console.log(`✅ PASS (HTTP 200, text/vtt, WEBVTT header, ${subText.length} bytes)`);
      } else {
        console.log(`❌ FAILED (isVtt: ${isVtt}, contentType: ${contentType})`);
      }
    } else {
      console.log(`❌ FAILED HTTP ${subRes.status}`);
    }

    // PHASE C: SSRF Protection
    console.log("\n--- PHASE C: SSRF Protection ---");
    const ssrfCases = [
      { name: "Arbitrary external domain", url: "https://evil.com/video.m3u8" },
      { name: "Substring deception", url: "https://evil-flixcloud.cc/video.m3u8" },
      { name: "Insecure HTTP scheme", url: "http://flixcloud.cc/video.m3u8" },
    ];

    for (const sc of ssrfCases) {
      process.stdout.write(`Testing SSRF: ${sc.name} (${sc.url})... `);
      const ssrfRes = await fetch(`${BASE_URL}/api/stream/reanime/${gtoSessionId}/variant?url=${encodeURIComponent(sc.url)}`);
      if (ssrfRes.status === 403) {
        console.log(`✅ BLOCKED (HTTP 403 Forbidden)`);
      } else {
        console.log(`❌ FAILED: Unexpected HTTP ${ssrfRes.status}`);
      }
    }

    // PHASE D: Critical Regression Test (AnimeParadise Primary)
    console.log("\n--- PHASE D: AnimeParadise Primary Provider Regression ---");
    for (const regressionTitle of ["Death Note", "One Piece"]) {
      process.stdout.write(`Checking AnimeParadise search for "${regressionTitle}"... `);
      try {
        const searchRes = await animeParadiseProvider.search(regressionTitle);
        if (searchRes.length > 0) {
          console.log(`✅ Available on AnimeParadise (${searchRes.length} results, first ID: ${searchRes[0].id})`);
          
          // Test AnimeParadise stream resolution
          process.stdout.write(`Testing AnimeParadise stream for "${regressionTitle}"... `);
          const epList = await animeParadiseProvider.getEpisodes(searchRes[0].id);
          if (epList.length > 0) {
            const apStream = await animeParadiseProvider.getStream(epList[0].id);
            if (apStream.type === "video" && apStream.streams.length > 0) {
              console.log(`✅ SUCCESS (AnimeParadise remains primary and functional: ${apStream.streams[0].quality})`);
            } else {
              console.log(`⚠️ AnimeParadise returned no streams for ep 1`);
            }
          }
        } else {
          console.log(`⚠️ No search results on AnimeParadise`);
        }
      } catch (err: any) {
        console.log(`❌ Error: ${err.message}`);
      }
    }

    console.log("\n==================================================");
    console.log("SUMMARY REPORT");
    console.log("==================================================");
    console.table(results);
  } finally {
    server.close();
  }
}

main().catch(console.error);
