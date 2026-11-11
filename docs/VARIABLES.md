# OPENFIT — Configuration & Secrets

All variables are consumed by `api/server.js` at startup unless noted. Frontend build-time vars are bundled into the shipped JS — treat them as public.

---

## API server variables

| Name | Code ref | Scope | Source | Default | Risk | Notes |
|------|----------|-------|--------|---------|------|-------|
| `PORT` | server.js:13 | server | env | `3000` | none | TCP port |
| `DATA_DIR` | server.js:14 | server | env | `/data` | medium | Root of all persistent data; must be a writable volume |
| `RP_ID` | server.js:15 | server | env | `localhost` | high | WebAuthn relying party ID — must match the domain users visit |
| `ORIGIN` | server.js:16 | server | env | `http://localhost:8080` | high | WebAuthn expected origin — must match scheme+host+port users visit |
| `RP_NAME` | server.js:17 | server | env | `openfit` | none | Display name in passkey browser dialog |
| `ADMIN_UIDS` | server.js:20 | server | env | _(empty)_ | **critical** | Comma-separated user IDs with admin access; takes effect immediately on change |
| `INVITE_ONLY` | server.js:21 | server | env | `false` | medium | `1/true/yes/on` = new registrations require an invite code |
| `SESSION_DAYS` | server.js:26 | server | env | `90` | medium | Cookie max-age in days (min 1); only affects newly minted cookies |
| `REQUIRE_UV` | server.js:30 | server | env | unset | medium | `1` = passkey user verification required; unset = preferred only (startup warning) |
| `VAPID_SUBJECT` | server.js:97 | server | env | `mailto:admin@localhost` (HTTP) or ORIGIN (HTTPS) | low | Web Push service contact URI |

---

## Secrets (generated and stored in DATA_DIR)

| File | Purpose | Rotation | Risk |
|------|---------|----------|------|
| `./data/secret` | HMAC-SHA256 key for signing session cookies | Delete file; next restart regenerates and **invalidates all existing sessions** | **critical** — if leaked, attacker can forge valid session cookies for any uid |
| `./data/vapid.json` | VAPID public/private key pair for Web Push | Delete file; next restart regenerates; existing push subscriptions must re-subscribe | medium — if private key leaked, attacker can send push notifications to any subscriber |
| `./data/db.json` | User accounts, passkey credentials, push subs, invites | Not a secret per se; contains passkey public keys + usernames | high — leaking it exposes all usernames and credential IDs |

---

## Frontend build-time variables (public, bundled into JS)

| Name | Used by | Default | Notes |
|------|---------|---------|-------|
| `VITE_MOBILE` | `lib/mobile.js`, `lib/labs/ocr.js` | unset | `1` for the Android build (set in `frontend/.env.mobile`, loaded by `npm run build:mobile` = `vite build --mode mobile && cap sync`) |
| `VITE_IMG_BASE` / `VITE_GIF_BASE` | `lib/exercises.js` | `img/` / `gif/` | Android: jsDelivr URLs pinned to one commit of `hasaneyldrm/exercises-dataset` (`.env.mobile`) |
| `VITE_DEMO` | `lib/demo.js` | unset | `1` = demo build, seeds example data on first load, no backend |
| `API_TARGET` / `MEDIA_TARGET` | `vite.config.js` (dev server proxy only) | `http://127.0.0.1:3000` / `:8888` | not bundled |
| `__ORT_RUNTIME__` (define) | `vite.config.js` → `lib/vision/runtime.js` | computed | onnxruntime-web version + byte size + SHA-256 of `ort-wasm-simd-threaded.asyncify.{mjs,wasm}` read from `node_modules` at build time. Changing the installed onnxruntime-web changes the pins. |
| `__APP_VERSION__` (define) | `vite.config.js` → Settings | `frontend/package.json` version | shown in Settings |

No secret values are injected into the frontend bundle.

## Pinned constants in app code (change only deliberately)

| Constant | Where | Value / rule | Risk if changed carelessly |
|---|---|---|---|
| Food model repo + revision + per-file bytes/SHA-256 | `lib/vision/catalog.js` `MODELS.food101` | `onnx-community/swin-finetuned-food101-ONNX` at a fixed commit; int8 + q4f16 hashes | wrong hash = model never verifies; dropping the hash = unverified weights |
| `RUNTIME_BYTES` | `lib/vision/catalog.js` | 26,861,777 (shown in download size only) | cosmetic |
| ONNX runtime CDN URL | `lib/vision/runtime.js` | `cdn.jsdelivr.net/npm/onnxruntime-web@<version>/dist/…` | must stay inside CSP `connect-src` |
| Tesseract assets | `vite.config.js` `OCR_FILES` → emitted under `ocr/` | `worker.min.js`, `tesseract-core-simd-lstm.wasm.js`, `eng.traineddata.gz` (`4.0.0_best_int`); Android reads it ungzipped (`gzip: !MOBILE`) | OCR breaks offline or starts fetching |
| Import limits | `lib/mobile.js` `MAX_IMPORT_BYTES`; `views/Labs.jsx` `MAX_FILE`; `lib/labs/ocr.js` `MAX_PHOTO_PX` | 20 MB text imports; 25 MB lab file; 120 MP photo; PDF text ≤ 30 pages, OCR ≤ 6 pages | WebView memory crashes |
| Server body limit | `api/server.js` `MAX_BODY` | 5 MB | larger states don't sync |
| Android version | `android/app/build.gradle` | `versionCode` 18, `versionName` 1.6.2 (= `frontend/package.json`) | `versionCode` must strictly increase or the APK won't install over the previous one |

## Device-side storage (no secrets; health data)

| Key / store | Where | Holds |
|---|---|---|
| `localStorage['gym_state_v1']` | `store/useStore.js` | full app state `S` |
| `openfit-state.json` (`Directory.Data`) | `lib/mobile.js` (Android only) | durable mirror of `S`; legacy `opengym-state.json` still read |
| `gym_base`, `gym_dirty`, `gym_user`, `gym_guest` | `store/useStore.js` | sync base `_ts`, unsent-changes flag, signed-in user, guest mode |
| `openfit.vision.verified.<model>.<device>` | `lib/vision/client.js` | model revision verified after download |
| Cache `transformers-cache` | transformers.js | food model files |
| Cache `openfit-ort-<version>` | `lib/vision/runtime.js` | verified ONNX runtime |
| Cache `openfit-media-v1` | `lib/media-cache.js` | planned exercises' pictures/animations |
| Cache `opengym-rt-v1` | `public/sw.js` (web only) | app shell + media; its activate step deletes every other cache |
| Export file in `Directory.Cache` | `lib/mobile.js shareExport` | latest backup/plan export only |

## Android signing (no values in the repo)

Release signing reads `frontend/android/keystore.properties` (git-ignored: `frontend/android/.gitignore`), which names the keystore file, a password file and the alias. Without it the release build is unsigned rather than failing. Never commit the keystore, the properties file or the password file. Updates must be signed with the same key or Android refuses to install over the old app.

---

## Rate-limit and proxy variables (API)

| Name | Code ref | Scope | Source | Default | Risk | Notes |
|------|----------|-------|--------|---------|------|-------|
| `RATE_LIMIT_MAX` | server.js | server | env | `20` | none | Max auth requests per IP per 60s (fallback; reverse proxy's limit takes precedence) |
| `TRUST_PROXY` | server.js | server | env | `0` when unset; Docker Compose sets `1` | medium | Number of trusted proxies in front of the API (`true` = 1). The rate limiter reads the `X-Forwarded-For` entry that many places from the right; entries further left are client-supplied and ignored. Too high = spoofable; too low = all users share one bucket. |

---

## Pre-go-live checklist

### Required for any deployment

- [ ] `RP_ID` set to the public domain
- [ ] `ORIGIN` set to the HTTPS origin
- [ ] `DATA_DIR` points to a persistent, backed-up volume
- [ ] `ADMIN_UIDS` set to your user ID after first registration
- [ ] `./data/secret` and `./data/vapid.json` not committed to version control

### Required for internet-facing / multi-user deployments

- [ ] **Rate limiting — HARD REQUIREMENT.** The API has an in-process fallback (20 req/60s per IP via `RATE_LIMIT_MAX`), but a nginx or Caddy reverse proxy MUST be configured in front and MUST enforce rate limits on `/api/register/*` and `/api/login/*` before the instance is exposed to the internet. Without a reverse-proxy rate limit, a single attacker IP behind NAT (sharing one address with many users) could exhaust the in-process window. Set `TRUST_PROXY=1` and configure nginx to pass `X-Forwarded-For` once the reverse proxy is in place.

- [ ] **`user.admin` db flag — CRITICAL security audit.** `db.json` contains an optional `"admin": true` flag on user entries (see `isAdmin()` in `server.js`). A user with this flag has full admin access regardless of `ADMIN_UIDS`. **Before deployment:** inspect `./data/db.json` and confirm no user has `"admin": true` unless deliberately intended. Ensure `./data/db.json` is never stored in a publicly accessible location. Backups of `db.json` must be stored securely — a leaked backup with `"admin": true` on any user is an immediate privilege escalation risk.

### Optional but recommended

- [ ] `INVITE_ONLY=true` if you want to control who can register
- [ ] nginx / reverse proxy enforces TLS termination
- [ ] nginx serves a strong `Content-Security-Policy` header
- [ ] `SESSION_DAYS` set to a shorter window for a shared/family instance (default 90 days)
- [ ] `TRUST_PROXY=1` once nginx is in place (enables per-real-IP rate limiting)

---

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview
- [FLOWS.md](FLOWS.md) — session cookie lifecycle
- [PERMISSIONS.md](PERMISSIONS.md) — how `ADMIN_UIDS` and `INVITE_ONLY` affect access
