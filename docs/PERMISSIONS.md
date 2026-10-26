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
| `readSession(req)` | `server.js:172` | validates cookie signature, expiry, version, disabled flag |
| `requireAdmin(req, res)` | `server.js:192` | wraps `readSession` + `isAdmin` for all `/api/admin/*` |
| `stateFile(uid)` path sanitization | `server.js:50` | strips non-alphanumeric chars from uid to prevent path traversal |
| invite re-check at verify | `server.js:313` | prevents TOCTOU: invite is re-verified at `register/verify`, not just `register/options` |
| admin-on-admin disable guard | `server.js:529` | prevents admin from disabling another admin |
| `delete body.state.active` | `server.js:397` | prevents server from persisting in-progress workout |

---

## What the API does NOT check

- **Rate limiting** — explicitly delegated to the reverse proxy (nginx / Caddy). No built-in rate limiting.
- **CSRF** — not applicable: the API is cookie-based with `SameSite=Lax`; state-changing calls are POST/PUT (not GET); the app makes no CORS cross-origin requests.
- **Content-Security-Policy** — served by nginx, not the API.

---

## Related documents

- [FLOWS.md](FLOWS.md) — step-by-step auth journeys
- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview and trust boundaries
- [VARIABLES.md](VARIABLES.md) — config that grants admin privileges (`ADMIN_UIDS`)
