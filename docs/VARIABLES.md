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
| `VAPID_SUBJECT` | server.js:60 | server | env | `mailto:admin@localhost` (HTTP) or ORIGIN (HTTPS) | low | Web Push service contact URI |

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
| `VITE_MOBILE` | `frontend/src/lib/mobile.js` | `false` | `1` for Capacitor/Android build |
| `VITE_DEMO` | `frontend/src/lib/demo.js` | `false` | Enables demo seed data on first load |

No secret values are injected into the frontend bundle.

---

## New environment variables (added production-hardening branch)

| Name | Code ref | Scope | Source | Default | Risk | Notes |
|------|----------|-------|--------|---------|------|-------|
| `RATE_LIMIT_MAX` | server.js | server | env | `20` | none | Max auth requests per IP per 60s (fallback; reverse proxy's limit takes precedence) |
| `TRUST_PROXY` | server.js | server | env | `false` | medium | `1/true` = read `X-Forwarded-For` for rate limiter IP. Only set if nginx forwards a trusted header. |

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
