# OPENFIT — fitness, nutrition and blood-test tracker (PWA + Android)

## What this is
One React codebase, two products:
- **Android app** (`VITE_MOBILE=1`, Capacitor 7): standalone, no account, no server. All health data (workouts, body weight, meals, lab reports) stays on the phone in `openfit-state.json` + localStorage.
- **Self-hosted web app**: the same UI against a small Node API (passkeys, per-user JSON state, food-search proxy, Web Push).

Stack: **React 19 + Vite 8 + Zustand 5 + react-router 7** (frontend) · **Node.js ESM, no framework** (API) · **Docker Compose** (deployment). Current release: 1.6.2 (versionCode 18).

On-device features: blood tests (pdf.js text + bundled Tesseract OCR, parser, review, SI/US, scores incl. PhenoAge, FLAG_SECURE screen); food photo recognition (Food-101 ONNX model from Hugging Face, ONNX runtime from jsDelivr, both hash-verified); interval formats (Tabata/EMOM/AMRAP) and circuit timer chaining; offline cache of planned exercise media; 12 UI languages.

## Repository layout
```
api/             Node.js backend (server.js, passkey auth, per-user JSON data)
frontend/        React app (Vite build, Capacitor for Android)
  src/           views/, components/, store/ (useStore, useUI), lib/ (domain + adapters),
                 lib/labs/, lib/vision/, locales/ (11 packs), instr/, data/
  public/        SW (web only), manifest, icons
  android/       Capacitor Android project (manifest, res/xml, MainActivity, PrivacyScreenPlugin)
  lab/           spike experiments (not shipped)
docs/            ARCHITECTURE, FLOWS, PERMISSIONS, VARIABLES, MOBILE, RELEASE-CHECKLIST, tests, ADRs
media/           Exercise GIFs + images (~140 MB, downloaded by Docker at first run)
assets/          Logo, banner, screenshots
```

## Commands
```bash
cd frontend && npx vitest run       # all unit tests (37 files); must pass before any commit
cd api && node server.js            # API on :3000
cd frontend && npx vite             # dev server on :5173, proxies /api → :3000
cd frontend && npm run build        # web bundle
cd frontend && npm run build:mobile # VITE_MOBILE bundle + cap sync (dist/ is then the MOBILE bundle)
docker compose up                   # full stack on :8080
```
Read a test before its first run if it might touch real data or credentials.

## Environment
Copy `.env.example` → `.env` before running Docker or the API. Key vars: `RP_ID`, `ORIGIN`, `WEB_PORT`, `RP_NAME`, `INVITE_ONLY`, `ADMIN_UIDS`, `REQUIRE_UV`, `TRUST_PROXY`. Android build vars live in `frontend/.env.mobile` (public). Full map: `docs/VARIABLES.md`.

## Trust boundaries (app) — do not weaken
- **On-device health data.** Lab reports, meals, weights, workouts. No cloud backup (`backup_rules.xml`, `data_extraction_rules.xml` exclude everything); exports only through the share sheet, one cached copy (`shareExport`). Lab reports keep only the birth year, never the full DOB or the file name. Keep `privacyScreen(true)` on the Labs view.
- **Imported files are untrusted.** Size-check before reading (`tooBig` 20 MB, Labs 25 MB, 120 MP photos). Plan imports go through `parsePlan` + `cleanRoutine(strict)` (key whitelist, `isKnownEx`). Every state load goes through `normalizeState()`. Lab rows that were repaired, unit-guessed or low-confidence must stay unticked until the user reviews them.
- **Downloaded code and weights.** The food model is pinned to a Hugging Face commit with size + SHA-256 per `.onnx` file (`lib/vision/catalog.js`); the ONNX runtime is verified against build-time hashes (`__ORT_RUNTIME__`, `lib/vision/runtime.js`) before it runs, with no unverified fallback. Never add an unpinned or unhashed download.
- **Open Food Facts** is third-party data: only the query/barcode goes out; `normalizeOFF` bounds what comes back.
- **Optional self-host server.** Signed-in web users sync the whole state (labs and meals included) to `state-<uid>.json`.

## Trust boundaries (API) — do not bypass
- **`DATA_DIR` owns all user state.** Every user state file lives at `DATA_DIR/state-<uid>.json`. The UID is sanitized by a whitelist (`/[^a-zA-Z0-9_-]/g`) before building the path. Never bypass `stateFile()` to build paths manually.
- **`isAdmin()` is the sole auth gate for admin routes** (`api/server.js:70`). It checks both `ADMIN_UIDS` (env) and `user.admin` (db flag). New admin routes must call `requireAdmin()`, not inline the check. **Do not widen `isAdmin()` without auditing the two paths.**
- **Session tokens are single-use-derivable.** `makeSession` uses HMAC-SHA256 over `uid + sv`. The `sv` (session version) increment in `logout/all` is the entire revocation mechanism — do not skip or cache it.
- **Challenges are single-consume.** `takeChallenge` deletes on first call. Never cache or re-use a challenge ID across requests.
- **`atomicWrite` must be used for all state writes.** Direct `fs.writeFileSync` on state files bypasses the tmp+rename guard.
- **`INVITE_ONLY` is re-checked at `/api/register/verify`.** The TOCTOU window is closed deliberately.
- **Secrets in `.env` — never commit.** The session key (`data/secret`) and VAPID keys (`data/vapid.json`) are generated on first start, not read from env.
- **AGPL-3.0**: any modifications served over a network must be open-sourced.

## Do not touch lightly (each needs a full on-device retest on both phones)
- **FileProvider paths** (`res/xml/file_paths.xml`): `external-files-path Pictures/` is what makes Take photo open the camera. Removing it as "unused" broke 1.6.0.
- **AndroidManifest**: permissions, `<queries>` IMAGE_CAPTURE, backup rule references, FileProvider `exported=false`.
- **File inputs**: read the picked file before clearing the `<input>`; pass picked images through `readOnce()`.
- **CSP** (`frontend/index.html`): `connect-src` lists exactly self, jsDelivr, Hugging Face, Open Food Facts. A new network peer needs a CSP change and a reason. `CapacitorHttp` routes page `fetch` through native code on Android, so the CSP is not the only control there.
- **Signing**: release signing reads git-ignored `frontend/android/keystore.properties`. Never commit keys, passwords or their paths. Updates must use the same key.
- **versionCode** (`android/app/build.gradle`): strictly increasing; `versionName` = `frontend/package.json` version.
- **i18n keys**: English source strings are the keys in `src/locales/*.js`. Changing an English string orphans every translation; `i18n-coverage.test.js` and `i18n-dynamic.test.js` fail when any pack misses a key or a `{0}` placeholder. Add the translation to all 11 packs.
- **Sheet history** (`store/useUI.js`): open/close chains rely on `afterClose` and a deferred `pushState`; run follow-up navigation after a close through `afterClose`.
- **Pinned model/runtime hashes** (`lib/vision/catalog.js`, `vite.config.js`): update only together with the files they describe.

## Release rule
`docs/RELEASE-CHECKLIST.md` is mandatory: before **every** Android build, run the whole list (every module, not only what changed) on the signed release APK installed over the previous release, on the Samsung and the Nothing phone, driving native pickers, camera, share sheet, notifications and Back through the real UI. Release only after every item passes. Merges need the owner's approval.

## System documentation

| Doc | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | System overview, app subsystems, CSP, trust boundaries, known risks |
| `docs/FLOWS.md` | API auth flows (1–8) and app flows (9–15): boot, Labs import, model install, imports, reminder, Back, interval chaining |
| `docs/PERMISSIONS.md` | API role matrix; Android permissions and native surfaces; who can see health data |
| `docs/VARIABLES.md` | Env vars, build vars, pinned constants, device storage, signing |
| `docs/MOBILE.md` | Android build, native config, camera/gallery handling |
| `docs/RELEASE-CHECKLIST.md` | Mandatory on-device regression |
| `docs/tests.md` | Test coverage map (predates Labs, vision, interval formats) |
| `reports/` | Past security and performance audits |

## Branches
- `main` — primary development; feature work on `feat/*` / `fix/*` branches, merged by PR.
