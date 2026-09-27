# MKissa / AllAnime Direct API Proof-of-Concept Report

**Project:** AniMix  
**Date:** September 27, 2026  
**Investigation Target:** Direct API communication with MKissa / AllAnime (`api.mkissa.net` & `api.allanime.day`) without `anime-sdk@1.1.0`, without browser automation, and without CAPTCHA solvers.  
**Result Status:** `NOT_FEASIBLE_CURRENTLY`

---

## 1. Executive Summary

This investigation tested whether AniMix can bypass the broken `anime-sdk@1.1.0` implementation and directly query the active MKissa / AllAnime backend to retrieve playable HLS/MP4 streams from Node.js without requiring headless browsers, CAPTCHA solvers, or Cloudflare bypass proxies.

### Definitive Answer to Core Question:
> **No.** AniMix **cannot** reliably communicate with the current MKissa/AllAnime backend to obtain playable HLS/MP4 streams without browser execution or CAPTCHA/challenge handling.

### Key Technical Findings:
1. **API Endpoints Reachable for Metadata Only**:
   * Both `https://api.mkissa.net/api` and `https://api.allanime.day/api` accept direct HTTP POST GraphQL requests without Cloudflare blocking the API gateway itself.
   * Search queries and episode manifest listings (`availableEpisodesDetail`) succeed in ~100–120ms.
2. **Stream Endpoints Completely Gated by `AA_CRYPTO_MISSING`**:
   * Any request to resolve episode video sources (`episode { sourceUrls }`) is strictly rejected with `AA_CRYPTO_MISSING`.
   * The server refuses to return source URLs unless a cryptographically signed token (`aaReq`) is supplied inside the GraphQL `extensions` payload.
3. **The `aaReq` Mechanism Is an Obfuscated Anti-Scraping Challenge**:
   * By inspecting the active client bundle (`https://cdn.mkissa.net/all/mk/_app/immutable/chunks/DgFeFwm7.js`), we reversed the entire `[aa-crypto]` client architecture.
   * `aaReq` is a dynamically computed AES-256-GCM token requiring runtime extraction of build masks, dynamic bootstrap requests (`"x-aa-boot"`), and time-bucketed SHA-256 IV derivation.
   * Open-source tools (e.g. `ani-cli`, `GoAnime`) that attempted to reverse-engineer this dynamic derivation repeatedly broke and ultimately **removed AllAnime support entirely** due to the unsustainable maintenance burden.
4. **Cloudflare & Turnstile Protection**:
   * Individual episode player pages (e.g. `https://mkissa.to/anime/6aa5e2b2be0758515ec1ed72/p-1-sub`) return **HTTP 403 Forbidden** with active Cloudflare Turnstile challenges (`https://challenges.cloudflare.com`).
   * The client bundle explicitly integrates reCAPTCHA and Cloudflare Turnstile for challenge fallbacks.

---

## 2. Current API Endpoints

Through live probing and code analysis of the Svelte frontend, the active backend endpoints were mapped:

| Endpoint | Protocol | Direct Node Access? | Cloudflare Status | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| `https://api.mkissa.net/api` | GraphQL (POST) | **YES** | Unblocked on POST | Primary API gateway |
| `https://api.allanime.day/api` | GraphQL (POST) | **YES** | Unblocked on POST | Mirror API gateway |
| `https://cdn.mkissa.net/all/mk/...` | HTTPS (GET) | **YES** | Unblocked | Static client assets & JS chunks |
| `https://mkissa.to/` | HTTP/HTML (GET) | **YES** | Unblocked | Main frontend homepage |
| `https://mkissa.to/anime/...` | HTTP/HTML (GET) | **NO** | **HTTP 403 (Turnstile)** | Episode player page |

---

## 3. Current Request Protocol

### Working Operations (Search & Episode Manifests):
* **Method**: `POST`
* **Headers**:
  ```http
  Content-Type: application/json
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0
  Referer: https://mkissa.to/
  Origin: https://mkissa.to
  ```
* **Payload**: Standard GraphQL JSON:
  ```json
  {
    "query": "query ($showId: String!) { show(_id: $showId) { _id name availableEpisodesDetail } }",
    "variables": { "showId": "6aa5e2b2be0758515ec1ed72" }
  }
  ```
* **Status**: Returns `200 OK` with full catalog metadata in ~110ms.

### Blocked Operation (Episode Video Stream Sources):
* **Payload**:
  ```json
  {
    "query": "query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId translationType: $translationType episodeString: $episodeString) { episodeString sourceUrls } }",
    "variables": { "showId": "6aa5e2b2be0758515ec1ed72", "translationType": "sub", "episodeString": "1" }
  }
  ```
* **Server Response**:
  ```json
  {
    "errors": [
      {
        "message": "AA_CRYPTO_MISSING",
        "extensions": { "code": "AA_CRYPTO_MISSING" }
      }
    ],
    "data": { "episode": null }
  }
  ```

---

## 4. `aaReq` Deep-Dive Investigation

Reversing `https://cdn.mkissa.net/all/mk/_app/immutable/chunks/DgFeFwm7.js` revealed the exact algorithm the client uses to construct `aaReq`:

### Architecture of `aaReq`:
1. **Content Lane Identification**:
   * Video episodes use content lane `cp = "k7"`.
   * Chapter pages use `_y = "k9"`.
   * Music tracks use `vy = "k2"`.
2. **Build-Specific Bootstrap**:
   * The client extracts the active `buildId` (`Pr`) from the frontend bundle.
   * It sends a GET request to a dynamic bootstrap URL (`aT`) with headers:
     * `"x-build-id": Pr`
     * `"x-aa-boot": uT(...)` (an obfuscated token generated from epoch, referer host, and lane).
   * The bootstrap response returns `{ epoch, partB, switchAt }`.
3. **Key Derivation (`kT`)**:
   * The client derives a mask `py(Pr)` from the current build.
   * It base64-decodes `partB` and executes a byte-level XOR against the mask:
     ```javascript
     const a = new Uint8Array(32);
     for (let i = 0; i < 32; i++) {
       a[i] = partB_bytes[i] ^ mask[i % mask.length];
     }
     ```
   * This yields a 256-bit AES key.
4. **Token Generation (`NT`)**:
   * Computes a 5-minute time bucket: `ts = Math.floor(Date.now() / 300000) * 300000`.
   * Computes a 12-byte IV using SHA-256: `CT(epoch, buildId, queryHash, ts, lane)`.
   * Builds the plaintext payload:
     ```json
     { "v": 1, "ts": 1727431200000, "epoch": 12345, "buildId": "...", "qh": "<queryHash>", "k": "k7" }
     ```
   * Encrypts the payload using **AES-GCM** with the derived key and IV.
   * Formats the final `aaReq` string as base64: `[Version 1 Byte (0x01)] + [12-byte IV] + [AES-GCM Ciphertext + Tag]`.
5. **GraphQL Transmission**:
   * `aaReq` is placed inside the GraphQL `extensions` parameter:
     ```json
     {
       "extensions": {
         "persistedQuery": { "version": 1, "sha256Hash": "..." },
         "aaReq": "<base64_blob>",
         "k": "k7"
       }
     }
     ```

### Why Re-implementing This in AniMix Backend Is Unviable:
* **Hostile Drift**: The build ID, mask algorithms, chunk hashes, and bootstrap headers are continuously updated by AllAnime's frontend pipeline.
* **Anti-Scraping Traps**: The code contains explicit countermeasures against scraper environments (e.g. `aaJp0` iframe-realm JSON protection against Tachiyomi).
* **High Maintenance / Tech Debt**: Any custom scraper would break every time AllAnime deploys a new frontend build.

---

## 5. Cloudflare & CAPTCHA Behavior

| Target | Probed Behavior | Classification |
| :--- | :--- | :--- |
| **`mkissa.to` (Homepage)** | Returns HTTP 200 OK (Svelte root) | `DIRECT_API_ACCESS` |
| **`mkissa.to/anime/...`** | Returns HTTP 403 with Turnstile challenge | `CLOUDFLARE_BLOCK` |
| **`api.mkissa.net/api`** | Unblocked on POST; rate limits after 3 fast requests | `DIRECT_API_ACCESS` / Rate Limited |
| **`api.allanime.day/api`** | Unblocked on POST; identical behavior to mkissa.net | `DIRECT_API_ACCESS` / Rate Limited |
| **`cdn.mkissa.net`** | Serves static JS chunks without challenge | `DIRECT_API_ACCESS` |

### CAPTCHA Triggers:
When multiple episode requests are sent within ~3 seconds, the API immediately responds with:
```json
{
  "errors": [
    {
      "message": "Too many requests, please try again in 5 seconds.",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "exception": { "message": "Too many requests, please try again in 5 seconds." }
      }
    }
  ]
}
```
Furthermore, the client bundle contains fallback branches checking for `extensions.captcha` and integrating `challenges.cloudflare.com/turnstile` and Google reCAPTCHA.

---

## 6. Source Resolution & Playable Streams

* **Direct M3U8/MP4 Availability**: **0%**. No direct media URLs can be obtained from either `api.mkissa.net` or `api.allanime.day` without a valid `aaReq`.
* **HTML Scraping of MKissa**: Fails with HTTP 403. Even if fetched via a browser, MKissa does not expose static `.m3u8` links in raw HTML; it renders via client-side JavaScript.
* **Stream Deliverability**: It is technically impossible for a vanilla Node.js backend to extract direct streams from MKissa without a headless browser or maintaining the dynamic crypto bootstrap.

---

## 7. Subtitle and Quality Capabilities

* **Subtitles**: The direct GraphQL schema does not expose external WebVTT or SRT subtitle tracks. The AllAnime ecosystem relies on client-side hardsubs or player-embedded tracks.
* **Arabic Subtitles**: Completely absent.
* **Quality Options**: Because stream resolution is blocked at the source lookup step, no quality renditions (1080p, 720p, etc.) could be retrieved.

---

## 8. Test Dataset Results

| Title | Show ID | Metadata Result | Episode Count | Stream Source Result | Failure Error Code |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **One Piece** | `ReooPAxPMsHM4KPMY` | **SUCCESS** | 1,180 | **BLOCKED** | `AA_CRYPTO_MISSING` |
| **Death Note** | `RezHft5pjutwWcE3B` | **SUCCESS** | 37 | **BLOCKED** | `AA_CRYPTO_MISSING` |
| **Ghost Meets Gal!** | `6aa5e2b2be0758515ec1ed72` | **SUCCESS** | 4 | **BLOCKED** | `AA_CRYPTO_MISSING` |
| **Spirited Away** (Movie) | `CSi9oF8YudfHuKvod` | **SUCCESS** | 1 | **BLOCKED** | `AA_CRYPTO_MISSING` |

*(Note: When queried in rapid succession, the backend temporarily throws `Too many requests, please try again in 5 seconds` before reverting to `AA_CRYPTO_MISSING`)*.

---

## 9. Direct Comparison: `anime-sdk@1.1.0` vs Direct API

| Feature / Step | `anime-sdk@1.1.0` | Direct MKissa API (`api.mkissa.net`) |
| :--- | :---: | :---: |
| **Search Query** | Functional | Functional |
| **Episode Listing** | Functional | Functional |
| **Source Lookup** | **Failed (Throws error)** | **Failed (`AA_CRYPTO_MISSING`)** |
| **`aaReq` Support** | **Not implemented** | **Required by server** |
| **Playable Stream** | **None (0%)** | **None (0%)** |
| **M3U8 Retrieval** | None | None |
| **Cloudflare Handling** | None | Blocked on player pages (HTTP 403) |
| **CAPTCHA / Rate Limits** | Unhandled | Aggressive 5s IP throttle |
| **Arabic Subtitles** | None | None |
| **1080p Stream** | None | None |

---

## 10. Security & Reliability Risks

1. **Anti-Scraping Arms Race**: Attempting to implement the dynamic AES-GCM crypto bootstrap locally in AniMix would couple our backend to an external site's minified build artifacts.
2. **IP Blacklisting & Rate-Limiting**: The API aggressively throttles concurrent episode queries (`Too many requests in 5 seconds`). In a multi-user environment like AniMix, server-side stream resolution would rapidly trigger IP bans or Turnstile challenges.
3. **Domain Instability**: Community records and security threat databases indicate frequent infrastructure changes, domain migrations (`allanime.to` → `allanime.day` → `mkissa.to` → `mkissa.net`), and hostile takeover events.

---

## 11. Custom Provider Feasibility Determination

### Verdict: **`NOT_FEASIBLE_CURRENTLY`**

**Reasoning:**
The AllAnime/MKissa API enforces an actively obfuscated dynamic cryptographic token (`aaReq`) generated from transient frontend build artifacts, blocks player pages behind Cloudflare Turnstile, strictly throttles IP request velocity, and provides no standalone subtitle tracks. Implementing this in AniMix without headless browser automation or continuous scraper maintenance is unviable.

---

## 12. Recommended Next Step

1. **Abandon AllManga / MKissa for Stream Resolution**: Do not build a custom `MkissaProvider` and do not replace `AnimeParadise` with AllManga.
2. **Retain AnimeParadise as Primary**: AnimeParadise continues to provide direct, working HLS streams with English WebVTT subtitles on ~98.4% of its catalog.
3. **Bridge Movies & Niche Gaps with Gogoanime**:
   * As identified in the initial benchmark, AnimeParadise's primary gap is missing theatrical movies and older niche titles.
   * Gogoanime (already defined in `backend/src/services/streaming/providers/gogoanime.provider.ts`) natively covers theatrical films and older classics with direct HLS/MP4 streams and no dynamic crypto requirements.
4. **Implement Provider Registry Architecture**: Decouple the backend from hardcoded `"animeparadise"` references so AnimeParadise remains primary and Gogoanime acts as the fallback for titles AnimeParadise cannot resolve.
