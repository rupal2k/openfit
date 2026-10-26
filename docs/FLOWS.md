# OPENFIT — Auth & Permission Flows

Permission-relevant journeys: each protected step's auth check, trust-boundary crossings, and side effects.

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

Chain applied by `readSession()` at `api/server.js:172`:

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
| `PUT /api/data` | readSession → 401 | writes `state-<uid>.json` (atomic rename); strips `active` field |

uid is sanitized to `[a-zA-Z0-9_-]` before building the file path (`server.js:50`).

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

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview and trust boundaries
- [PERMISSIONS.md](PERMISSIONS.md) — role matrix
- [VARIABLES.md](VARIABLES.md) — all config and secrets
- [tests.md](tests.md) — coverage map
