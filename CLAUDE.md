# OPENFIT — Self-hosted fitness tracker

## What this is
A self-hosted PWA + Android app for training, body-weight and nutrition tracking.  
Stack: **React 19 + Vite 8 + Zustand** (frontend) · **Node.js ESM, no framework** (API) · **Docker Compose** (deployment).

## Repository layout
```
api/             Node.js backend (server.js, passkey auth, per-user JSON data)
frontend/        React PWA (Vite build, Capacitor for Android)
  src/           React source
  public/        SW, manifest, icons
  android/       Capacitor Android project
  lab/           spike experiments (not shipped)
docs/            Architecture, mobile, self-hosting guides, ADRs
media/           Exercise GIFs + images (~140 MB, downloaded by Docker at first run)
assets/          Logo, banner, screenshots
```

## Dev workflow
```bash
# Start API (port 3000)
cd api && node server.js

# Start frontend dev server (port 5173, proxies /api → :3000)
cd frontend && npx vite

# Run all tests (407 tests, Vitest)
cd frontend && npx vitest run

# Docker Compose (full stack, port 8080)
docker compose up
```

## Environment
Copy `.env.example` → `.env` before running Docker or the API.  
Key vars: `RP_ID`, `ORIGIN`, `WEB_PORT`, `RP_NAME`, `INVITE_ONLY`.

## Tech notes
- API uses **WebAuthn passkeys** (`@simplewebauthn/server`) — no passwords.
- Frontend uses **@huggingface/transformers** for on-device food photo recognition (101 dishes, ~120 MB model, downloaded once).
- Exercise media served from `./media/` (populated by Docker `media` service from `hasaneyldrm/exercises-dataset`).
- For mobile builds: `npm run build:mobile` then `cap sync` then open in Android Studio.

## Trust boundaries — do not bypass

- **`DATA_DIR` owns all user state.** Every user state file lives at `DATA_DIR/state-<uid>.json`. The UID is sanitized by a whitelist (`/[^a-zA-Z0-9_-]/g`) before building the path. Never bypass `stateFile()` to build paths manually.
- **`isAdmin()` is the sole auth gate for admin routes** (`api/server.js:43`). The function checks both `ADMIN_UIDS` (env) and `user.admin` (db flag). Adding new admin routes must call `requireAdmin()`, not inline the check. **Do not widen `isAdmin()` without auditing the two paths.**
- **Session tokens are single-use-derivable.** `makeSession` uses HMAC-SHA256 over `uid + sv`. The `sv` (session version) increment in `logout/all` is the entire revocation mechanism — do not skip or cache it.
- **Challenges are single-consume.** `takeChallenge` deletes on first call. Never cache or re-use a challenge ID across requests.
- **`atomicWrite` must be used for all state writes.** Direct `fs.writeFileSync` on state files bypasses the tmp+rename guard and risks partial-write corruption on concurrent requests.
- **`INVITE_ONLY` is re-checked at `/api/register/verify`.** Do not accept an invite token at options time and skip the check at verify time — the TOCTOU window is closed deliberately.
- **Secrets in `.env` — never commit.** `SESSION_SECRET`, `VAPID_PRIVATE_KEY`, `ADMIN_UIDS` are all env-only. The `.env` file is gitignored; `.env.example` is the committed template.
- **AGPL-3.0**: any modifications served over a network must be open-sourced.

## System documentation

| Doc | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | System overview, stack, trust boundaries, auth flow |
| `docs/FLOWS.md` | Step-by-step flows with auth checks and deny cases |
| `docs/PERMISSIONS.md` | Role × resource matrix, session/admin rules |
| `docs/VARIABLES.md` | Env vars, secrets risk map, pre-go-live checklist |
| `docs/tests.md` | Test coverage map: existing / proposed / gaps |
| `reports/security_audit_2026-10-26.md` | Security audit — 2 MEDIUM + 3 LOW + 1 INFO |
| `reports/performance_audit_2026-10-26.md` | Performance audit — 2 HIGH + 1 MEDIUM findings |

## Branches
- `main` — primary development
- `feat/photo-logging` — on-device AI photo logging feature
