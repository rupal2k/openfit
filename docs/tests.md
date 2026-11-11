# Test Coverage — openfit

Coverage map produced by ship-check (step 7, derive-tests), refreshed 2026-11-11 on `fix/photo-capture` at `2cdaac1`. It replaces the 2026-10 map, which predated Labs, food photo recognition, interval formats, the i18n coverage tests and photo/capture handling.

**Existing** = a test in the repo asserts this today (file › describe › test name). **Proposed** = a deterministic test is recommended but not written. **Manual** = an on-device item in `docs/RELEASE-CHECKLIST.md` (the mandatory release gate); no automated test exists or can stand in for it. **None** = no verification at all.

Inventory: frontend Vitest, 38 files / 585 tests, all passing (`cd frontend && npx vitest run`, run read-only for this map). API `node --test api.test.js server.test.js` (about 60 cases; read, not run for this map). There are no component or end-to-end tests: views, sheets, `store/useUI.js` and the native shell have no automated coverage.

Rule sources: `CLAUDE.md` (trust boundaries, do-not-touch list), `docs/ARCHITECTURE.md` §4–6, `docs/FLOWS.md` 1–15, `docs/PERMISSIONS.md`, `docs/MOBILE.md`, `docs/RELEASE-CHECKLIST.md`.

## Coverage table

### Imported files and stored state (untrusted → state)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Backup import repair | every state load goes through `normalizeState()` (CLAUDE.md; FLOWS 9, 12) | hostile backup repaired: prototype ids dropped, unrenderable workouts/weigh-ins dropped, nutrition/weights coerced; a normal state is left alone | `store/normalize.test.js` › normalizeState repairs a hostile backup (4 tests) | unit | **existing** (added today) |
| Stored state repaired, not emptied | `normalizeState` drops bad entries, removes nothing else (FLOWS 9) | unknown fields kept; week entry must point at an existing routine | `lib/clean.test.js` › stored state is repaired, not emptied (2) | unit | **existing** |
| Hostile plan file | strict key whitelist `cleanRoutine(strict)`, `isKnownEx` rejects `__proto__` (CLAUDE.md; ARCH §5) | names/icons/rules plain strings from known lists; prototype names not ids; "constructor" custom → fresh id; week keys 0–6 only; nameless customs dropped, long text cut | `lib/clean.test.js` › a hostile plan file cannot store data that breaks a screen (5) | unit | **existing** |
| Plan import refuses unusable files | a plan with no usable routine is refused (FLOWS 12; checklist §4) | routine emptied by dropped exercises is not offered; file with nothing usable is refused instead of an empty import | `lib/clean.test.js` › plan files with nothing usable (on-device audit 1.6.2) (2) | unit | **existing** (added today) |
| Plan import adds, never overwrites | `mergePlan` adds routines with new ids; week replaced only on opt-in (FLOWS 12) | import merges; existing routines untouched; interval plans leave the week alone | `lib/starter.test.js` › plan templates › an add-on plan has no days…; interval formats › interval plans leave the week alone | unit | **existing** (week); **proposed** (explicit "existing routine with same id is not overwritten") |
| Imported set bounds | every imported entry bounded (FLOWS 12) | out-of-range targets clamped | `lib/validate-set.test.js` › mergePlan applies the bounds to every imported entry; cleanConfig — routine targets… | unit | **existing** |
| Other-app import | CSV import drops sets the workout screen would refuse; ratings bounded (FLOWS 12) | invalid sets dropped and counted; RPE/RIR junk ignored, overruns capped | `lib/validate-set.test.js` › CSV history import drops sets…; `lib/import-effort.test.js` (13) | unit | **existing** |
| Lab report repair on load | `cleanReports()` in `normalizeState` (ARCH §4) | malformed reports/markers dropped; empty report dropped; old reports migrated to birth year only | `lib/labs/reports.test.js` › cleanReports; cleanReports migrates old reports; reports with nothing left… | unit | **existing** |
| Size caps before reading | `tooBig` 20 MB text, Labs 25 MB, 120 MP photo (CLAUDE.md; ARCH §5) | over-cap file refused with a toast before it is read | `sheets.jsx`, `Settings.jsx`, `Labs.jsx` inline checks | unit (extract predicate) + manual | **manual** (checklist §4, §9, §11); **proposed** unit |
| Food photo size check | ARCH §6 known risk: no size check before `readOnce` in `vision-sheets.jsx pickFile` | (documented gap, not a rule yet) | `vision-sheets.jsx:90` | — | **none** |
| Backup must look like OPENFIT | must have `workouts`, `routines` or `nutrition` (FLOWS 12) | non-OPENFIT JSON → clear error | `Settings.jsx doImport` | unit (extract predicate) + manual | **manual** (checklist §11); **proposed** unit |

### Pickers, camera captures, file inputs (photo/capture handling)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| readOnce | picked images pass through `readOnce()`; Android picker files read only once (CLAUDE.md; FLOWS 10.3, 11.5) | file read exactly once, in-memory copy keeps name/type/size | `lib/mobile.test.js` › readOnce › reads the picked file exactly once… | unit | **existing** |
| Read before clearing the input | read the picked file before clearing `<input>` (CLAUDE.md; FLOWS 10.1, 11.5) | clearing the input first must not lose the file | `views/Labs.jsx:43`, `vision-sheets.jsx:90`, `sheets.jsx` | component/manual | **manual** (checklist §8, §9). `mobile.test.js` pins `readOnce` only, not the call order in the views |
| Camera captures deleted after read | `clearCaptures()` removes camera photos once read, and at boot for cancelled/killed captures (`lib/mobile.js:99`, `useStore.js:255`) | after a capture is read, `Pictures/` holds no OPENFIT photo; a killed capture is cleaned on next boot | `lib/mobile.js clearCaptures` | unit (mock Filesystem) + manual | **manual only** (device); **proposed** unit with a mocked `@capacitor/filesystem` |
| Take photo opens the camera | FileProvider `external-files-path Pictures/`; `<queries>` IMAGE_CAPTURE (CLAUDE.md; PERMISSIONS native surfaces) | camera app opens on both phones, not the gallery | `res/xml/file_paths.xml`, `AndroidManifest.xml` | manual | **manual** (checklist §8, §9) |
| Choose photo preview / Retake | preview of the picked image; Retake clears it (checklist §8) | preview shown, Recognise → review → save | `vision-sheets.jsx` | manual | **manual** |
| FileProvider not exported | `exported=false`, `grantUriPermissions=true` (PERMISSIONS) | — | manifest | manual (config review) | **manual** |

### Labs (blood tests)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Repaired / guessed / low-confidence rows unticked | must stay unticked until reviewed (CLAUDE.md; FLOWS 10.6) | OCR repairs, leading-zero decimals, guessed TSH unit start unticked | `lib/labs/audit-fixes.test.js` › 1 · … OCR repairs are never saved unless the person ticks them; re-audit › R5 …; re-audit leftovers › TSH printed in mIU/mL… | unit | **existing** (duplicate-row and <80 confidence cases **proposed**) |
| Unknown units can't be saved | `buildReport` saves only ticked rows with a known unit (FLOWS 10.7) | unconvertible unit left for the person, never renamed | `lib/labs/reports.test.js` › includes matched rows with known units…; `audit-fixes` › 6 · units are never swapped… | unit | **existing** |
| DOB reduced to birth year; no file name | Lab reports keep only the birth year, never the full DOB or file name (CLAUDE.md) | printed DOB → year; `src` file name dropped on migration | `lib/labs/reports.test.js` › privacy and recent values › keeps only the birth year…; cleanReports migrates old reports | unit | **existing** |
| Canonical SI storage, SI/US display | values stored SI (ARCH §4) | US → SI → US round-trips; unknown unit flagged | `lib/labs/units.test.js` (9), `reports.test.js` › stores SI values… | unit | **existing** |
| Parser reads rows correctly | `parseLabText` + `repairRow` (FLOWS 10.5) | correct marker/value/unit; lookalike tests not mapped; ranges scaled with values | `lib/labs/parse.test.js` (10), `repair.test.js` (7), `audit-fixes.test.js` (22), `benchmark.test.js` › maps no row to a wrong marker | unit | **existing** |
| Scores need complete inputs; adults 18–120 | scores only with complete inputs; adult ages only (ARCH §4) | missing input → score omitted; child/impossible year → no age; never NaN | `lib/labs/scores.test.js` › scores need their inputs (5); `reports.test.js` › age limits for adult scores | unit | **existing** |
| OCR on device | Tesseract with bundled `ocr/` assets (FLOWS 10.4) | scanned and photo report read | `lib/labs/ocr.test.js` (4) | integration (deterministic, local assets) | **existing** |
| FLAG_SECURE on Labs | `privacyScreen(true)` while `Labs` mounted, cleared on unmount (CLAUDE.md; FLOWS 10) | screenshots/recents blocked on Labs; lifted elsewhere | `views/Labs.jsx`, `PrivacyScreenPlugin.java` | manual | **manual** (checklist §9) |
| OCR cancel | Cancel bumps a generation counter and stops the worker (FLOWS 10.4) | late page result is discarded | `views/Labs.jsx` | manual | **manual** (checklist §9) |

### Downloaded code and weights (food photo)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Model pinned and hashed | commit-pinned repo, size + SHA-256 per `.onnx` (CLAUDE.md; FLOWS 11.4) | every model pinned to a full commit and every file to a sha256 | `lib/vision/catalog.test.js` › pins every model to a full commit…; `verify.test.js` (3: pass, size mismatch, hash mismatch) | unit | **existing** |
| ONNX runtime verified, no fallback | runtime checked against build-time hashes before it runs (CLAUDE.md; FLOWS 11.2) | exact file accepted; tampered same-size or wrong-size refused; network error is a download error | `lib/vision/runtime.test.js` (4) | unit | **existing** |
| Verify wired into the worker | `verify` in `worker.js` actually runs and purges on mismatch | unit tests prove the helper, not that the worker calls it | `lib/vision/worker.js` | guarded live / manual | **manual** (checklist §8 photo logging); wiring **none** |
| Model config files unhashed | ARCH §6 known risk | — | `catalog.js` | — | **none** (documented risk) |
| Model never supplies numbers | only labels in the bundled USDA table become options; top score < 0.5 unsure (FLOWS 11.7) | unknown labels → null; low confidence flagged | `lib/vision/analyzer.test.js` (3), `dishes.test.js` (4) | unit | **existing** |

### Open Food Facts, CSP, network peers

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| `normalizeOFF` bounds third-party data | servings 0–5000; only query/barcode sent (CLAUDE.md; ARCH §5) | no name/energy → rejected; implausible energy or negative macros → rejected | `lib/off.test.js` (8) | unit | **existing** (serving 0–5000 bound **proposed**) |
| CSP `connect-src` exact list | self, jsDelivr, Hugging Face, OFF only (CLAUDE.md) | adding a peer fails a test | `frontend/index.html` | unit (parse index.html) | **proposed**; device check **manual** (checklist §1) |
| CapacitorHttp sidesteps CSP | ARCH §6 (inferred, unverified on device) | — | `capacitor.config.json` | manual | **none** |

### Training, progression, interval formats

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Progression keeps advancing across sessions (holds, bodyweight) | finding 2026-11-11: `sessionTarget` | hold 45→50→55→60; bodyweight reps 10→11→12→13; weighted rep targets left as planned | `lib/progression.test.js` › progression keeps going across sessions (sessionTarget) (3) | unit | **existing** (added today) |
| Progression policies | linear, Greyskull, double, timed, off; deload; bodyweight | correct advance/repeat/deload; never deload below one increment; no invented weight for push-ups | `lib/progression.test.js` (64 tests: linear, Greyskull LP, double, timed, bodyweight exercises, policy "off", applyPrescription) | unit | **existing** |
| Hold stopped early doesn't shorten next target | checklist §5 | early end → back to plan; full holds carry | `lib/round.test.js` › a hold stopped early does not become the next target | unit | **existing** |
| Interval formats | `format` ∈ tabata/emom/amrap; `cap` 60–3600 s; cleaned on load and import (FLOWS 15) | junk format/cap dropped; rest rules per format; chaining rules | `lib/round.test.js` › format rules (3), interval formats keep their own timing; `starter.test.js` › interval formats (5) | unit | **existing** |
| Circuit order | `nextInRound` (FLOWS 15) | set 1 of each, then set 2; skips done sets; stays in its unit | `lib/round.test.js` › nextInRound… (4) | unit | **existing** |
| Chain stops on manual tick / late hold / other workout | FLOWS 15: manual tick or cancel ends chain; >2 s late doesn't chain; writes check same workout id | — | `store/useUI.js onRestEnd`, `views/Workout.jsx` | unit (extract) | **proposed** |
| Set validation | ticking validated: errors refuse, warnings ask (FLOWS 15; checklist §5) | 0 reps/0 kg/0 s refused; typo prompt | `lib/validate-set.test.js` (144) | unit | **existing** |
| Working weights | never lowered unless `resetW` opted in; Discard leaves them unchanged | — | `lib/workout.test.js` › recordSession; lowering a working weight on purpose (resetW); finishSession › does not touch the state | unit | **existing** |
| e1RM / PRs | Epley etc.; unchecked sets ignored | — | `lib/onerm.test.js` (21), `workout.test.js` › finishSession | unit | **existing** |
| Wake lock | screen stays awake during workout, released after | no stacked locks; re-acquire after backgrounding | `lib/wakelock.test.js` (9) | unit | **existing** |
| Offline plan media | planned exercises cached; failures retried | — | `lib/media-cache.test.js` (3) | unit | **existing**; airplane-mode check **manual** (checklist §1) |
| Templates | every exercise id exists; home plans need only promised kit | — | `lib/starter.test.js` › plan templates (4) | unit | **existing** |

### Nutrition

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Calorie targets adults only | finding 1.6.2: calculated targets only for adults | profile saved at age 12 → no calculated target; typed override still applies; sheet only takes adult birth years | `lib/nutrition.test.js` › adults only, inside targets() (2); target safety › the sheet only takes adult birth years | unit | **existing** (added today) |
| Calorie floor | calculated "lose" goal never below the floor for the sex | override is not raised | `lib/nutrition.test.js` › target safety (PM audit 1.6.2) › a calculated "lose" goal never drops below the floor…; a typed override… | unit | **existing** (added today) |
| Targets honest | null when it cannot compute | — | `lib/nutrition.test.js` › targets › returns null when it cannot compute honestly | unit | **existing** |
| Diary snapshots food | later source edits don't rewrite history | — | `lib/nutrition.test.js` › diary mutators › snapshots the food… | unit | **existing** |

### i18n

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Literal strings in every pack | `i18n-coverage.test.js` fails when any pack misses a key or a `{0}` placeholder (CLAUDE.md) | each of 11 packs has every string and keeps every placeholder | `lib/i18n-coverage.test.js` › translations › `<lang>` has every string / keeps every placeholder (23) | unit | **existing** |
| Table strings reaching `t()` via variables | `i18n-dynamic.test.js` (CLAUDE.md) | each pack has every table string | `lib/i18n-dynamic.test.js` › translations of strings that reach t() through variables (12) | unit | **existing**. Placeholders in table strings are not checked (**proposed**) |
| Language switch re-renders; instruction fallback | checklist §10 | — | `lib/i18n.js`, `src/instr/` | manual | **manual** |

### Sync (self-hosted web)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| 409 merge | `mergeState` unions both devices, local wins per id, doesn't mutate inputs (ARCH §4) | — | `lib/sync.test.js` (10) | unit | **existing** |
| Server conflict detection | `base` mismatch → 409 with newer copy; no base → last writer wins | — | `api/api.test.js` › PUT /api/data — conflict detection (4) | integration | **existing** |
| Overlapping sync PUTs resurrect deletions | known open (web self-host only): a second PUT based on an older copy merges a deleted item back | delete on device A, overlapping save → item stays deleted | `lib/sync.js` | unit (mergeState with deletion) + integration | **none** (not fixed) |
| `S.active` never stored server-side | `delete body.state.active` (PERMISSIONS) | PUT with `active` → GET returns none | `api/server.js` | integration | **proposed** |
| Body limit 5 MB | `MAX_BODY` (ARCH §6) | >5 MB PUT refused; app keeps `gym_dirty` | `api/server.js` | integration | **proposed** |

### Sheets, Back button, navigation

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Sheet close → open ordering | `openSheet` pushes only after a pending close has popped (`afterClose`, deferred `pushState`) (CLAUDE.md; FLOWS 14) | photo → review, Labs reading → review keep one history entry per open sheet | `store/useUI.js` | unit (jsdom history) | **manual only** (checklist §2); **proposed** unit — no test exists |
| Navigation after close goes through `afterClose` | late `history.back()` must not undo a confirm/navigation (FLOWS 14) | "Choose a different workout", skip weigh-in, Discard don't bounce back | `store/useUI.js`, callers | unit + manual | **manual** (checklist §2); **proposed** unit |
| Locked sheets ignore Back | Labs reading/review (FLOWS 14) | Back does nothing on a locked sheet | `store/useUI.js` | unit | **proposed** |
| Native Back | WebView `goBack()` then exit (PERMISSIONS) | closes sheet → route back → exit from Home | `MainActivity` | manual | **manual** (checklist §2) |

### Android persistence, reminders, privacy, release

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Boot picks newer copy | file wins when localStorage empty or file `_ts` ≥ local (FLOWS 9) | older file doesn't overwrite newer local | `store/useStore.js boot`, `lib/mobile.js` | unit (extract decision) + manual | **manual** (checklist §1); **proposed** unit |
| Unreadable file / full localStorage | `null` → local copy; full → in-memory + file, toast (FLOWS 9) | — | `lib/mobile.js nativeLoad` | unit | **proposed** |
| Reminder schedules planned weekdays | ids 100–106, one per weekday with a routine (FLOWS 13) | rest days get no notification | `lib/mobile.js syncReminder` | unit (mock LocalNotifications) + manual | **manual** (checklist §10); **proposed** unit |
| Permission only from the toggle | `interactive=false` never prompts (FLOWS 13) | persist re-sync never calls requestPermissions | `lib/mobile.js syncReminder` | unit | **proposed** |
| Reminder switch after permission revoked | known open: switch stays on after the user revokes notification permission | switch reflects revoked permission | `Settings.jsx`, `syncReminder` | unit + manual | **none** (not fixed) |
| Exact-alarm fallback | plugin behaviour, unverified (FLOWS 13; MOBILE) | — | plugin | manual | **none** |
| No cloud backup of health data | `backup_rules.xml`, `data_extraction_rules.xml` exclude everything (CLAUDE.md) | — | res/xml | manual | **manual** (checklist §12, `bmgr` optional) |
| Export only via share sheet, one cached copy | `shareExport` deletes previous export (CLAUDE.md) | — | `lib/mobile.js shareExport` | unit (mock Filesystem) + manual | **manual** (checklist §11); **proposed** unit |
| Backup round-trip | export then import on fresh install restores everything incl. labs | — | `lib/import-effort.test.js` › effort in a backup (effort fields only) | unit + manual | **existing** (effort only); full round-trip **manual** (checklist §11) |
| Signed over previous release; versionCode increases | CLAUDE.md release rule; MOBILE | — | `build.gradle`, `package.json` | unit (version consistency script) + manual | **manual** (checklist §0); **proposed** consistency check |
| Status bar follows theme | checklist §2 | — | `App.jsx applyPrefs` | manual | **manual** |

### API (self-host server)

| Use case | Rule (doc) | Expected behavior (+ deny case) | Evidence | Type | Status |
|---|---|---|---|---|---|
| Health / config | public; `invite_only` false by default | — | `api/api.test.js` › GET /api/health; GET /api/config | integration | **existing** |
| Protected routes 401 | every authenticated route → 401 without session (PERMISSIONS matrix) | — | `api/api.test.js` › Protected endpoints — unauthenticated; GET /api/food/search; POST /api/logout/all — requires session; POST /api/push/rest-timer validation | integration | **existing** |
| Admin routes 401 unauthenticated | (PERMISSIONS) | — | `api/api.test.js` › Admin endpoints — unauthenticated / non-admin; admin routes — additional auth boundary checks | integration | **existing** |
| Admin 403 for authenticated non-admin | `requireAdmin` (PERMISSIONS) | non-admin → 403; admin → 200 | `server.js requireAdmin` | integration (test session hook) | **proposed** |
| Register name validation | empty → 400; >40 truncated | — | `api/api.test.js` › POST /api/register/options (4) | integration | **existing** |
| Challenges single-consume | `takeChallenge` deletes on first call (CLAUDE.md) | second use → 400 | `api/api.test.js` › Challenge TTL — replay protection; login/options › each call returns a different challenge | integration | **existing** |
| INVITE_ONLY at options | missing/blank code → 403 | — | `api/api.test.js` › INVITE_ONLY registration gate (3) | integration | **existing** (valid-code allow case **proposed**) |
| INVITE_ONLY re-checked at verify (TOCTOU) | (CLAUDE.md) | invite revoked between options and verify → 403 | `server.js` register/verify | integration | **proposed** |
| Session version revocation | `logout/all` bumps `sv` (CLAUDE.md) | old cookie → 401, new → 200 | `server.js` | integration | **proposed** |
| Disabled account blocked | `readSession` checks disabled (PERMISSIONS) | → 403 | `server.js` | integration | **proposed** |
| Admin cannot disable admin | (PERMISSIONS) | → 400 | `server.js` | integration | **proposed** |
| `user.admin` db flag as second admin path | `isAdmin()` checks both (CLAUDE.md) | db flag alone grants admin; neither → 403 | `server.js isAdmin` | unit | **proposed** |
| Logout clears cookie | Max-Age=0 | — | `api/api.test.js` › POST /api/logout | integration | **existing** |
| VAPID key public | — | — | `api/api.test.js` › GET /api/push/public-key | integration | **existing** |
| Unknown routes 404 | path and wrong method | — | `api/api.test.js` › 404 for unknown routes (2) | integration | **existing** |
| In-process rate limit | `RATE_LIMIT_MAX` per IP per 60 s; spoofed XFF ignored (PERMISSIONS) | 4th request → 429 | `api/api.test.js` › rate limiting on auth endpoints (3) | integration | **existing** |
| Auth event logging | REGISTER / LOGIN_FAIL events | — | `api/api.test.js` › auth event logging (2) | integration | **existing** |
| `stateFile` sanitization | whitelist `[A-Za-z0-9_-]`, stays in DATA (CLAUDE.md) | traversal, slashes, null bytes don't escape | `api/server.test.js` › stateFile path sanitization (5) | unit | **existing** |
| `atomicWrite` | tmp+rename; no partial file on failure (CLAUDE.md) | failed rename leaves original intact, no `.tmp` | `api/server.test.js` › atomicWrite error handling (3) | unit | **existing** |
| Admin view hides labs/nutrition | `GET /api/admin/user` doesn't return `labs`/`nutrition` (PERMISSIONS) | — | `server.js` | integration | **proposed** |

### Performance (known open, not fixed)

| Use case | Rule (doc) | Expected behavior | Evidence | Type | Status |
|---|---|---|---|---|---|
| `persist()` clones full state per keystroke | known open perf finding | — | `store/useStore.js persist` | — | **none** |
| Instruction packs loaded at boot | known open perf finding | — | `src/instr/` | — | **none** |

---

## Existing coverage

**Frontend (Vitest, 38 files, 585 tests, green on `2cdaac1`):**
- Domain: `progression` (64), `validate-set` (144), `history` (55), `round` (9), `workout` (10), `onerm` (21), `effort` (23), `import-effort` (13), `nutrition` (22), `starter` (12), `demoSeed` (10), `wakelock` (9), `media-cache` (3), `off` (8), `sync` (10).
- Untrusted input: `clean` (9), `store/normalize` (4), `mobile` (1, `readOnce`).
- Labs: `parse` (10), `repair` (7), `units` (9), `reports` (16), `scores` (12), `audit-fixes` (22), `benchmark` (3), `ocr` (4, local Tesseract assets).
- Vision: `catalog` (8), `runtime` (4), `verify` (3), `analyzer` (3), `dishes` (4), `match` (5), `parse` (7), `client` (2), `image` (2), `topk` (2).
- i18n: `i18n-coverage` (23), `i18n-dynamic` (12).

**Today's findings, confirmed against the suite:**

| Finding | Pinned? | Test |
|---|---|---|
| Progression keeps advancing across sessions (holds, bodyweight) | yes | `lib/progression.test.js` › progression keeps going across sessions (sessionTarget) (3) |
| Camera captures deleted after read (`clearCaptures`) | **no** | device only (checklist §8/§9); no unit test |
| Sheet close → open / navigation ordering (`useUI` `afterClose`, deferred push) | **no** | no `useUI` test exists; checklist §2 only |
| Backup import repair | yes | `store/normalize.test.js` › normalizeState repairs a hostile backup (4) |
| Plan import refuses unusable files | yes | `lib/clean.test.js` › plan files with nothing usable (on-device audit 1.6.2) (2) |
| Calorie targets adults-only + floor | yes | `lib/nutrition.test.js` › target safety (PM audit 1.6.2) (3); adults only, inside targets() (2) |
| i18n literal + table coverage | yes | `lib/i18n-coverage.test.js` (23); `lib/i18n-dynamic.test.js` (12) |
| Read-before-clear file inputs + `readOnce` | **partly** | `readOnce` pinned by `lib/mobile.test.js` › readOnce; read-before-clear order in `Labs.jsx`/`vision-sheets.jsx`/`sheets.jsx` is device only |

**API (`node --test`):** `api/api.test.js` spawns a real server against a temp `DATA_DIR`; covers health, config, 401 on every protected and admin route, register/login options, challenge replay, logout, VAPID key, 404s, INVITE_ONLY at options, rate limiting incl. XFF spoofing, auth event logs, PUT conflict detection. `api/server.test.js` covers `stateFile` and `atomicWrite`. Both run in CI (`test-api`).

---

## Proposed tests

All deterministic; none needs a live service.

### Photo/capture and file inputs (`lib/mobile.test.js`)
- **clearCaptures removes read captures** — mock `@capacitor/filesystem` with two files under `Pictures/`; call `clearCaptures()`; assert both deleted. Negative: files outside `Pictures/` untouched; a `readdir` failure doesn't throw.
- **read-before-clear helper** — if the views share one "take file from input" step, extract it and assert it calls `readOnce` before resetting `input.value`. Negative: clearing first yields no file. Complements, doesn't replace, checklist §8/§9.
- **Food photo size cap** — once a cap is added to `vision-sheets.jsx pickFile`, test the predicate (oversized → refused before `readOnce`).

### Sheet history (`store/useUI.test.js`, new, jsdom)
- **close then open keeps one entry** — open A, close A, open B in the same tick; assert `history.length` grew by exactly one net entry and the top state is `{openfitSheet: B}`. Negative: without `afterClose`, B's entry is popped by A's late `back()`.
- **navigation after close via `afterClose`** — close sheet, queue `navigate('/x')` via `afterClose`; assert route stays `/x` after `popstate`. Negative: navigating directly bounces back.
- **locked sheet ignores Back** — dispatch `popstate` with a locked sheet on top; assert still open.

### Reminders (`lib/mobile.test.js`, mocked LocalNotifications)
- **schedules only planned weekdays** — week with Mon/Thu routines → notifications 101 and 104 only; ids 100–106 cancelled first.
- **non-interactive sync never prompts** — `syncReminder(S, false)` with permission `prompt` → `requestPermissions` not called.
- **revoked permission turns the switch off** — `checkPermissions` → `denied`; assert result/state reports off (fails today: known open).

### Sync (`lib/sync.test.js`, `api/api.test.js`)
- **deletion survives an overlapping save** — base has item X; local deletes X; remote copy still has X from an earlier in-flight PUT; assert merged state has no X (fails today: known open).
- **`active` stripped server-side** — PUT with `state.active`; GET → no `active`.
- **5 MB body limit** — PUT > 5 MB → 413/400.

### Boot and persistence (`lib/mobile.test.js` or extracted `pickNewer`)
- **newer copy wins** — file `_ts` older than local → local kept and written to file; empty local → file used.
- **unreadable file** — `nativeLoad` returns `null` on parse error.

### Imports (extracted predicates)
- **`tooBig`** at 20 MB / 25 MB / 120 MP: just under passes, just over refused.
- **backup shape** — JSON without `workouts`/`routines`/`nutrition` refused.
- **mergePlan never overwrites** — existing routine id collides with imported one → existing unchanged, imported gets a new id.

### Labs
- **duplicate and low-confidence (<80) rows start unticked** in `reviewRows`.

### CSP (`index.csp.test.js`, reads `frontend/index.html`)
- **connect-src is exactly** `'self'`, jsDelivr, `huggingface.co`, `*.huggingface.co`, `*.hf.co`, `*.openfoodfacts.org`; `object-src 'none'`. Negative: any extra host fails.

### i18n
- **table strings keep placeholders** — extend `i18n-dynamic.test.js` with the same `{0}` check as `i18n-coverage`.

### API (integration, needs a test-only session hook or seeded `db.json`)
- Admin 403 for non-admin; `user.admin` flag path; `logout/all` revokes old cookie; disabled account → 403; admin-on-admin disable → 400; invite revoked between options and verify → 403; valid invite → 200; admin user view omits `labs`/`nutrition`.

### Release consistency
- **version check** — `versionName` in `build.gradle` equals `frontend/package.json` version (cheap script in `test-build`).

---

## Gate

The repo states its own gate, and it is a local command plus a human go:
- `CLAUDE.md` › Commands: `cd frontend && npx vitest run` "must pass before any commit"; › Release rule: `docs/RELEASE-CHECKLIST.md` is mandatory before every Android build, whole list, both phones, signed APK over the previous release; merges need the owner's approval.
- CI (`.github/workflows/ci.yml`) runs `test-api` (`node --test`) and `test-build` (Vitest + web build + `node --check api/server.js`) on every push to `main` and every PR; `build-apk` on `main` needs both. Checklist §0 requires both green.

The deterministic set (all Vitest files and both API test files) runs inside this gate. Nothing guarded-live is in it (`labs/ocr.test.js` uses bundled assets only). No change to the gate is recommended. The manual rows above are gated by the release checklist, not by CI; that is by design, since native pickers, camera, FileProvider, share sheet, notifications, Back and FLAG_SECURE can't be driven without a real phone.

---

## Gaps — documented but unverified

Ranked by what crossing them exposes. "Manual" means only the release checklist catches it, once per release.

| Rule | Risk if crossed | Verification today | Priority |
|---|---|---|---|
| Camera captures deleted after read (`clearCaptures`) | health-adjacent photos (lab reports, meals) left in app storage | manual only | **High**: add mocked-Filesystem unit test |
| Sheet close → open / nav ordering (`useUI afterClose`) | actions bounce back, duplicate history entries; regressed before (checklist §2) | manual only | **High**: no `useUI` test at all |
| Overlapping sync PUTs resurrect deletions (web self-host) | deleted data (incl. lab reports) comes back | none, not fixed | **High** |
| Read-before-clear in views | picked file lost on Android (1.6.0-class regression) | manual; `readOnce` alone is pinned | **High** |
| API admin 403 / `user.admin` path / session revocation / disabled account / TOCTOU | privilege escalation or stale sessions on self-host | none (401 cases only) | **High** |
| CSP `connect-src` exact list | new silent network peer | manual (checklist §1) | **Medium**: cheap static test |
| Reminder switch stays on after permission revoked | user believes reminders are on | none, not fixed | **Medium** |
| Reminder schedules / never prompts outside toggle | unwanted permission prompts, wrong-day notifications | manual | **Medium** |
| Size caps (`tooBig`, 25 MB, 120 MP); food photo has none | memory exhaustion / crash on huge file | manual; food photo none | **Medium** |
| Boot newer-copy decision | older file overwrites newer data | manual | **Medium** |
| Model verify wired into worker; config files unhashed | unverified weights executed | helper unit-tested; wiring manual | **Medium** |
| `S.active` stripped / 5 MB limit / admin view omits labs | server keeps in-progress workout; health data exposed to admin | none | **Medium** |
| CapacitorHttp sidesteps CSP on Android | CSP not enforced for main-thread fetch | none (inferred) | **Low** |
| `persist()` full-state clone per keystroke | input lag on large states | none, not fixed | **Low** (perf) |
| Instruction packs loaded at boot | slower cold start | none, not fixed | **Low** (perf) |
| Exact-alarm fallback | late reminders | none (plugin behaviour) | **Low** |
| Rate limiting at reverse proxy | unlimited auth attempts if deployed without proxy limits | in-process fallback tested; proxy manual | **Low** |
