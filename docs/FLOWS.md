# OPENFIT — Auth & Permission Flows

Permission-relevant journeys: each protected step's auth check, trust-boundary crossings, and side effects. Sections 1–8 are the self-host API; sections 9–15 are app-side flows (no roles; integrity, privacy and code-provenance checks).

## 1. Registration (passkey signup)

**Actor:** anonymous visitor  
**Precondition:** invite code required when `INVITE_ONLY=true`  
**Outcome:** user account created, session cookie minted

| Step | Endpoint | Auth check | Side effects |
|------|----------|-----------|-------------|
| 1 | `GET /api/config` | none | returns `invite_only` flag |
| 2 | `POST /api/register/options` | invite code checked if invite-only | challenge stored in-memory (5 min TTL); uid pre-allocated |
| 3 | _(device)_ | WebAuthn biometric via browser | no server contact |
| 4 | `POST /api/register/verify` | WebAuthn challenge verified; invite re-checked at commit | user + credential written to `db.json`; invite marked used; session cookie set |

**Trust boundary crossings:** Browser → Server (JSON), Server → `@simplewebauthn/server` library, HMAC-SHA256 signed cookie set on response.

**Deny cases:** invalid invite → 403; expired challenge → 400; WebAuthn failure → 400; duplicate credential → 409; invite consumed between steps 2–4 → 403.

---

## 2. Login (passkey authentication)

**Actor:** registered user  
**Outcome:** session cookie refreshed

| Step | Endpoint | Auth check | Side effects |
|------|----------|-----------|-------------|
| 1 | `POST /api/login/options` | none | challenge stored in-memory |
| 2 | _(device)_ | WebAuthn biometric | no server contact |
| 3 | `POST /api/login/verify` | WebAuthn challenge + signature + counter + disabled check | counter updated in `db.json`; session cookie set |

**Deny cases:** expired challenge → 400; unknown passkey → 404; WebAuthn failure → 400; disabled account → 403.

---

## 3. Session validation (all protected routes)

Chain applied by `readSession()` at `api/server.js:214`:

1. Parse `gymsid` cookie
2. HMAC-SHA256 signature verify (timing-safe compare)
3. Parse `uid:expiry:version`
4. Expiry check → 401 if past
5. User lookup in `db.users` → 401 if missing
6. `user.disabled` check → 401 if true
7. Session version (`user.sv`) match → 401 if mismatch

`POST /api/logout/all` bumps `user.sv`, invalidating all cookies for the account on all devices.

---

## 4. State sync (workout data)

**Actor:** authenticated user (own data only)

| Endpoint | Auth check | Side effects |
|----------|-----------|-------------|
| `GET /api/data` | readSession → 401 | reads `state-<uid>.json` |
| `PUT /api/data` | readSession → 401 | `409 {state}` if `base` is sent and ≠ stored `_ts` (another device saved since); else writes `state-<uid>.json` (atomic rename); strips `active` field |

uid is sanitized to `[a-zA-Z0-9_-]` before building the file path (`server.js:82`).

App side (`store/useStore.js`): the body is the whole `S`, including `nutrition` and `labs.reports` (birth year only, no file name). Bodies over 5 MB (`MAX_BODY`) are refused; the app then keeps `gym_dirty=1` and retries on the next change or load. On 409 the app merges the returned server copy (`mergeState`) and PUTs again once.

---

## 5. Food search proxy

**Actor:** authenticated user

| Endpoint | Auth check | Side effects |
|----------|-----------|-------------|
| `GET /api/food/search?q=` | readSession → 401 | checks in-memory cache (10-min TTL, 500 entry cap); on miss fetches Open Food Facts |

Auth gate prevents open proxy abuse. No user data sent to Open Food Facts (query string only).

---

## 6. Push notifications

| Endpoint | Auth check | Side effects |
|----------|-----------|-------------|
| `POST /api/push/subscribe` | readSession → 401 | subscription saved to `db.subs` |
| `POST /api/push/unsubscribe` | readSession → 401 | subscription removed |
| `POST /api/push/test` | readSession → 401 | push sent to caller's own subscriptions |
| `POST /api/push/rest-timer` | readSession → 401 | in-process timer set (1–3600 s) |
| `POST /api/push/rest-timer/cancel` | readSession → 401 | in-process timer cleared |
| `GET /api/push/public-key` | none | returns VAPID public key |

**Server-initiated reminder:** `setInterval` at 10 s checks all users; fires at most once per user per day at their chosen time and timezone; only when a workout is planned and not yet logged.

---

## 7. Admin operations

**Auth guard:** `requireAdmin()` = readSession + isAdmin → 401 (not signed in) or 403 (not admin).  
Admin = uid in `ADMIN_UIDS` env var, or `user.admin=true` in db.

| Endpoint | Operation | Side effects |
|----------|-----------|-------------|
| `GET /api/admin/users` | list all users + live presence | reads all `state-<uid>.json` files |
| `GET /api/admin/user?id=` | full history for one user | reads one state file |
| `POST /api/admin/user/disable` | enable/disable account | `user.disabled` written; presence cleared (cannot disable another admin) |
| `GET /api/admin/invites` | list invite codes | — |
| `POST /api/admin/invites/new` | generate invite (16 hex chars) | invite written to `db.json` |
| `POST /api/admin/invites/revoke` | revoke unused invite | invite removed from `db.json` |

---

## 8. Live workout presence

| Endpoint | Auth check | Side effects |
|----------|-----------|-------------|
| `POST /api/activity` | readSession → 401 | writes to in-memory `presence` Map (TTL ~70 s); `{active:false}` deletes entry |

Presence is never persisted to disk.

---

# App-side flows (frontend/, both builds unless marked)

No roles apply on the phone: the Android build has no sign-in, and every flow below runs as the device owner. What these flows guard is data integrity, privacy and what code runs.

## 9. Android boot and persistence

1. `boot()` (`store/useStore.js`): `nativeLoad()` reads `openfit-state.json` (or legacy `opengym-state.json`) from `Directory.Data`.
2. File wins when localStorage is empty or the file's `_ts` ≥ the local `_ts`; otherwise the local copy seeds the file.
3. Every load passes through `normalizeState()` (routines, week, active workout, lab reports repaired; bad entries dropped, nothing else removed).
4. Each change: localStorage write → 800 ms later `nativeSave()` + `syncReminder()`. Backgrounding flushes the pending save.

**Deny/failure:** unreadable file → `null`, localStorage copy is used. localStorage full → in-memory + file copy kept, toast once a minute.

## 10. Blood test import (Labs)

**Actor:** device owner · **Outcome:** a reviewed report in `S.labs.reports`

| Step | Code | Check | Side effects |
|---|---|---|---|
| 1 Pick | `Labs.jsx` hidden inputs: PDF (`application/pdf`) or camera (`image/*`, `capture="environment"`) | file read **before** the input is cleared | — |
| 2 Size | `importFile` | > 25 MB refused | toast |
| 3 Copy | `readOnce()` | copies the picked file into memory once (Android picker files read only once) | — |
| 4 Read | `pdfText` (≤30 pages, `isEvalSupported:false`); <40 chars → `ocrPdfPages` (≤6 pages); photo → `preparePhoto` (> 120 MP refused) → `ocrText` | all on device; Tesseract assets from the app's own `ocr/` | locked progress sheet; Cancel bumps a generation counter and terminates the worker after its current page |
| 5 Parse | `parseLabText` + `repairRow` | OCR-only decimal/unit repair, every repair flagged | — |
| 6 Review | `ReviewSheet` (locked), `reviewRows` | fixed, unit-guessed, low-confidence (<80) and duplicate rows start unticked; unknown units can't be saved; date required, max today | — |
| 7 Save | `buildReport` → `update()` | only ticked rows with a known unit; values stored canonical SI; DOB reduced to birth year | state persisted (and synced to the server for a signed-in web user) |

While `Labs` is mounted, `privacyScreen(true)` sets `FLAG_SECURE` (screenshots, recordings, recents preview blocked); unmount clears it. No-op on the web. Delete: confirm sheet → report removed.

## 11. Food photo model install and recognition

**Actor:** device owner · **Precondition:** model state `absent` (not `ineligible`: device memory < 1 GB or too little free quota)

| Step | Code | Check | Side effects |
|---|---|---|---|
| 1 Install | `installModel` (`lib/vision/client.js`) | `navigator.storage.persist()` requested | module worker started |
| 2 Runtime | `pinRuntime` (`runtime.js`) | ONNX `.mjs` + `.wasm` from `cdn.jsdelivr.net/npm/onnxruntime-web@<bundled version>` must match the build-time size + SHA-256; cached copies are re-verified each load; mismatch → `VERIFY` failure, no fallback | Cache `openfit-ort-<version>` |
| 3 Model | `AutoImageProcessor` / `AutoModelForImageClassification.from_pretrained(repo, {revision})` | pinned commit; `env.allowLocalModels=false` | `transformers-cache` |
| 4 Verify | worker `verify` | each `.onnx` file: size, then SHA-256; mismatch purges the repo's cache entries | localStorage marker `openfit.vision.verified.<id>.<device>` = revision |
| 5 Photo | `vision-sheets.jsx` Take photo (`capture="environment"`) / Choose photo | read before clearing input; `readOnce` → `prepImage` (512 px JPEG) | preview shown |
| 6 Classify | `classify` → worker | state must be `ready` | top-3 labels |
| 7 Review | `analyzeDish` → `dishFood` | only labels in the bundled USDA table become options; top score < 0.5 marked unsure | user saves a food entry |

Cancel during download purges the cache. Remove model purges cache + markers. Photos never leave the device.

## 12. Imports and exports

| Flow | Code | Checks | Effect |
|---|---|---|---|
| Backup import | `Settings.jsx doImport` | ≤ 20 MB; must have `workouts`, `routines` or `nutrition`; danger confirm | `replaceState(normalizeState(data), true)`: replaces everything (incl. labs); pushes to server if signed in |
| Backup export | `Settings.jsx` | — | Android: cache file + share sheet, previous export deleted (`shareExport`); web: blob download |
| Plan file import | `sheets.jsx pickFile` → `parsePlan` → `planImportSheet` → `mergePlan` | ≤ 20 MB; needs `opengym_plan` + `routines[]`; unknown exercise ids dropped and counted; strict key whitelist (`cleanRoutine(strict)`); custom exercise names/text truncated | routines **added** with new ids, never overwritten; week replaced only if the user opts in |
| Spreadsheet/JSON plan upload | `sheets.jsx handleFile` → `parseAnyPlan` | ≤ 20 MB; `.xlsx` refused | same `planImportSheet` → `mergePlan` path |
| Other-app import (Strong/Hevy/FitNotes CSV, Apple Health XML) | `importFromApp` | ≤ 20 MB; summary before applying | history added |

## 13. Workout-day reminder (Android)

1. Settings toggle → `syncReminder(S, interactive=true)`: cancels ids 100–106, asks notification permission only here.
2. Schedules one weekly notification per weekday that has an existing routine (`weekday = day+1`, `allowWhileIdle`).
3. Every later persist re-syncs with `interactive=false` (never prompts). Denied permission → toggle reports failure.
4. `SCHEDULE_EXACT_ALARM` is declared; where it isn't granted, the manifest comment says the plugin falls back to inexact alarms. That fallback is plugin behaviour, not code in this repo (unverified here).

## 14. Sheets and Android Back

- `openSheet` pushes a history entry (`{openfitSheet:id}`), but only after any pending close has finished popping (`useUI.afterClose`), so a close-then-open chain (photo → review, Labs reading → review) keeps one entry per open sheet.
- Back (`popstate`) closes the top unlocked sheet. Locked sheets (Labs reading/review) ignore Back.
- `closeSheet` calls `history.back()` when its entry is on top; navigation or confirm actions after a close go through `afterClose` so the late `back()` can't undo them.
- Native Back (`MainActivity`): WebView `goBack()` while it can, then the system default (exit).

## 15. Interval formats and circuit chaining

- `routine.format` ∈ `tabata | emom | amrap` (else standard); `cap` only for AMRAP, clamped to 60–3600 s. Both cleaned on every load and import.
- Tabata/EMOM: the routine's interval length overrides a carried-over hold length (`sessionSets`). Rest after a set: Tabata always, EMOM/AMRAP never, standard after the last exercise of a superset round (`restAfter`).
- A set finished by the timer starts the next timed set of the same superset/circuit or interval block (`chains`, `nextInRound`), after the queued rest (`onRestEnd`). A manual tick or cancel ends the chain; a hold that finished while backgrounded (>2 s late) doesn't chain. Writes check the same workout id is still active.
- Ticking a set is validated (`check`): errors refuse, warnings ask "Log anyway".

---

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview and trust boundaries
- [PERMISSIONS.md](PERMISSIONS.md) — role matrix
- [VARIABLES.md](VARIABLES.md) — all config and secrets
- [MOBILE.md](MOBILE.md) — Android native config behind flows 9–14
- [tests.md](tests.md) — coverage map
