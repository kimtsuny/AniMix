# ReAnime Integration — Complete Code Audit

## 1. Executive Summary

This document is a comprehensive, read-only architectural change audit of the **ReAnime secondary streaming provider and backend playback proxy integration** into AniMix.

The integration was designed under strict production constraints:
- **Primary Provider Invariant**: AnimeParadise remains the authoritative primary streaming provider. ReAnime is only engaged as a fallback when AnimeParadise cannot yield a playable stream.
- **Zero Frontend Changes**: The frontend player consumes standard HLS and WebVTT tracks without provider-specific logic.
- **Zero Schema or Migration Changes**: PostgreSQL database tables (`Anime`, `AnimeSeason`, `Episode`, `EpisodeProviderMapping`, `AnimeSeasonProviderMapping`) are used as-is.
- **Zero External Infrastructure Additions**: No Redis or message queues were introduced; an in-memory bounded session store handles stream tokens.
- **Complete Reversibility**: The integration is strictly modular and can be cleanly decoupled or removed without affecting baseline AniMix operations.

---

## 2. Files Changed

Based on direct inspection of `git status` and `git diff`:

### A. Modified Existing Files (4 files)
1. [`backend/src/app.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/app.ts): Mounted `/api/stream` router.
2. [`backend/src/services/streaming/streaming.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/streaming.service.ts): Registered `reanimeProvider`, prioritized AnimeParadise, and implemented secondary fallback flow.
3. [`backend/src/services/anime/episode.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/anime/episode.service.ts): Added ReAnime episode syncing for seasons with no AnimeParadise coverage or marked `na_`.
4. [`backend/src/controllers/anime.controller.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/controllers/anime.controller.ts): Allowed lazy episode syncing when an anime season has an AniList ID even if flagged `na_`.

*(Note: Diff in `frontend/` relates to earlier `isAdult: false` AniList GraphQL query filters and is completely unrelated to the ReAnime streaming integration).*

### B. Newly Created Production Files (4 files)
1. [`backend/src/services/streaming/providers/reanime.provider.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/providers/reanime.provider.ts): Implements `StreamingProvider` interface with Node-native WASM crypto extraction.
2. [`backend/src/services/streaming/stream-proxy.service.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/services/streaming/stream-proxy.service.ts): Manages bounded in-memory proxy sessions, SSRF URL allowlisting, XOR manifest unmasking, and SRT→WebVTT subtitle conversion.
3. [`backend/src/controllers/stream-proxy.controller.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/controllers/stream-proxy.controller.ts): Express handlers for master playlist, variant playlist, AES-128 key, media segments, and subtitles.
4. [`backend/src/routes/stream.routes.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/src/routes/stream.routes.ts): Route declarations for `/api/stream/reanime/:sessionId/...`.

### C. Newly Created Test/Verification Files (2 files)
1. [`backend/scripts/verify-production-integration.ts`](file:///home/kimtsuny/Desktop/anime-catalog/backend/scripts/verify-production-integration.ts): Automated verification suite covering 12 test scenarios.
2. [`backend/scripts/reanime-production-integration-report.md`](file:///home/kimtsuny/Desktop/anime-catalog/backend/scripts/reanime-production-integration-report.md): Benchmark and verification execution report.

### D. Untouched Components
- `backend/prisma/schema.prisma`: **UNCHANGED**
- `backend/package.json` & lockfile: **UNCHANGED**
- `backend/src/services/streaming/providers/animeparadise.provider.ts`: **UNCHANGED**
- `backend/src/services/streaming/provider.interface.ts`: **UNCHANGED**
- Frontend watch player & streaming client: **UNCHANGED**

---

## 3. Old Architecture

Prior to ReAnime integration, AniMix relied exclusively on **AnimeParadise** for streaming playback:

```
[User Browser]
      │
      │ 1. GET /api/episodes/:id/stream
      ▼
[episodes.controller.ts (getStream)]
      │
      │ 2. getStream(episodeId)
      ▼
[streaming.service.ts (getStream)]
      │
      │ 3. Query Episode & Provider Mappings from DB
      ▼
[Prisma DB]
      │ Returns: mapping.provider = "animeparadise", providerId = "animeparadise:..."
      ▼
[animeparadise.provider.ts]
      │
      │ 4. animeParadiseProvider.getStream(unitId)
      ▼
[anime-sdk (AnimeParadiseProvider)]
      │ Resolves upstream source URL
      ▼
[stream.mapper.ts (normalizeStreamResult)]
      │
      │ 5. Returns { type: "video", streams: [{ url: "https://external-cdn.../master.m3u8" }] }
      ▼
[episodes.controller.ts] -> HTTP 200 JSON
      ▼
[User Browser (Hls.js)]
      │
      │ 6. Directly requests external CDN
      ▼
[External CDN]
```

### Limitations of Old Architecture
1. **Single Point of Failure**: If AnimeParadise lacked a title (e.g., Sonny Boy, GTO) or upstream scraper failed, `streaming.service.ts` threw `All streaming providers failed for episode ${episodeId}`.
2. **Catalog Blind Spots**: Benchmark revealed AnimeParadise failed on 8/30 representative titles.
3. **No Fallback Path**: The provider array contained `[animeParadiseProvider, gogoanimeProvider]`, but Gogoanime was non-functional/unmapped, resulting in dead-ends.

---

## 4. New Architecture

The new architecture introduces a dual-provider hierarchy with an internal backend playback proxy:

```
[User Browser]
      │
      │ 1. GET /api/episodes/:id/stream
      ▼
[episodes.controller.ts]
      │
      ▼
[streaming.service.ts]
      │
      ├─────────────────────────────────────────────────┐
      │ Primary Attempt                                 │ Fallback (If Primary Fails)
      ▼                                                 ▼
[animeparadise.provider.ts]                     [reanime.provider.ts]
      │                                                 │
      ├─► Success: Returns direct CDN stream            ├─► 1. Query /api/flix/:anilistId/:ep
      │   (Browser plays directly)                      ├─► 2. Extract FlixCloud SSR Data
      │                                                 ├─► 3. Execute WASM Crypto Derivation
      └─► Fail / No Stream                              ├─► 4. Register Session in StreamProxyService
               │                                        │      (Returns /api/stream/reanime/:sess/master.m3u8)
               └────────────────────────────────────────┤
                                                        ▼
                                                [stream.mapper.ts]
                                                        │
                                                        ▼
                                                [episodes.controller.ts]
                                                        │ HTTP 200 JSON
                                                        ▼
                                                [User Browser (Hls.js)]
                                                        │
                                                        │ 2. Fetch /api/stream/reanime/:sessionId/master.m3u8
                                                        ▼
                                                [stream-proxy.controller.ts]
                                                        │
                                                        ├─► XOR Unmask Manifest
                                                        ├─► Rewrite Variant URLs
                                                        ├─► Injects Referer: https://flixcloud.cc/
                                                        ├─► Proxies AES-128 Key (16 bytes)
                                                        ├─► Proxies Segments (Range / 206)
                                                        └─► Proxies Subtitles (SRT → WebVTT)
                                                        │
                                                        ▼
                                                [FlixCloud / RundownCDN]
```

---

## 5. Detailed File-by-File Changes

### 1. `backend/src/services/streaming/streaming.service.ts`
- **What existed before**: `providers` array had `animeParadiseProvider` and `gogoanimeProvider`. `getStream` sorted mappings only by `providerSeasonMappingId`. If all mapped providers failed, it threw an error immediately.
- **What exists now**: 
  - Imports and registers `reanimeProvider`.
  - Sorts mappings so `provider === "animeparadise"` is unconditionally evaluated first.
  - Added fallback block: if primary mappings fail or are empty, extracts `anilistId` and calls `reanimeProvider.getStream("reanime:${anilistId}:${episode.number}")`.
  - On ReAnime success, upserts `EpisodeProviderMapping` for `reanime` so future lookups are cached.
- **Why necessary**: Enables fallback execution without altering existing database records.
- **Status**: Required.

### 2. `backend/src/services/anime/episode.service.ts`
- **What existed before**: `syncSeasonEpisodes` only supported `season.provider === "animeparadise"`. If `season.provider !== "animeparadise"`, it threw `Unsupported episode provider`.
- **What exists now**:
  - Supports `partMapping.provider === "reanime"`.
  - If AnimeParadise returns 0 episodes or has `na_` placeholder, falls back to `reanimeProvider.getEpisodes(String(season.anilistId))`.
  - Persists discovered episodes with `provider: effectiveProvider`.
- **Why necessary**: Allows catalog discovery for titles that AnimeParadise does not possess.
- **Status**: Required.

### 3. `backend/src/controllers/anime.controller.ts`
- **What existed before**: In `getSeasonEpisodes`, if a season was marked `na_`, syncing was skipped entirely, leaving 0 episodes.
- **What exists now**: If `season.anilistId` exists, lazy sync is attempted even if AnimeParadise marked it `na_`, allowing ReAnime to discover episodes.
- **Why necessary**: Prevents AnimeParadise's negative mapping from permanently blocking secondary discovery.
- **Status**: Required.

### 4. `backend/src/app.ts`
- **What existed before**: Mounted `/api/auth`, `/api/favorites`, `/api/episodes`, `/api/anime`.
- **What exists now**: Added `app.use("/api/stream", streamRoutes)`.
- **Why necessary**: Mounts the proxy routing subtree for HLS streaming.
- **Status**: Required.

### 5. `backend/src/services/streaming/providers/reanime.provider.ts` (NEW)
- Implements `StreamingProvider` interface (`name: "reanime"`).
- Implements Node.js dynamic WebAssembly execution (`executeFlixCloudWasm`) for FlixCloud key derivation.
- Supports AniList ID mapping, catalog alias resolution (Suzume `142470` → `142770`), and fuzzy title fallback.
- Registers playback sessions in `StreamProxyService` and returns internal proxy stream URLs.
- **Status**: Required.

### 6. `backend/src/services/streaming/stream-proxy.service.ts` (NEW)
- Provides bounded in-memory session cache (`MAX_SESSIONS = 1000`, `CACHE_TTL_MS = 4 hours`, 10-minute sweep).
- Strict SSRF allowlist validator (`isAllowedUpstreamUrl`).
- XOR manifest recovery using session cryptographic key (`unmaskM3u8`).
- SRT to WebVTT parser (`srtToWebVtt`).
- **Status**: Required.

### 7. `backend/src/controllers/stream-proxy.controller.ts` (NEW)
- Express route controllers for `master.m3u8`, `variant`, `key`, `segment`, and `subtitles`.
- Rewrites internal playlist URLs and forwards HTTP Range headers (`206 Partial Content`).
- **Status**: Required.

### 8. `backend/src/routes/stream.routes.ts` (NEW)
- Defines route paths under `/reanime/:sessionId/...`.
- **Status**: Required.

---

## 6. Streaming Service Flow

### Control Flow Pseudocode
```python
def getStream(episodeId):
    episode = db.findEpisode(episodeId, include=[providerMappings, season.anime])
    if not episode:
        raise NotFound()

    # 1. Primary Provider Sort (AnimeParadise first)
    sortedMappings = sort(episode.providerMappings, key=lambda m: (
        0 if m.provider == "animeparadise" else 1,
        0 if m.providerSeasonMappingId else 1
    ))

    # 2. Try Primary Mappings
    for mapping in sortedMappings:
        provider = registry.find(mapping.provider)
        if not provider: continue
        try:
            raw = provider.getStream(mapping.providerId)
            result = normalize(raw)
            if result.hasValidStreams():
                return result  # AnimeParadise succeeded, EXIT IMMEDIATELY
        except Exception:
            log.warn("Primary provider failed, continuing...")

    # 3. Fallback Evaluation
    anilistId = episode.season.anilistId or episode.season.anime.anilistId
    if anilistId and not attempted(sortedMappings, "reanime"):
        try:
            rawReanime = reanimeProvider.getStream(f"reanime:{anilistId}:{episode.number}")
            result = normalize(rawReanime)
            if result.hasValidStreams():
                # Persist ReAnime mapping for subsequent calls
                db.upsertEpisodeProviderMapping(episodeId, "reanime", f"reanime:{anilistId}:{episode.number}")
                return result
        except Exception as e:
            log.warn(f"ReAnime fallback failed: {e}")

    raise Error("All streaming providers failed")
```

### Analysis
- **Is AnimeParadise truly still Primary?** YES. If an `animeparadise` mapping exists and resolves, ReAnime is never called.
- **Provider Priority**: Priority is currently enforced via code sorting in `streaming.service.ts`.
- **Provider Agnostic Level**: The interface `StreamingProvider` is fully generic. The fallback logic in `streaming.service.ts` is currently specific to ReAnime as the secondary provider.

---

## 7. ReAnime Provider Flow

The ReAnime provider resolves streams in 6 sequential steps:

1. **Mapping & Server Discovery**:
   - Queries `https://reanime.to/api/flix/${anilistId}/${episodeNum}` with `Referer: https://reanime.to/`.
   - If 0 servers return, checks catalog aliases (e.g. Suzume `142470` → `142770`).
   - If still empty, initiates fuzzy title fallback search via `https://reanime.to/api/v1/search?q=${title}`.
2. **FlixCloud Embed Scraping**:
   - Selects subbed server (`HD-1` preferred) and fetches embed page (`https://flixcloud.cc/e/...`).
   - Parses SSR data block containing obfuscation seed, crypto containers, and base64 WASM binary.
3. **FlixCloud Token Handshake**:
   - Performs token exchange with `https://flixcloud.cc/api/m3u8/${token}`.
   - Retrieves video payload and key payload.
4. **WASM Execution & Key Derivation**:
   - Instantiates the extracted WebAssembly binary in Node.js.
   - Derives XOR playlist key (`pkKey`) and AES-256 decryption key via PBKDF2 (`sha256`, 1000 iterations).
   - Decrypts raw video payload using `aes-256-cbc` to obtain upstream CDN master manifest URL.
5. **Session Registration**:
   - Stores `streamUrl`, `pkKey`, and parsed subtitle metadata into `StreamProxyService`.
   - Generates a 128-bit random hex `sessionId`.
6. **Descriptor Return**:
   - Returns `/api/stream/reanime/${sessionId}/master.m3u8` to caller.

---

## 8. Playback Proxy Flow

### Why the Proxy is Mandatory
1. **FlixCloud Referer Check**: The upstream CDN strictly enforces `Referer: https://flixcloud.cc/`. Browsers cannot spoof the `Referer` header from a web application origin without CORS failure or browser security violations.
2. **XOR Manifest Masking**: Upstream `.m3u8` manifests are XOR-scrambled with the dynamically derived `pkKey`. Standard players (Hls.js, ExoPlayer, Safari) crash if fed binary XOR data.
3. **AES-128 Key Access**: Variant playlists reference AES-128 encryption keys hosted on FlixCloud CDN requiring the Referer header.
4. **HLS URL Rewriting**: Upstream variant playlists contain relative or CDN URLs. The proxy rewrites them to internal proxy endpoints so all player requests flow through the authenticated proxy.
5. **SRT Subtitle Incompatibility**: HTML5 `<track>` elements in video players require WebVTT format. Upstream provides SRT with comma millisecond delimiters.

### Proxy Request Sequence Diagram

```
Browser (Hls.js)               Backend Proxy                  FlixCloud CDN
     │                               │                              │
     │ 1. GET .../master.m3u8        │                              │
     ├──────────────────────────────►│ 2. Fetch with Referer        │
     │                               ├─────────────────────────────►│
     │                               │◄─────────────────────────────┤
     │                               │ 3. XOR-unmask manifest       │
     │                               │ 4. Rewrite variants          │
     │◄──────────────────────────────┤                              │
     │                               │                              │
     │ 5. GET .../variant?url=...    │                              │
     ├──────────────────────────────►│ 6. Fetch with Referer        │
     │                               ├─────────────────────────────►│
     │                               │◄─────────────────────────────┤
     │                               │ 7. Rewrite keys & segments   │
     │◄──────────────────────────────┤                              │
     │                               │                              │
     │ 8. GET .../key?url=...        │                              │
     ├──────────────────────────────►│ 9. Fetch with Referer        │
     │                               ├─────────────────────────────►│
     │◄──────────────────────────────┤ (Returns 16-byte key)        │
     │                               │                              │
     │ 10. GET .../segment (Range)   │                              │
     ├──────────────────────────────►│ 11. Forward Range header     │
     │                               ├─────────────────────────────►│
     │◄──────────────────────────────┤ (Returns 206 Partial Cont.)  │
```

---

## 9. Episode & Mapping Changes

1. **Database Schema**: **NO CHANGES**. Existing Prisma tables are completely intact.
2. **Provider Mappings**:
   - `EpisodeProviderMapping` has a unique compound key `@@unique([episodeId, provider])`.
   - When ReAnime is used, an entry with `provider = "reanime"` is created.
   - The existing `provider = "animeparadise"` mapping remains untouched.
3. **Season Mapping**:
   - If an entire season has 0 episodes on AnimeParadise (marked `na_`), `episode.service.ts` updates `season.provider = "reanime"`, allowing episode lists to populate.
4. **Season/Episode Selection Integrity**:
   - Episode numbers align directly with canonical episode numbering (`number: 1, 2, 3...`).
   - Phase 3 multi-part mapping logic is fully preserved.

---

## 10. Frontend Impact

- **Frontend Code Modified**: **0 lines modified for streaming**.
- **Player Compatibility**: The frontend video player ([`WatchPlayer.tsx`](file:///home/kimtsuny/Desktop/anime-catalog/frontend/features/watch/components/WatchPlayer/WatchPlayer.tsx)) uses standard Hls.js. Because `/api/stream/reanime/:sessionId/master.m3u8` adheres to RFC 8216 HLS standards, Hls.js loads and plays the stream transparently.
- **Subtitles**: Subtitle tracks are delivered as standard WebVTT (`text/vtt; charset=utf-8`) with `WEBVTT` headers, matching the frontend's native `<track>` element expectations.
- **Navigation & Switching**: Episode switching and season switching continue using `episodeId` routes without page reloads.

---

## 11. Security & SSRF Analysis

### Inspection of `isAllowedUpstreamUrl`
```typescript
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
```

### Threat Vector Evaluation

| Attack Vector | Input Tested | Result | Verdict |
| :--- | :--- | :--- | :--- |
| **Arbitrary Domain** | `https://evil.com/stream.m3u8` | Parsed hostname `evil.com` rejected | **BLOCKED** |
| **Substring Deception** | `https://evil-flixcloud.cc/stream.m3u8` | Does not end with `.flixcloud.cc` | **BLOCKED** |
| **Insecure Scheme** | `http://flixcloud.cc/stream.m3u8` | `protocol !== 'https:'` | **BLOCKED** |
| **Userinfo Bypass** | `https://flixcloud.cc@evil.com/` | WHATWG parser extracts `evil.com` | **BLOCKED** |
| **Localhost / Private IP** | `https://127.0.0.1/` / `https://169.254.169.254/` | IP hostname rejected | **BLOCKED** |
| **Missing Session ID** | Request to `/api/stream/reanime/invalid/variant` | Unknown session triggers 400/404 | **BLOCKED** |
| **HTTP Redirects** | Upstream 302 to internal IP | Node `fetch` follows redirects by default | **NEEDS HARDENING** |

### Security Verdict: **PARTIALLY SECURE (STRONG VALIDATION, NEEDS HARDENING ON REDIRECTS)**
- Direct URL input validation is robust and mathematically sound against domain spoofing.
- **Hardening Recommendation**: Node.js `fetch` in `stream-proxy.controller.ts` should specify `redirect: "manual"` or `redirect: "error"` to prevent an allowed CDN edge from redirecting the backend proxy to an internal network address (e.g. AWS metadata endpoint).

---

## 12. Session & Cache Analysis

- **Storage Medium**: In-memory `Map<string, ProxySession>`.
- **Capacity**: Bounded at `1,000` concurrent sessions.
- **Eviction Policy**: FIFO eviction on reaching capacity limit (`SESSIONS.delete(oldestKey)`).
- **TTL**: 4 hours (`CACHE_TTL_MS = 14,400,000 ms`). Bounded well within FlixCloud's 6-hour JWT token expiration.
- **Sweeper**: Periodic timer runs every 10 minutes (`unref()` background interval).
- **Session Predictability**: Uses 16 bytes of cryptographically secure random entropy (`crypto.randomBytes(16).toString("hex")` = $2^{128}$ possibilities). Impossible to brute-force or guess.
- **Data Isolation**: Raw upstream token URLs and master encryption keys are kept in server memory; only proxy session tokens are exposed to the client.
- **Persistence**: Sessions do not survive process restarts.
- **Clustering Limitation**: Does not synchronize across multiple separate Node processes unless sticky sessions or Redis are introduced.

---

## 13. Regression Analysis

All test suites executed with 100% pass rates:

1. **TypeScript Typecheck**:
   - `npm run typecheck` (`tsc --noEmit`): **0 errors**.
2. **Existing Mapping Unit Tests**:
   - `src/services/anime/mapping/__tests__/matching-engine.test.ts`: **31/31 passed, 0 failures**.
3. **Primary Provider Regressions**:
   - **Death Note**: AnimeParadise search and stream resolution verified active. AnimeParadise remained primary.
   - **One Piece**: AnimeParadise search and stream resolution verified active. AnimeParadise remained primary.
4. **ReAnime Target Suite**:
   - GTO, Sonny Boy, Your Name, A Silent Voice, Suzume, Death Note, One Piece all resolved successfully.
   - Shouwa Genroku Rakugo Shinjuu cleanly rejected (0 servers available) without unhandled exceptions.

---

## 14. Remove-ReAnime Analysis

If the decision is made to remove ReAnime completely, the codebase can be restored to its exact previous state in minutes:

### Steps to Remove
1. **Delete 4 New Source Files**:
   - `backend/src/services/streaming/providers/reanime.provider.ts`
   - `backend/src/services/streaming/stream-proxy.service.ts`
   - `backend/src/controllers/stream-proxy.controller.ts`
   - `backend/src/routes/stream.routes.ts`
2. **Delete Test Scripts & Reports**:
   - `backend/scripts/verify-production-integration.ts`
   - `backend/scripts/reanime-production-integration-report.md`
   - `backend/scripts/reanime-integration-code-audit.md`
3. **Revert 4 Modified Files**:
   - `backend/src/app.ts`: Remove `/api/stream` route mount.
   - `backend/src/services/streaming/streaming.service.ts`: Remove `reanimeProvider` import, registration, and lines 124–176 fallback logic.
   - `backend/src/services/anime/episode.service.ts`: Remove `reanime` branch in `syncSeasonEpisodes`.
   - `backend/src/controllers/anime.controller.ts`: Revert `isMarkedNoContent` condition in `getSeasonEpisodes`.
4. **Database Cleanup**:
   - Run: `DELETE FROM "EpisodeProviderMapping" WHERE provider = 'reanime';`
   - Run: `UPDATE "AnimeSeason" SET provider = 'animeparadise' WHERE provider = 'reanime';`

**Conclusion**: The integration is completely modular and leaves no irreversible database schema changes, migrations, or frontend coupling.

---

## 15. Architectural Assessment

| Area | Rating | Justification |
| :--- | :--- | :--- |
| **Separation of Concerns** | **GOOD** | Clear boundaries between provider extraction, proxy forwarding, session caching, and route handling. |
| **Coupling** | **ACCEPTABLE** | `streaming.service.ts` contains an explicit fallback branch for ReAnime instead of an abstract fallback pipeline. Suitable for a 2-provider integration, but would need generalization for 3+ providers. |
| **Provider Abstraction** | **GOOD** | Strictly implements `StreamingProvider` (`search`, `getEpisodes`, `getStream`) without leaky abstractions. |
| **Maintainability** | **GOOD** | Code is modular, strongly typed, and well documented with explicit error logging. |
| **Error Handling** | **GOOD** | Upstream provider failures and empty catalogs are caught and handled gracefully without process termination. |
| **Caching** | **ACCEPTABLE** | Bounded in-memory session cache with conservative TTL works well for single instances; requires Redis for horizontal scaling. |
| **Scalability** | **NEEDS ATTENTION** | In-memory session store does not support multi-instance deployments behind a round-robin load balancer. |
| **Security** | **PARTIALLY SECURE** | URL allowlisting and session entropy are strong, but `fetch` redirect handling should be set to `manual`. |
| **Observability** | **ACCEPTABLE** | Clear console logs for major lifecycle events; structured JSON logging would improve production tracing. |
| **Testability** | **GOOD** | Ephemeral server testing verified end-to-end proxy behavior, crypto derivation, Range requests, and SSRF. |

---

## 16. What Changed and Why

### Summary Table of Production Changes

| File | Change | Reason | Impact | Risk |
| :--- | :--- | :--- | :--- | :--- |
| `streaming.service.ts` | Added ReAnime fallback and primary sorting | AnimeParadise does not cover all anime titles | Requests for failed primary titles now succeed via fallback | Slightly increased code complexity in streaming resolution |
| `episode.service.ts` | Added ReAnime episode discovery in `syncSeasonEpisodes` | AnimeParadise had missing episodes or `na_` entries | Populates episode lists for unmapped seasons | Seasons with no AnimeParadise coverage point to ReAnime |
| `anime.controller.ts` | Allowed lazy sync when `season.anilistId` exists | Seasons marked `na_` were previously permanently locked | Enables secondary provider to attempt discovery | Small extra DB query on unmapped seasons |
| `app.ts` | Mounted `/api/stream` router | Required to expose proxy endpoints | Enables browser to fetch proxied playlists and segments | Opens new routing namespace under `/api/stream` |
| `reanime.provider.ts` | Created new provider implementation | Required to interface with ReAnime and FlixCloud | Handles native WASM extraction and returns stream descriptors | Dependent on upstream FlixCloud API stability |
| `stream-proxy.service.ts` | Created session manager & unmasker | Browser cannot directly play XOR-masked FlixCloud streams | Unmasks manifests, validates URLs, and stores sessions | In-memory sessions lost on server restart |
| `stream-proxy.controller.ts` | Created proxy HTTP endpoints | Client needs to proxy playlists, keys, and segments | Injects Referer and forwards Range requests | Proxy network bandwidth flows through backend |
| `stream.routes.ts` | Defined Express stream routes | Connects controller handlers to URLs | Routes `/api/stream/reanime/...` | Minimal |

---

## 17. Complete Request Flow (End-to-End)

```
[1. User clicks Episode 1 on Watch Page]
             │
             ▼
[2. Frontend: GET /api/episodes/:id/stream]
             │
             ▼
[3. episodes.controller.ts -> streamingService.getStream(episodeId)]
             │
             ▼
[4. Query DB for episode provider mappings]
             │
             ├─► AnimeParadise mapping exists & playable?
             │         YES ──► Return direct CDN stream (Primary)
             │
             └─► NO / FAILED
                       │
                       ▼
[5. ReAnime Fallback: reanimeProvider.getStream("reanime:245:1")]
                       │
                       ├─► Check in-memory stream cache
                       ├─► Query https://reanime.to/api/flix/245/1
                       ├─► Scrape FlixCloud embed page
                       ├─► Execute WASM in Node.js & derive keys
                       ├─► Create ProxySession (UUID, streamUrl, pkKey, subtitles)
                       └─► Return sourceUrl: "/api/stream/reanime/:sessId/master.m3u8"
                       │
                       ▼
[6. StreamingService upserts EpisodeProviderMapping('reanime')]
                       │
                       ▼
[7. Return HTTP 200 JSON with stream & subtitle descriptor to Browser]
                       │
                       ▼
[8. Browser Hls.js loads: /api/stream/reanime/:sessId/master.m3u8]
                       │
                       ▼
[9. Proxy unmasks XOR master playlist & rewrites variant URLs]
                       │
                       ▼
[10. Browser Hls.js loads: /api/stream/reanime/:sessId/variant?url=...]
                       │
                       ▼
[11. Proxy unmasks variant playlist & rewrites key & segment URLs]
                       │
                       ▼
[12. Browser Hls.js fetches: /api/stream/reanime/:sessId/key?url=...]
                       │
                       ▼
[13. Proxy injects Referer: https://flixcloud.cc/, returns 16-byte key]
                       │
                       ▼
[14. Browser Hls.js fetches: /api/stream/reanime/:sessId/segment?url=... (Range)]
                       │
                       ▼
[15. Proxy injects Referer & Range header, returns 206 MPEG-TS segment]
                       │
                       ▼
[16. Browser Hls.js decrypts segment with AES-128 key -> Video Plays Smoothly 🎬]
```

---

## 18. Remaining Risks

1. **Clustering & Horizontal Scaling**: In a multi-node backend deployment behind a standard load balancer, proxy requests may land on a node that did not create the in-memory session. Mitigations: sticky sessions or moving session storage to Redis.
2. **Upstream Obfuscation Updates**: FlixCloud occasionally updates their obfuscation seeds and WASM routines. If updated, the extraction logic in `reanime.provider.ts` would need an update.
3. **Bandwidth Proxying**: Because media segments pass through the backend proxy (due to FlixCloud's Referer restriction), backend server network egress will scale linearly with active concurrent viewers on ReAnime streams.
4. **HTTP Redirects in Proxy**: Node `fetch` follows redirects by default. Hardening `redirect: "manual"` is recommended.

---

## 19. Recommended Follow-up Work

1. **Harden Redirect Handling**: Add `{ redirect: "error" }` or `{ redirect: "manual" }` to upstream `fetch` calls in `stream-proxy.controller.ts`.
2. **Generalized Fallback Chain**: Refactor the hardcoded fallback block in `streaming.service.ts` into a declarative provider pipeline (`[AnimeParadise, ReAnime, MegaPlay]`).
3. **Distributed Session Store**: If deploying multiple backend replicas, migrate `StreamProxyService`'s session store to Redis.

---

## 20. Final Summary

The ReAnime secondary provider integration is **verified, stable, fully functional, and cleanly isolated**. 
- AnimeParadise remains the strict primary provider.
- ReAnime recovers gaps only when AnimeParadise fails.
- The playback proxy successfully unmasks XOR manifests, proxies AES-128 keys, and forwards Range requests.
- No database migrations, schema alterations, or frontend modifications were introduced.

**NO FILES WERE MODIFIED DURING THIS AUDIT.**
