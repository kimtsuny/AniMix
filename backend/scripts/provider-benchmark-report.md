# Streaming Provider Benchmark Report: AnimeParadise vs AllManga

**Project:** AniMix  
**SDK Under Test:** `anime-sdk` v1.1.0 (exact lockfile version)  
**Date:** September 27, 2026  
**Scope:** Isolated, read-first streaming provider benchmark across 30 curated anime titles representing long-running shonen, modern hits, classics, multi-season sequels, niche catalog, and feature films.

---

## 1. Executive Summary

This benchmark rigorously evaluates the existing production provider **AnimeParadise** against **AllManga** through the exact `anime-sdk@1.1.0` runtime installed in this repository.

### Key Empirical Findings:
1. **Stream Resolution Reality Check**:
   * **AnimeParadise**: Succeeded on **61 out of 62 (98.39%)** tested episodes for all discovered titles, delivering direct, playable HLS `.m3u8` master playlists with external WebVTT English subtitles.
   * **AllManga**: Failed on **0 out of 83 (0.00%)** tested episodes. Every single stream resolution attempt threw `AllManga returned no source URLs`.
2. **Root Cause of AllManga Failure (`AA_CRYPTO_MISSING`)**:
   Direct inspection of the GraphQL requests executed by `AllmangaProvider.fetchEpisodeSources()` revealed that the upstream AllAnime API (`api.allanime.day/api`) now requires a cryptographic request validation signature (`aaReq`). Because `anime-sdk@1.1.0` does not implement this challenge handshake, the upstream API returns `{ "errors": [{ "message": "AA_CRYPTO_MISSING" }], "data": { "episode": null } }`. Consequently, the SDK cannot retrieve any video source URLs.
3. **MKissa & Cloudflare Vulnerability**:
   Direct probing of the MKissa infrastructure (`https://mkissa.to/anime/6aa5e2b2be0758515ec1ed72/p-1-sub`) revealed an immediate **HTTP 403 Forbidden** protected by Cloudflare Turnstile bot detection (`challenges.cloudflare.com`). The SDK's fallback `GenericHlsExtractor` simply issues a standard Node fetch; it cannot bypass Cloudflare, execute client-side JavaScript, or resolve the underlying stream.
4. **Catalog Breadth vs. Playability**:
   AllManga demonstrated superior metadata catalog coverage (found **30/30 (100%)** titles and returned episode manifests for all of them, including all 5 movies and all 5 niche titles). AnimeParadise found **22/30 (73.33%)** titles, failing on niche titles and movies. However, **metadata coverage without stream playback is unusable for video delivery.**

---

## 2. Coverage Benchmark

| Metric | AnimeParadise | AllManga |
| :--- | :---: | :---: |
| **Titles Tested** | 30 | 30 |
| **Titles Discovered / Mapped** | 22 (73.3%) | 30 (100.0%) |
| **Episode Manifest Success** | 22 / 22 (100.0%) | 30 / 30 (100.0%) |
| **Episodes Sampled** | 62 | 83 |
| **Playable Streams Resolved** | **61 (98.4%)** | **0 (0.0%)** |
| **Overall Streaming Availability** | **High (for catalog)** | **Completely Broken (0%)** |

---

## 3. Quality Benchmark

| Metric | AnimeParadise | AllManga |
| :--- | :---: | :---: |
| **1080p Explicit Track** | 0% (Delivers adaptive HLS `"auto"`) | 0% (Resolver broken) |
| **720p Explicit Track** | 0% (Delivers adaptive HLS `"auto"`) | 0% (Resolver broken) |
| **Adaptive Bitrate HLS** | **100% of working streams** | 0% |
| **Direct MP4 Streams** | 0% | 0% |
| **Maximum Observed Quality** | Adaptive Master HLS (multi-rendition) | None (Resolution failed) |

> **Note on AnimeParadise Quality**: AnimeParadise serves HLS streams through `https://stream.animeparadise.moe/m3u8?url=...`. The playlist is labeled `quality: "auto"` because it is an HLS master manifest containing adaptive video renditions selectable by standard HLS players (e.g. HLS.js in frontend).

---

## 4. Subtitles Benchmark

| Metric | AnimeParadise | AllManga |
| :--- | :---: | :---: |
| **English Subtitles** | **100% of working streams** | 0% (Not extracted by SDK) |
| **Arabic Subtitles** | **0%** | **0%** |
| **Subtitle Format** | **WebVTT (`vtt`)** | None |
| **Subtitle Delivery** | Direct HTTPS URL from CDN | None |
| **SDK Subtitle Extraction** | Supported via `normalizeSubtitleEntries` | **Not implemented in SDK** |

> **Critical Architecture Finding on Subtitles**: Even if AllManga's stream resolver were working, the installed `AllmangaProvider` implementation in `anime-sdk@1.1.0` has **no subtitle extraction logic whatsoever**. Its `extractSource()` and `resolveClockJson()` methods return stream objects with `{ sourceUrl, isHLS, quality, language, headers }`, completely omitting `subtitles`. It never provides Arabic or English subtitle tracks to the application.

---

## 5. Audio / Dub Benchmark

| Metric | AnimeParadise | AllManga |
| :--- | :---: | :---: |
| **Subtitles Audio (Japanese)** | Available on all mapped titles | Manifest contains `sub` |
| **Dubbed Audio (English/Other)** | Separate dual-audio titles or sub-only | Manifest exposes `dub` array |
| **Multi-Language Tracks Returned** | Single stream per unit | Stream resolution blocked |

AllManga's metadata accurately distinguishes `sub` and `dub` in `availableEpisodesDetail`. However, without stream resolution capability, neither can be played.

---

## 6. Movies Benchmark

| Movie Title | AniList ID | AnimeParadise Status | AllManga Status |
| :--- | :---: | :---: | :---: |
| **Spirited Away** | 199 | **RESOLVED (Ep 1 stream OK)** | Search OK / Stream FAIL |
| **Your Name.** | 21519 | NOT FOUND | Search OK / Stream FAIL |
| **A Silent Voice** | 20954 | NOT FOUND | Search OK / Stream FAIL |
| **Princess Mononoke** | 164 | NOT FOUND | Search OK / Stream FAIL |
| **Suzume** | 142470 | NOT FOUND | Search OK / Stream FAIL |

* **AnimeParadise**: Finds older major theatrical releases indexed under standard names (e.g. Spirited Away), but completely misses modern or non-prefixed movie queries.
* **AllManga**: Finds 5/5 movies in search and identifies them as 1-episode shows, but fails 100% on stream resolution due to `AA_CRYPTO_MISSING`.

---

## 7. Phase 12: MKissa Deep-Dive Investigation

Target URL provided: `https://mkissa.to/anime/6aa5e2b2be0758515ec1ed72/p-1-sub` (Show ID: `6aa5e2b2be0758515ec1ed72`).

### 1. What is MKissa?
MKissa (`mkissa.to`) is an external domain and frontend embed player affiliated with the AllAnime/AllManga network. It hosts client-side player wrappers for third-party video hosters and embeds.

### 2. Is it part of the current AllManga infrastructure?
Yes. When AllAnime sources are decrypted from GraphQL payloads, some hosters return external redirect URLs pointing to `mkissa.to/anime/...`.

### 3. Does `anime-sdk` follow that URL automatically?
The SDK attempts to delegate non-clock URLs to `GenericHlsExtractor.extract(url)`.

### 4. Does the SDK extract the actual M3U8 after MKissa?
**No.** `GenericHlsExtractor` performs an HTTP GET request and searches the raw HTML string using regular expressions for `.m3u8` or `.mp4`. Because MKissa is a client-side JavaScript SPA behind Cloudflare Turnstile, no video link exists in the raw HTML.

### 5. Does Cloudflare prevent extraction?
**Yes.** When queried by our benchmark:
```text
HTTP/2 403 Forbidden
<title>Just a moment...</title>
https://challenges.cloudflare.com
```
Cloudflare blocks the request immediately with an HTTP 403 bot challenge.

### 6. Is the returned URL usable directly inside AniMix?
**No.** It cannot be fed into HLS.js or an HTML5 `<video>` tag. Opening it inside an `<iframe>` exposes users to aggressive pop-ups, redirects, and broken player UI that violates AniMix's clean UX requirements.

---

## 8. Latency and Performance Analysis

| Operation | AnimeParadise | AllManga |
| :--- | :---: | :---: |
| **Search Latency (Median)** | 529 ms | 241 ms |
| **Episode Fetch Latency (Median)** | 409 ms | 112 ms |
| **Stream Resolution Latency (Median)**| 561 ms (Success) | 293 ms (Instant Rejection) |

AnimeParadise is slightly slower on search and episode fetch because it resolves against its REST API directly, but it reliably returns functional HLS streams. AllManga's GraphQL is snappy, but fails instantly on episode streams.

---

## 9. Failure Analysis Breakdown

### AnimeParadise Failures:
1. `NOT_FOUND` (8 titles, 26.7%):
   * Niche anime: *Great Teacher Onizuka*, *Sonny Boy*, *Ping Pong the Animation*, *Shouwa Genroku Rakugo Shinjuu*.
   * Feature movies: *Your Name.*, *A Silent Voice*, *Princess Mononoke*, *Suzume*.
2. `STREAM_FAILURE` (1 episode out of 62):
   * *One Piece* Episode 590: Toriko crossover special with missing source in the provider's database.

### AllManga Failures:
1. `STREAM_FAILURE` / `AA_CRYPTO_MISSING` (83 episodes out of 83, **100% failure rate**):
   * Every single call to `allManga.resolveStream()` failed because the upstream GraphQL server refused the unsigned query.
2. `CLOUDFLARE` / `MKISSA_REDIRECT`:
   * MKissa embeds cannot be resolved due to Cloudflare Turnstile challenges.

---

## 10. Comprehensive Per-Title Benchmark Table

| # | Title | Category | AniList ID | AnimeParadise Mapped | AP Eps | AP Streams | AllManga Mapped | AM Eps | AM Streams | Primary Failure Mode |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | **One Piece** | Long-running | 21 | YES | 1179 | **3/4** | YES | 1185 | 0/4 | AM: `AA_CRYPTO_MISSING` |
| 2 | **Naruto** | Long-running | 20 | YES | 220 | **4/4** | YES | 220 | 0/4 | AM: `AA_CRYPTO_MISSING` |
| 3 | **Bleach** | Long-running | 269 | YES | 13 | **3/3** | YES | 366 | 0/4 | AP: Season split / AM: `AA_CRYPTO` |
| 4 | **Dragon Ball** | Long-running | 223 | YES | 1 | **1/1** | YES | 153 | 0/4 | AP: Multi-part / AM: `AA_CRYPTO` |
| 5 | **Detective Conan** | Long-running | 235 | YES | 1 | **1/1** | YES | 1 | 0/1 | AP: Multi-part / AM: `AA_CRYPTO` |
| 6 | **Demon Slayer** | Modern | 101922 | YES | 26 | **3/3** | YES | 26 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 7 | **Jujutsu Kaisen** | Modern | 113415 | YES | 35 | **3/3** | YES | 24 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 8 | **Attack on Titan** | Modern | 16498 | YES | 25 | **3/3** | YES | 27 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 9 | **My Hero Academia** | Modern | 21459 | YES | 13 | **3/3** | YES | 14 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 10 | **Solo Leveling** | Modern | 151807 | YES | 12 | **3/3** | YES | 13 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 11 | **Death Note** | Older | 1535 | YES | 74 | **4/4** | YES | 37 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 12 | **Monster** | Older | 19 | YES | 12 | **3/3** | YES | 12 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 13 | **Great Teacher Onizuka** | Older | 245 | NO | 0 | 0/0 | YES | 43 | 0/3 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 14 | **Code Geass** | Older | 1575 | YES | 1 | **1/1** | YES | 25 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 15 | **FMA: Brotherhood** | Older | 5114 | YES | 64 | **4/4** | YES | 64 | 0/4 | AM: `AA_CRYPTO_MISSING` |
| 16 | **AoT Season 3 Part 2** | Sequel | 104578 | YES | 10 | **3/3** | YES | 10 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 17 | **Bleach: TYBW** | Sequel | 114446 | YES | 13 | **3/3** | YES | 13 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 18 | **Mob Psycho 100 II** | Sequel | 101338 | YES | 13 | **3/3** | YES | 13 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 19 | **Vinland Saga S2** | Sequel | 136430 | YES | 24 | **3/3** | YES | 24 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 20 | **Kaguya-sama S3** | Sequel | 125367 | YES | 13 | **3/3** | YES | 13 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 21 | **Odd Taxi** | Niche | 131447 | YES | 13 | **3/3** | YES | 13 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 22 | **Sonny Boy** | Niche | 132126 | NO | 0 | 0/0 | YES | 12 | 0/3 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 23 | **Ping Pong the Animation** | Niche | 20607 | NO | 0 | 0/0 | YES | 11 | 0/3 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 24 | **Rakugo Shinjuu** | Niche | 20973 | NO | 0 | 0/0 | YES | 13 | 0/3 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 25 | **Mononoke** | Niche | 2246 | YES | 12 | **3/3** | YES | 12 | 0/3 | AM: `AA_CRYPTO_MISSING` |
| 26 | **Spirited Away** | Movie | 199 | YES | 1 | **1/1** | YES | 1 | 0/1 | AM: `AA_CRYPTO_MISSING` |
| 27 | **Your Name.** | Movie | 21519 | NO | 0 | 0/0 | YES | 1 | 0/1 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 28 | **A Silent Voice** | Movie | 20954 | NO | 0 | 0/0 | YES | 1 | 0/1 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 29 | **Princess Mononoke** | Movie | 164 | NO | 0 | 0/0 | YES | 1 | 0/1 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |
| 30 | **Suzume** | Movie | 142470 | NO | 0 | 0/0 | YES | 1 | 0/1 | AP: `NOT_FOUND` / AM: `AA_CRYPTO` |

---

## 11. Technical Architecture Findings

1. **Hardcoded Provider Coupling in AniMix**:
   * Currently, `backend/src/services/anime/episode.service.ts` directly checks:
     ```typescript
     if (partMapping.provider !== "animeparadise") { ... }
     ```
   * `backend/src/services/anime/mapping/candidate-discovery.ts` directly defines:
     ```typescript
     export interface DiscoveredCandidate { provider: "animeparadise"; ... }
     ```
   * `phase3-planner.ts` imports and invokes `animeParadiseProvider.getEpisodes()` directly.
2. **Missing Subtitle Support in AllManga SDK implementation**:
   * Even if AllAnime's `AA_CRYPTO` security barrier is solved, `AllmangaProvider` in `anime-sdk` drops subtitles completely. AniMix relies on `subtitles: NormalizedSubtitle[]` for the video player; adopting AllManga would regress subtitle functionality to zero unless custom subtitle scraping is written.
3. **Upstream SDK Dependency Block**:
   * `anime-sdk` v1.1.0 is hardcoded to a legacy GraphQL persisted query hash (`d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec`) and fallback query without the required `aaReq` crypto challenge.

---

## 12. Final Technical Recommendation

### Outcome: **B (Modified)**
> **AnimeParadise is currently the ONLY functional stream provider in production (61/62 streams working). AllManga CANNOT be used as primary or secondary streaming provider at this time because its stream resolution is 100% broken by upstream API security changes (`AA_CRYPTO_MISSING`) and MKissa Cloudflare barriers.**

### Concrete Next Steps:
1. **Retain AnimeParadise as Primary**:
   Do NOT remove or disable AnimeParadise. It is currently the sole working video pipeline for AniMix.
2. **Address Catalog Gaps via a Working Secondary Provider (e.g. Gogoanime)**:
   Notice that the project already has `backend/src/services/streaming/providers/gogoanime.provider.ts`. Gogoanime/AniNeko handles older classics and movies that AnimeParadise misses.
3. **Refactor Hardcoded Assumptions to `ProviderRegistry`**:
   Abstract `episode.service.ts` and `candidate-discovery.ts` so that providers are loaded dynamically from a registry rather than checking `=== "animeparadise"`.
4. **Monitor / Patch `anime-sdk`**:
   Track upstream `anime-sdk` releases for `AA_CRYPTO` support before re-evaluating AllManga.
