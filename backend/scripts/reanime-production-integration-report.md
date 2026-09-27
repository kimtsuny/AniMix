# ReAnime Production Integration Report: Secondary Streaming Provider & Playback Proxy

## Executive Summary

ReAnime has been integrated into AniMix as a **secondary streaming provider with backend playback proxy**, with **AnimeParadise strictly maintained as the primary provider**.

The integration satisfies all constraints:
- **Zero Prisma schema or migration modifications**: Existing `Episode`, `AnimeSeason`, and `EpisodeProviderMapping` models are used as-is.
- **Zero frontend modifications**: The frontend HLS video player transparently consumes internal backend proxy routes (`/api/stream/reanime/...`) and WebVTT subtitle tracks.
- **Zero hardcoded single-provider assumptions**: Provider abstractions remain generic, supporting AnimeParadise, ReAnime, and Gogoanime.
- **Strict SSRF protection**: Only verified FlixCloud and CDN hosts (`*.flixcloud.cc`, `*.rundowncdn.top`, `*.toprundowncdn.top`) are permitted via strict URL parsing.
- **100% verified test results**: 7/7 testable streams resolved, 1 expected absence (Rakugo Shinjuu) handled gracefully without errors, 5/5 proxy endpoints verified (master, variant, 16-byte key, Range segment with MPEG-TS sync 0x47, and Arabic WebVTT subtitles), and primary provider regressions (Death Note, One Piece) confirmed.

---

## 1. Files Modified and Added

### Modified Production Files
1. [`backend/src/services/streaming/streaming.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/streaming.service.ts):
   - Registered `reanimeProvider` into the provider array.
   - Enforced primary provider priority (`animeparadise` sorted first).
   - Added automatic secondary fallback to ReAnime if AnimeParadise cannot produce a playable stream.
2. [`backend/src/services/anime/episode.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/anime/episode.service.ts):
   - Added support for `reanime` provider episodes.
   - Added fallback to ReAnime `getEpisodes` if AnimeParadise returns 0 episodes or has `na_` placeholder.
3. [`backend/src/controllers/anime.controller.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/controllers/anime.controller.ts):
   - Enabled episode sync when AnimeParadise provider ID is marked unavailable (`na_`), allowing ReAnime discovery.
4. [`backend/src/app.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/app.ts):
   - Mounted `/api/stream` router for proxy endpoints.

### New Production Files
1. [`backend/src/services/streaming/providers/reanime.provider.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/providers/reanime.provider.ts):
   - Implements `StreamingProvider` interface (`name: "reanime"`, `search`, `getEpisodes`, `getStream`).
   - Handles Node.js-native WASM execution, dynamic key derivation, and session registration.
   - Includes AniList ID direct lookup, known catalog alias resolution (e.g. Suzume 142470 -> 142770), and fuzzy search fallback.
2. [`backend/src/services/streaming/stream-proxy.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/stream-proxy.service.ts):
   - In-memory bounded session store (maximum 1,000 sessions, 4-hour conservative TTL, automated 10-minute expiry sweeps).
   - Hostname SSRF allowlist validator.
   - M3U8 XOR manifest unmasker using session `pkKey`.
   - SRT to WebVTT converter with timestamp formatting and subtitle index normalization.
3. [`backend/src/controllers/stream-proxy.controller.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/controllers/stream-proxy.controller.ts):
   - Handlers for `getMasterPlaylist`, `getVariantPlaylist`, `getEncryptionKey`, `getMediaSegment`, and `getSubtitle`.
   - Injects `Referer: https://flixcloud.cc/` on upstream CDN requests.
   - Rewrites relative and absolute stream URIs to internal proxy endpoints.
   - Forwards HTTP Range headers and returns HTTP 206 Partial Content for media segments.
4. [`backend/src/routes/stream.routes.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/routes/stream.routes.ts):
   - Express router mapping `/api/stream/reanime/:sessionId/...` endpoints.

### Verification Scripts
1. [`backend/scripts/verify-production-integration.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/scripts/verify-production-integration.ts):
   - Automated test suite validating stream resolution across 8 titles, all 5 proxy endpoints, SSRF blocks, and AnimeParadise primary regressions.

---

## 2. Architecture & Provider Flow

```mermaid
flowchart TD
    Client[Browser / Watch Page] -->|GET /api/episodes/:id/stream| StreamingService[Streaming Service]
    StreamingService --> CheckPrimary{Episode has AnimeParadise Mapping?}
    
    CheckPrimary -->|Yes| TryAP[Call AnimeParadise Provider]
    TryAP --> APValid{Playable Stream Returned?}
    APValid -->|Yes| ReturnAP[Return AnimeParadise Stream (Primary)]
    
    APValid -->|No / Exception| TriggerFallback[Initiate ReAnime Fallback]
    CheckPrimary -->|No| TriggerFallback
    
    TriggerFallback --> CheckAniList{AniList ID Available?}
    CheckAniList -->|No| Fail[All Providers Failed]
    CheckAniList -->|Yes| ReAnimeProvider[ReAnime Provider getStream]
    
    ReAnimeProvider --> ReAnimeAPI[ReAnime API /api/flix/:anilistId/:ep]
    ReAnimeAPI --> HasServers{Servers Returned?}
    HasServers -->|No| FuzzyFallback[Fuzzy Title Fallback]
    FuzzyFallback --> HasServers2{Servers Found?}
    HasServers2 -->|No| Fail
    HasServers2 -->|Yes| ResolveEmbed[Extract FlixCloud Embed]
    HasServers -->|Yes| ResolveEmbed
    
    ResolveEmbed --> WasmCrypto[Node.js Dynamic WASM Execution]
    WasmCrypto --> CreateSession[Create Proxy Session in StreamProxyService]
    CreateSession --> ReturnDescriptor[Return Internal Stream Descriptor]
    
    ReturnDescriptor --> Client
    Client -->|GET /api/stream/reanime/:sessionId/master.m3u8| Proxy[Backend Playback Proxy]
    Proxy -->|Injects Referer & Unmasks Manifest| CDN[FlixCloud / RundownCDN]
```

---

## 3. Fallback Flow

1. When `getStream(episodeId)` is invoked:
   - All `EpisodeProviderMapping` records for that episode are sorted so `animeparadise` is attempted first.
   - If `animeparadise` returns a valid video stream payload, it is returned immediately to the caller. ReAnime is **never called** when the primary provider succeeds.
2. If `animeparadise` fails (e.g., source deleted, anti-bot challenge, network timeout, or no video streams returned):
   - The service extracts the AniList ID from the episode's season (`episode.season.anilistId ?? episode.season.anime.anilistId`).
   - If present, it executes `reanimeProvider.getStream("reanime:${anilistId}:${episode.number}")`.
3. If ReAnime succeeds:
   - A secondary `EpisodeProviderMapping` for `provider: "reanime"` is upserted to link future queries without deleting the `animeparadise` record.
   - The normalized stream descriptor with `/api/stream/reanime/:sessionId/master.m3u8` is returned.
4. If ReAnime also fails:
   - A standardized error `All streaming providers failed for episode ${episodeId}` is thrown.

---

## 4. Backend Playback Proxy Specification

| Endpoint | Method | Upstream Target | Transformation / Action |
| :--- | :--- | :--- | :--- |
| `/api/stream/reanime/:sessionId/master.m3u8` | `GET` | Upstream HLS Master URL | XOR-unmasks payload using session `pkKey`. Rewrites `#EXT-X-MEDIA:TYPE=AUDIO` and variant `.m3u8` URIs to relative proxy paths (`variant?url=...`). |
| `/api/stream/reanime/:sessionId/variant` | `GET` | Upstream Variant Playlist URL | XOR-unmasks payload if needed. Rewrites `#EXT-X-KEY:URI="..."` to `key?url=...`. Rewrites media segment URIs (`.ts` or `.mp4`) to `segment?url=...`. |
| `/api/stream/reanime/:sessionId/key` | `GET` | Upstream AES-128 Key URL | Injects `Referer: https://flixcloud.cc/`. Returns raw 16-byte cryptographic key with `Content-Type: application/octet-stream`. |
| `/api/stream/reanime/:sessionId/segment` | `GET`, `HEAD` | Upstream Media Segment URL | Injects `Referer: https://flixcloud.cc/`. Forwards client `Range` header. Returns `HTTP 206 Partial Content` (or 200), `Content-Range`, `Content-Length`, and `Content-Type: video/mp2t`. |
| `/api/stream/reanime/:sessionId/subtitles/:trackId` | `GET` | Upstream Subtitle Track URL | Fetches upstream SRT/VTT. Automatically parses SRT subtitles to WebVTT format (`WEBVTT` header and `00:00:00.000` timestamp formatting). Sets `Content-Type: text/vtt; charset=utf-8`. |

---

## 5. Security & SSRF Protection Model

The backend proxy **does not** expose an open proxy:
1. **Explicit Session Verification**:
   - The URL path contains a 16-byte random hex `sessionId`.
   - If the session does not exist in the active memory store or has expired, the request is immediately rejected (`404 Not Found` or `400 Bad Request`).
2. **Strict Hostname Allowlist**:
   - Every upstream target URL is parsed using Node's `new URL(targetUrl)`.
   - Protocol must strictly equal `https:`.
   - Hostname must be an exact match or valid subdomain of:
     - `flixcloud.cc`
     - `rundowncdn.top`
     - `toprundowncdn.top`
   - Substring matching (e.g. `evil-flixcloud.cc`) and insecure schemes (`http://flixcloud.cc`) are explicitly rejected with `HTTP 403 Forbidden`.

---

## 6. Token & Caching Strategy

- **No Redis Dependency**: Uses a lightweight, bounded in-memory `Map` within `StreamProxyService`.
- **Session Memory Bound**: Capped at `MAX_SESSIONS = 1000`. When limit is reached, oldest session is evicted (FIFO).
- **Session TTL**: Upstream FlixCloud JWT tokens have a 6-hour verified expiration (`exp - iat = 21600s`). AniMix applies a conservative **4-hour TTL** (`4 * 60 * 60 * 1000 ms`).
- **Stream Session Cache**: ReAnime stream resolutions are cached in `STREAM_SESSION_CACHE` for 1 hour (`CACHE_VALID_MS = 60 * 60 * 1000`). Repeated requests for the same episode within an hour return the existing active proxy session without contacting ReAnime or FlixCloud.
- **Single-use Handshake Protection**: ReAnime single-use handshake tokens are consumed once during stream resolution and never cached.
- **Automated Eviction**: A background interval sweeps expired sessions every 10 minutes (`unref()` timer to avoid blocking process exit).

---

## 7. Subtitle Handling

- **Formats Supported**: ASS, SRT, WebVTT.
- **SRT to WebVTT Translation**: Upstream subtitle tracks often contain SRT formatting with comma millisecond delimiters (`00:01:23,456 --> 00:01:25,789`). The proxy transforms these into standard WebVTT (`00:01:23.456 --> 00:01:25.789`) with a `WEBVTT` header.
- **Language Availability**: Subtitle tracks are passed through with their actual upstream languages (e.g., Arabic, English, Spanish). Arabic subtitles were verified on GTO (`ar` track delivered as WebVTT). No synthetic or unsupported languages are claimed.

---

## 8. Verification & Test Suite Results

Ran automated suite [`backend/scripts/verify-production-integration.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/scripts/verify-production-integration.ts):

### Phase A: ReAnime Provider Stream Resolution (8 Known Titles)

| Title | AniList ID | Expected | Result | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Great Teacher Onizuka (GTO)** | 245 | ReAnime Stream Resolved | **PASS** | Session created, 13 subtitle tracks (Arabic verified) |
| **Sonny Boy** | 132126 | ReAnime Stream Resolved | **PASS** | Session created, 3 subtitle tracks |
| **Your Name.** | 21519 | ReAnime Stream Resolved | **PASS** | Session created, 7 subtitle tracks |
| **A Silent Voice** | 20954 | ReAnime Stream Resolved | **PASS** | Session created, 7 subtitle tracks |
| **Suzume** | 142470 | ReAnime Stream Resolved | **PASS** | Catalog alias 142470 -> 142770 applied, 5 subtitle tracks |
| **Death Note** | 1535 | ReAnime Stream Resolved | **PASS** | Session created, 3 subtitle tracks |
| **One Piece** | 21 | ReAnime Stream Resolved | **PASS** | Session created, 5 subtitle tracks |
| **Shouwa Genroku Rakugo Shinjuu** | 20973 | Graceful failure (no servers) | **EXPECTED_ABSENCE** | Cleanly rejected: `[ReAnime Provider] No streaming servers available for 20973:1` (0 unhandled exceptions) |

### Phase B: Backend Playback Proxy Endpoints (GTO Episode 1 Session)

| Component | Target URL | Status | Output Verification |
| :--- | :--- | :--- | :--- |
| **Master Playlist** | `/api/stream/reanime/:id/master.m3u8` | `HTTP 200` | Valid `#EXTM3U`, variants rewritten to `variant?url=...` |
| **Variant Playlist** | `/api/stream/reanime/:id/variant?url=...` | `HTTP 200` | `#EXT-X-KEY` rewritten to `key?url=...`, segments rewritten to `segment?url=...` |
| **AES-128 Key** | `/api/stream/reanime/:id/key?url=...` | `HTTP 200` | Exactly 16 bytes received |
| **Segment Range** | `/api/stream/reanime/:id/segment?url=...` | `HTTP 206` | 1024 bytes partial content; MPEG-TS sync byte `0x47` verified after AES-128 deciphering |
| **Arabic Subtitles** | `/api/stream/reanime/:id/subtitles/0` | `HTTP 200` | `Content-Type: text/vtt; charset=utf-8`, starts with `WEBVTT`, 39,109 bytes |

### Phase C: SSRF Protection Guardrails

| Attack Vector | Tested URL | HTTP Status | Verdict |
| :--- | :--- | :--- | :--- |
| Arbitrary external domain | `https://evil.com/video.m3u8` | `HTTP 403` | **BLOCKED** |
| Substring spoofing | `https://evil-flixcloud.cc/video.m3u8` | `HTTP 403` | **BLOCKED** |
| Insecure HTTP scheme | `http://flixcloud.cc/video.m3u8` | `HTTP 403` | **BLOCKED** |

### Phase D: Primary Provider Regression Tests

| Anime Title | Primary Provider Check | Stream Resolution | Regression Status |
| :--- | :--- | :--- | :--- |
| **Death Note** | AnimeParadise search matched `animeparadise:Wt3KyfXyy1qKPhNi` | `auto` stream resolved | **NO REGRESSION** (AnimeParadise remained primary) |
| **One Piece** | AnimeParadise search matched `animeparadise:ASa7g4dGZREXdtzA` | `auto` stream resolved | **NO REGRESSION** (AnimeParadise remained primary) |

### Existing Test Suites
- `src/services/anime/mapping/__tests__/matching-engine.test.ts`: **31/31 passed, 0 failures**.
- TypeScript typecheck (`tsc --noEmit`): **0 errors**.

---

## 9. Known Limitations

1. **In-Memory Cache in Clustered Environments**:
   - In single-instance deployments, the in-memory map functions reliably. If AniMix backend is horizontally scaled across multiple load-balanced worker processes, proxy requests could land on a worker without the session unless Redis or sticky sessions are configured.
2. **Provider Catalog Gaps**:
   - Certain niche anime (e.g. *Shouwa Genroku Rakugo Shinjuu*) exist in ReAnime's index but have 0 hosted servers. As verified, this is handled gracefully as a missing source without crashing.
3. **FlixCloud Dynamic Obfuscation**:
   - The WASM crypto and field derivation logic is current with FlixCloud's latest obfuscation algorithm. If upstream updates their WASM payload or key field schema, the extractor utility in `reanime.provider.ts` would need updating.
