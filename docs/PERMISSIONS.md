# OPENFIT — Permissions

## Roles

| Role | How granted | Notes |
|------|------------|-------|
| **Anonymous** | No session cookie | Can reach public endpoints only |
| **Authenticated** | Valid `gymsid` session cookie | Any registered user with an active account |
| **Admin** | uid listed in `ADMIN_UIDS` env var, or `user.admin === true` in `db.json` | Checked by `isAdmin()` on every admin route |

Scope is derived at runtime: `readSession(req)` validates the cookie signature and version, then looks up the user in `db.users`. Admin status is re-evaluated from `ADMIN_UIDS`/`user.admin` on every request — a change to `ADMIN_UIDS` takes effect immediately without restart.

Session version (`user.sv`) is checked on every request. `POST /api/logout/all` increments it, invalidating all existing sessions for that user.

---

## Resource × Operation × Role matrix

| Resource / Endpoint | GET (read) | POST / PUT (write) | Anonymous | Authenticated | Admin |
|---------------------|-----------|-------------------|-----------|--------------|-------|
| `/api/health` | status + user count | — | ✅ | ✅ | ✅ |
| `/api/config` | invite_only flag | — | ✅ | ✅ | ✅ |
| `/api/push/public-key` | VAPID public key | — | ✅ | ✅ | ✅ |
| `/api/me` | caller's own profile | — | ❌ 401 | ✅ (own) | ✅ |
| `/api/register/options` | — | start passkey signup | ✅ (invite checked if required) | — | — |
| `/api/register/verify` | — | complete passkey signup | ✅ (challenge required) | — | — |
| `/api/login/options` | — | start passkey login | ✅ | — | — |
| `/api/login/verify` | — | complete passkey login | ✅ (challenge required) | — | — |
| `/api/logout` | — | clear own session cookie | ✅ (no auth needed) | ✅ | ✅ |
| `/api/logout/all` | — | invalidate all sessions | ❌ 401 | ✅ (own) | ✅ |
| `/api/data` | own state JSON | write own state JSON | ❌ 401 | ✅ (own) | ✅ (own) |
| `/api/food/search` | food results (via OFF) | — | ❌ 401 | ✅ | ✅ |
| `/api/push/subscribe` | — | save push subscription | ❌ 401 | ✅ (own) | ✅ |
| `/api/push/unsubscribe` | — | remove push subscription | ❌ 401 | ✅ (own) | ✅ |
| `/api/push/test` | — | send test push to self | ❌ 401 | ✅ (own) | ✅ |
| `/api/push/rest-timer` | — | set server-side rest timer | ❌ 401 | ✅ (own) | ✅ |
| `/api/push/rest-timer/cancel` | — | cancel own rest timer | ❌ 401 | ✅ (own) | ✅ |
| `/api/activity` | — | set live presence | ❌ 401 | ✅ (own) | ✅ |
| `/api/admin/users` | all users + stats | — | ❌ 401 | ❌ 403 | ✅ |
| `/api/admin/user?id=` | any user's full history | — | ❌ 401 | ❌ 403 | ✅ |
| `/api/admin/user/disable` | — | disable/enable account | ❌ 401 | ❌ 403 | ✅ (non-admin only) |
| `/api/admin/invites` | invite list | — | ❌ 401 | ❌ 403 | ✅ |
| `/api/admin/invites/new` | — | create invite code | ❌ 401 | ❌ 403 | ✅ |
| `/api/admin/invites/revoke` | — | revoke unused invite | ❌ 401 | ❌ 403 | ✅ |
| any unmapped path | — | — | 404 | 404 | 404 |

---

## Row-level vs. code-enforced access

There is no database with row-level security. All access control is **code-enforced** in `api/server.js`:

| Enforcement point | Location | What it guards |
|------------------|----------|----------------|
| `readSession(req)` | `server.js:214` | validates cookie signature, expiry, version, disabled flag |
| `requireAdmin(req, res)` | `server.js:237` | wraps `readSession` + `isAdmin` for all `/api/admin/*` |
| `stateFile(uid)` path sanitization | `server.js:82` | strips non-alphanumeric chars from uid to prevent path traversal |
| invite re-check at verify | `server.js:365` | prevents TOCTOU: invite is re-verified at `register/verify`, not just `register/options` |
| admin-on-admin disable guard | `server.js:601` | prevents admin from disabling another admin |
| `delete body.state.active` | `server.js:463` | prevents server from persisting in-progress workout |

---

## What the API does NOT check

- **Rate limiting** — the reverse proxy is expected to do it. The API has only an in-process fallback on the auth endpoints (`checkRateLimit`, `server.js:45`, `RATE_LIMIT_MAX` per IP per 60 s).
- **CSRF** — not applicable: the API is cookie-based with `SameSite=Lax`; state-changing calls are POST/PUT (not GET); the app makes no CORS cross-origin requests.
- **Content-Security-Policy** — not sent by the API or by nginx. The app ships its own CSP as a `<meta>` tag in `frontend/index.html` (see ARCHITECTURE.md §4).
- **Content of the synced state** — `PUT /api/data` stores whatever state the signed-in user sends (≤ 5 MB), only `active` is stripped. Repair happens in the app (`normalizeState`) on load, not on the server.

### Who can see a user's health data on a self-host server

| Data in `state-<uid>.json` | Owner (`GET /api/data`) | Admin API (`GET /api/admin/user`) | Server operator (disk) |
|---|---|---|---|
| workouts, bodyweight | ✅ | ✅ (workouts paginated, bodyweight in full) | ✅ |
| routines | ✅ | names, emoji and exercise count only | ✅ |
| nutrition diary, lab reports | ✅ | ❌ not returned | ✅ (plain JSON) |

---

## Android app (standalone build)

No accounts and no roles: the person holding the unlocked phone owns all data. Access control is the Android sandbox plus the settings below.

### Manifest permissions (`frontend/android/app/src/main/AndroidManifest.xml`)

| Permission / declaration | Why (code) | When the user is asked |
|---|---|---|
| `INTERNET` | Open Food Facts, jsDelivr media + ONNX runtime, Hugging Face model | never (normal permission) |
| `VIBRATE` | timers (`lib/sound.js`) | never |
| `SCHEDULE_EXACT_ALARM` | workout-day reminder to the minute | Android grants or the user toggles it in system settings; the app never prompts |
| `CAMERA` + `uses-feature camera required=false` | barcode scan via `getUserMedia` in the WebView | on first scan; deny → type the code |
| `<queries>` `IMAGE_CAPTURE` | "Take photo" must see the phone's camera app on Android 11+ | — |
| Notifications (runtime, via `@capacitor/local-notifications`) | reminder | only from the Settings reminder toggle (`syncReminder(…, true)`) |

Not requested: storage/media read permissions (pickers return content URIs), location, contacts, accounts.

### Native surfaces

| Surface | Setting | Effect |
|---|---|---|
| `FileProvider` `${applicationId}.fileprovider` | `exported=false`, `grantUriPermissions=true`; `file_paths.xml`: `external-files-path Pictures/` and `cache-path .` | camera capture file and share-sheet export only; removing `Pictures/` makes Take photo silently open the gallery (commit 6646c16) |
| Backup | `allowBackup=true`; `backup_rules.xml` (Android 6–11) excludes everything; `data_extraction_rules.xml` (12+) excludes everything from cloud backup, keeps default device-to-device transfer | no health data in Google cloud backup |
| `PrivacyScreen` plugin (`PrivacyScreenPlugin.java`) | `set({on})` adds/clears `FLAG_SECURE` | on while `views/Labs.jsx` is mounted |
| `MainActivity` | `singleTask`, exported launcher only; Back → WebView history, then exit | — |
| WebView | `allowMixedContent: false`; `CapacitorHttp` enabled | see ARCHITECTURE.md §6 on CSP |

---

## Related documents

- [FLOWS.md](FLOWS.md) — step-by-step auth journeys
- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview and trust boundaries
- [VARIABLES.md](VARIABLES.md) — config that grants admin privileges (`ADMIN_UIDS`)
- [MOBILE.md](MOBILE.md) — Android build and native config
