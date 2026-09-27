import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProbeResult {
  url: string;
  method: string;
  status: number;
  cloudflareBlock: boolean;
  captchaRequired: boolean;
  directApiAccess: boolean;
  classification: "DIRECT_API_ACCESS" | "CLOUDFLARE_BLOCK" | "CAPTCHA_REQUIRED" | "HTTP_ERROR" | "VALID_API_RESPONSE";
  latencyMs: number;
  preview: string;
}

interface TestTitle {
  name: string;
  showId: string;
  isMovie?: boolean;
}

const TEST_TITLES: TestTitle[] = [
  { name: "One Piece", showId: "ReooPAxPMsHM4KPMY" },
  { name: "Death Note", showId: "RezHft5pjutwWcE3B" },
  { name: "Ghost Meets Gal!", showId: "6aa5e2b2be0758515ec1ed72" },
  { name: "Spirited Away", showId: "CSi9oF8YudfHuKvod", isMovie: true },
];

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";

async function probeEndpoint(
  url: string,
  method = "GET",
  body?: any,
  headers: Record<string, string> = {}
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://mkissa.to/",
        Origin: "https://mkissa.to",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();

    const isCf =
      res.status === 403 ||
      text.includes("Just a moment...") ||
      text.includes("challenges.cloudflare.com") ||
      text.includes("cf-browser-verification");

    const isCaptcha =
      text.includes("recaptcha") ||
      text.includes("NEED_CAPTCHA") ||
      text.includes("hcaptcha");

    let classification: ProbeResult["classification"] = "VALID_API_RESPONSE";
    if (isCf) classification = "CLOUDFLARE_BLOCK";
    else if (isCaptcha) classification = "CAPTCHA_REQUIRED";
    else if (!res.ok) classification = "HTTP_ERROR";
    else classification = "DIRECT_API_ACCESS";

    return {
      url,
      method,
      status: res.status,
      cloudflareBlock: isCf,
      captchaRequired: isCaptcha,
      directApiAccess: !isCf && res.ok,
      classification,
      latencyMs,
      preview: text.slice(0, 150).replace(/\s+/g, " "),
    };
  } catch (err: any) {
    return {
      url,
      method,
      status: 0,
      cloudflareBlock: false,
      captchaRequired: false,
      directApiAccess: false,
      classification: "HTTP_ERROR",
      latencyMs: Date.now() - start,
      preview: err.message,
    };
  }
}

export async function runDirectPoc() {
  console.log("===============================================================================");
  console.log("  MKISSA / ALLANIME DIRECT API PROOF-OF-CONCEPT INVESTIGATION");
  console.log("===============================================================================\n");

  // PHASE 7: CLOUDFLARE PROBING
  console.log("--- PHASE 7: PROBING CLOUDFLARE & API ENDPOINTS ---");
  const probeTargets = [
    { url: "https://mkissa.to", method: "GET" },
    { url: "https://mkissa.to/anime/6aa5e2b2be0758515ec1ed72/p-1-sub", method: "GET" },
    { url: "https://api.mkissa.net/api", method: "POST", body: { query: "{ __typename }" } },
    { url: "https://api.allanime.day/api", method: "POST", body: { query: "{ __typename }" } },
    { url: "https://cdn.mkissa.net/all/mk/_app/immutable/entry/app.DdZ7L58y.js", method: "GET" },
  ];

  const probeResults: ProbeResult[] = [];
  for (const t of probeTargets) {
    const res = await probeEndpoint(t.url, t.method, t.body, { "Content-Type": "application/json" });
    probeResults.push(res);
    console.log(`[${res.method}] ${res.url}`);
    console.log(`  -> Status: ${res.status} | Latency: ${res.latencyMs}ms | Class: ${res.classification}`);
    console.log(`  -> Preview: ${res.preview}\n`);
  }

  // TEST DIRECT GRAPHQL ON api.mkissa.net & api.allanime.day
  console.log("--- PHASES 5 & 6: DIRECT API QUERIES FOR TEST TITLES ---");
  const titleResults: any[] = [];

  const endpoints = [
    { name: "api.mkissa.net", url: "https://api.mkissa.net/api" },
    { name: "api.allanime.day", url: "https://api.allanime.day/api" },
  ];

  for (const title of TEST_TITLES) {
    console.log(`\nTesting title: "${title.name}" (ID: ${title.showId})`);
    const titleRecord: any = {
      title: title.name,
      showId: title.showId,
      isMovie: !!title.isMovie,
      endpoints: {},
    };

    for (const ep of endpoints) {
      console.log(`  -> Querying ${ep.name}...`);
      const epRecord: any = {
        metadataSuccess: false,
        metadataLatencyMs: 0,
        episodeCount: 0,
        streamSuccess: false,
        streamLatencyMs: 0,
        errors: [],
        rawStreamPayload: null,
      };

      // 1. Show metadata
      const showGql = `query ($showId: String!) { show(_id: $showId) { _id name englishName availableEpisodesDetail } }`;
      const metaStart = Date.now();
      try {
        const metaRes = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            Referer: "https://mkissa.to/",
            Origin: "https://mkissa.to",
          },
          body: JSON.stringify({ query: showGql, variables: { showId: title.showId } }),
        });
        epRecord.metadataLatencyMs = Date.now() - metaStart;
        if (metaRes.ok) {
          const metaJson: any = await metaRes.json();
          epRecord.metadataSuccess = !!metaJson?.data?.show;
          const subEps = metaJson?.data?.show?.availableEpisodesDetail?.sub || [];
          epRecord.episodeCount = subEps.length;
          console.log(`     [Metadata] OK | Latency: ${epRecord.metadataLatencyMs}ms | Sub episodes: ${subEps.length}`);
        } else {
          epRecord.errors.push(`Metadata HTTP ${metaRes.status}`);
        }
      } catch (err: any) {
        epRecord.metadataLatencyMs = Date.now() - metaStart;
        epRecord.errors.push(`Metadata Error: ${err.message}`);
      }

      // 2. Stream Resolution Query (Episode 1)
      const streamGql = `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId translationType: $translationType episodeString: $episodeString) { episodeString sourceUrls } }`;
      const streamStart = Date.now();
      try {
        const streamRes = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            Referer: "https://mkissa.to/",
            Origin: "https://mkissa.to",
          },
          body: JSON.stringify({
            query: streamGql,
            variables: {
              showId: title.showId,
              translationType: "sub",
              episodeString: "1",
            },
          }),
        });
        epRecord.streamLatencyMs = Date.now() - streamStart;
        const streamJson: any = await streamRes.json();
        epRecord.rawStreamPayload = streamJson;

        if (streamJson?.errors && streamJson.errors.length > 0) {
          const errCodes = streamJson.errors.map((e: any) => e.extensions?.code || e.message);
          epRecord.errors.push(...errCodes);
          console.log(`     [Stream] REJECTED with error: ${errCodes.join(", ")} | Latency: ${epRecord.streamLatencyMs}ms`);
        } else if (streamJson?.data?.episode?.sourceUrls) {
          epRecord.streamSuccess = true;
          console.log(`     [Stream] SUCCESS | Latency: ${epRecord.streamLatencyMs}ms | Sources: ${streamJson.data.episode.sourceUrls.length}`);
        } else {
          epRecord.errors.push("NO_DATA_RETURNED");
          console.log(`     [Stream] NO DATA | Latency: ${epRecord.streamLatencyMs}ms`);
        }
      } catch (err: any) {
        epRecord.streamLatencyMs = Date.now() - streamStart;
        epRecord.errors.push(`Stream Error: ${err.message}`);
      }

      titleRecord.endpoints[ep.name] = epRecord;
    }

    titleResults.push(titleRecord);
  }

  // Save full PoC results
  const outPath = path.join(__dirname, "mkissa-poc-results.json");
  const fullReport = {
    timestamp: new Date().toISOString(),
    probes: probeResults,
    titleTests: titleResults,
  };
  await fs.writeFile(outPath, JSON.stringify(fullReport, null, 2), "utf-8");
  console.log(`\nPoC results saved to: ${outPath}`);
  return fullReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDirectPoc().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
