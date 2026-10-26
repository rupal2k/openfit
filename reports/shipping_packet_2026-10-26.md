# Shipping Packet — openfit

**Repository:** `D:\Agentic projects\openfit`  
**Date:** 2026-10-26  
**Method:** pm-ai-shipping:ship-check — Steps 1–7 completed in prior session; Step 2 (agent context) and Step 8 (this packet) completed this session  
**Last production work (from graph + git log):** CI gate (`bfc94bc`), Android release signing v1.3.3 (`ad3f73e`), set-validation bug-fixes (`c02f407`, `d0febcf`)

---

## Graph Summary

Code module dependency graph at `docs/graph.html` — 913 total nodes:

| Group | Nodes | Notes |
|---|---|---|
| frontend | 702 | React/Vitest; Zustand store; progression, nutrition, 1RM libs |
| api | 49 | `server.js` — Node.js ESM, no framework |
| docs | 39 | ADRs, plans, architecture |
| scripts | 27 | Build / release helpers |
| ref | 27 | Configuration references |
| security | 6 | Security-related docs/configs |
| docker | 3 | Compose + Dockerfile |

The graph confirms the architecture: frontend carries the bulk of the logic (progression policies, validation, nutrition), the API is intentionally lean (auth, state sync, admin, push).

---

## Documentation Inventory

| Doc | Path | Status | Notes |
|---|---|---|---|
| Architecture | `docs/ARCHITECTURE.md` | **created** prior session; Related Documents table added | Stack, auth flow, trust boundaries |
| Flows | `docs/FLOWS.md` | **created** prior session | Registration, login, data sync, admin flows |
| Permissions | `docs/PERMISSIONS.md` | **created** prior session | Role matrix, session rules |
| Variables | `docs/VARIABLES.md` | **created** prior session | Env vars, secrets, pre-go-live checklist |
| Tests | `docs/tests.md` | **created** prior session | Coverage map: 15 existing, 7 proposed, 6 gaps |
| Agent instructions | `CLAUDE.md` | **updated** this session | Added trust boundaries + system docs table |
| Context | `CONTEXT.md` | pre-existing | Domain glossary |
| State machines | `state_machines.md` | pre-existing | Progression policy lifecycles |
| Data flow | `data_flow.md` | pre-existing | State sync data movement |
| Security report | `reports/security_audit_2026-10-26.md` | **created** prior session | 2 MEDIUM + 3 LOW + 1 INFO |
| Performance report | `reports/performance_audit_2026-10-26.md` | **created** prior session | 2 HIGH + 1 MEDIUM + 1 LOW |
| emails.md | — | **n/a** | No transactional email; only web-push notifications |
| cron.md | — | **n/a** | No cron; reminder loop is in-process `setInterval` |
| seo.md | — | **n/a** | Auth-gated PWA — no public/indexable pages |
| automation.md | — | **n/a** | On-device AI (HuggingFace) runs client-side; no server-side LLM calls |

---

## Agent Context

**File edited:** `CLAUDE.md` — updated this session  
**Changes:** Added "Trust boundaries — do not bypass" section (8 invariants covering `stateFile`, `isAdmin`, session version, challenge single-consume, `atomicWrite`, TOCTOU, secrets, AGPL); added system documentation table.

---

## Test Coverage

**Frontend:** 407 Vitest unit tests. All run in CI on every push/PR.  
**API:** ~40 integration tests in `api/api.test.js`. Now run in CI via `test-api` job (added `bfc94bc`).  
**Gate:** push/PR → `test-api` (API integration) + `test-build` (Vitest + production build + `node --check server.js`). Node 22, ubuntu-latest.

**Existing coverage highlights:**
- All 4 progression policies + deload (unit)
- Set validation: all modes, boundary values, weight caps, typo detection (unit)
- All protected routes return 401 without auth (integration)
- Challenge replay protection — second use of same cid → 400 (integration)
- Logout clears cookie Max-Age=0 (integration)
- Register/options validates name (integration)
- `node --check server.js` syntax gate in CI

**Proposed (7 cases — see `docs/tests.md`):**
- INVITE_ONLY registration gate (integration)
- Session version bump after logout/all (integration)
- Disabled account blocked at login/verify (integration)
- Admin 403 for authenticated non-admin (integration)
- Invite TOCTOU protection (integration)
- `stateFile` path sanitization (unit)
- Admin cannot disable admin (integration)

**Top unverified gaps:**
1. Rate limiting — no test; deployment dependency on reverse proxy not documented as hard requirement
2. `user.admin` db flag as alternate admin escalation path — not in tests
3. CSP header served by nginx — manual only

---

## Correctness Summary

Reviewed: `api/server.js` — auth flow, progression policies, set validation. No authority reconciliation or identity correlation bugs found.

**Note:** The `isAdmin()` function has two separate grant paths (`ADMIN_UIDS` env array and `user.admin` db flag). These are logically equivalent in intent but diverge in operational security — the db flag path means a leaked `db.json` backup can escalate any user to admin without any env change. This is documented in the security report and the CLAUDE.md trust boundary section. It is a design decision that should be explicitly acknowledged, not an oversight.

---

## Security Summary

**2 MEDIUM + 3 LOW + 1 INFO findings.**

| # | Severity | Finding | File | Fix |
|---|---|---|---|---|
| 1 | MEDIUM | No server-side rate limiting — reverse proxy dependency undocumented as hard requirement | `server.js:17–20` | Add to `VARIABLES.md` pre-go-live checklist as hard requirement (not optional) |
| 2 | MEDIUM | `user.admin` db flag — second undocumented admin escalation path | `server.js:43` | Either remove from `isAdmin()` (rely solely on `ADMIN_UIDS`), or add explicit warning to `VARIABLES.md` and pre-go-live checklist |
| 3 | LOW | User count exposed at `/api/health` to unauthenticated callers | `server.js:264` | Remove `users` from health response, or gate behind auth |
| 4 | LOW | Session cookie missing `__Host-` prefix | `server.js:199` | Change to `__Host-gymsid=...` (requires Secure) |
| 5 | LOW | No structured audit log for auth events | `server.js:365` | Structured JSON logging for login/fail/admin actions |
| 6 | INFO | `atomicWrite` renameSync not truly atomic on Windows | `server.js:45–48` | Error handling + surface failure to client |

**What is well-built:** HMAC-SHA256 timing-safe session, single-consume challenges, session version revocation (logout/all), atomic state writes, path traversal whitelist, 5 MB body limit, `no-store` on all API responses, invite re-checked at verify time, WebAuthn counter validation, admin-cannot-disable-admin guard.

Full report: `reports/security_audit_2026-10-26.md`

---

## Performance Summary

**2 HIGH + 1 MEDIUM + 1 LOW findings.**

| Finding | File | Recommendation | Effort | Priority |
|---|---|---|---|---|
| N+1 sync file reads in `GET /api/admin/users` | `server.js:491–503` | `Promise.all` over async `fs.readFile` | Low | **High** |
| Sync file reads in `setInterval` reminder checker | `server.js:122–145` | Per-user state cache `Map<uid, {state, loadedAt}>`, invalidated on `PUT /api/data` | Medium | **High** |
| Unbounded workout history in `GET /api/admin/user` | `server.js:521` | `?limit=100&offset=0` pagination | Low | Medium |
| Full state write on every sync (`PUT /api/data`) | `server.js:392`, `useStore.js:57` | Acceptable for 1–5 users; consider differential patches at 20+ active users | High | Low |

**What is already efficient:** incremental frontend sync (debounced 1.5 s), Vite production build with code splitting, on-device AI (no server inference), WebAuthn (no password hashing on server), state-per-user files (no cross-user locking).

Full report: `reports/performance_audit_2026-10-26.md`

---

## Independent Review

**Step 6 — Independent Unsteered Review**

Not run for this session. A second model-family session was not available.

**Owner action required:** Before deploying to a public or multi-user instance, run an independent review with:
```bash
git log --oneline HEAD~10..HEAD
git diff HEAD~10..HEAD
```
Pass the diff (not this audit's findings) to a fresh session of a different model family and apply the code-review skill's keep/drop rule to any findings that come back.

---

## Audit Provenance

| Step | Model | Notes |
|---|---|---|
| Steps 1–7: Documentation + audits + tests | Claude Sonnet 4.6 (prior session) | Prior session; reports and docs already on disk |
| Step 2 refresh: agent context update | Claude Sonnet 4.6 (this session) | CLAUDE.md updated with trust boundaries |
| Step 8: Shipping packet | Claude Sonnet 4.6 (this session) | This document |
| Step 6: Independent review | **Not run** | No other model family available; see owner action |

---

## Launch Blockers

**For a personal self-hosted instance (1–5 users, behind a home router):**
- No critical blockers. The two MEDIUM security findings are mitigated by deployment context (nginx/Caddy in front, private network).
- **Must verify before go-live:** `VARIABLES.md` pre-go-live checklist — especially `SESSION_SECRET`, `VAPID_PRIVATE_KEY`, HTTPS + nginx CSP configuration.

**For a public or multi-user deployment (open registration, internet-accessible):**

1. **[BLOCKER] Rate limiting must be explicitly configured.** The API has no in-process rate limiting. An internet-facing instance without nginx rate limits accepts unlimited auth requests. Document in nginx config as a required step; consider adding in-process fallback (20 req/min per IP on `/api/register/*` and `/api/login/*`).

2. **[BLOCKER] `user.admin` db flag path must be audited.** If using a shared `db.json` that operators can edit (e.g. a Render deployment with a persistent volume), the undocumented `user.admin` flag is a privilege escalation risk. Either remove it from `isAdmin()` or add explicit operator-facing documentation that `db.json` must never be world-readable.

3. **[RECOMMENDED] Fix N+1 synchronous I/O in admin routes and reminder loop** before scaling past ~20 users. The reminder checker blocks the event loop on every tick; at 50 users this becomes visible latency.

**Not blockers (but recommended before next AI editing session):**
- Write proposed tests P1–P7 (especially INVITE_ONLY, session version, disabled account)
- Add `__Host-` prefix to session cookie
- Add structured auth audit logging
- Step 6 independent review

---

## Recommended Next Actions

**For production go-live:**
1. Work through `docs/VARIABLES.md` pre-go-live checklist.
2. For public deployment: configure nginx rate limiting on `/api/register/*` and `/api/login/*` before exposing to internet.
3. Decide: remove `user.admin` from `isAdmin()`, or add explicit warning to operator docs.
4. Verify nginx CSP header is configured (not in repo — must be set at deploy time).

**Short-term code fixes (low effort, high impact):**
5. `GET /api/admin/users`: switch to `Promise.all` over async `fs.readFile`.
6. Reminder loop: add per-user state cache, invalidated on `PUT /api/data`.
7. Remove `users` from `/api/health` (or gate behind auth).

**Testing (before next AI edit):**
8. Write P1 (INVITE_ONLY gate), P2 (session version bump), P4 (admin 403 for non-admin) — these pin the three most-exposure unverified rules.
9. Run Step 6 independent unsteered review before a public-facing deployment.
