# Security Audit — openfit

**Scope:** full repository  
**Date:** 2026-10-26  
**Method:** pm-ai-shipping:security-audit-static, intended-vs-implemented  
**Primary file reviewed:** `api/server.js` (584 lines), `frontend/src/lib/api.js`, `frontend/src/store/useStore.js`  
**Intent baseline:** `docs/ARCHITECTURE.md`, `docs/PERMISSIONS.md`, `docs/VARIABLES.md`

---

## Findings

### `api/server.js`

**1. [LOW] Information Disclosure — user count exposed to unauthenticated callers**

Evidence: `api/server.js:264`
```js
'GET /api/health': async (req, res) => json(res, 200, { ok: true, users: db.users.length }),
```
Risk Level: Low  
Attack Scenario: Any unauthenticated caller can determine how many accounts exist on the instance, which is useful reconnaissance for a brute-force or invite-guessing campaign.  
Impact: Minor enumeration signal; no direct exploitation path.  
Solution: Remove `users` from the health response, or gate it behind auth.

---

**2. [MEDIUM] Missing server-side rate limiting — delegated to reverse proxy with no enforcement**

Evidence: `api/server.js:17–20` (comment), `api/server.js:275` (`POST /api/register/options`), `api/server.js:330` (`POST /api/login/options`)
```js
// The app has no rate limiting by design (that's the reverse proxy's job)
```
Risk Level: Medium  
Attack Scenario: An instance deployed directly on the internet without nginx/Caddy in front (a common self-hosting mistake) accepts unlimited registration and login challenge requests. With `INVITE_ONLY=false`, an attacker can register thousands of accounts or exhaust the in-memory challenge store.  
Impact: Unlimited account creation; potential DoS of the challenge Map.  
Solution: Document in `VARIABLES.md`'s pre-go-live checklist that a rate-limiting reverse proxy is a hard deployment requirement, not optional. Optionally add a minimal in-process counter (e.g. 20 req/min per IP for auth endpoints).

---

**3. [MEDIUM] Two independent admin grant paths — `user.admin` db flag is undocumented**

Evidence: `api/server.js:43`
```js
const isAdmin = user => !!user && (user.admin === true || ADMIN_UIDS.includes(user.id));
```
Risk Level: Medium  
Attack Scenario: If `db.json` is exposed (e.g. a misconfigured volume, a backup stored in a web-accessible location) and then later restored by an attacker, setting `"admin": true` on any user grants admin access without being in `ADMIN_UIDS`. This is a second admin escalation path that is not mentioned anywhere in the current docs.  
Impact: Admin privilege escalation via db.json manipulation.  
Solution: Either (a) remove `user.admin` from `isAdmin()` and rely solely on `ADMIN_UIDS`, or (b) add an explicit warning to `VARIABLES.md` and the pre-go-live checklist: "ensure `db.json` is not web-accessible and backups are stored securely."

---

**4. [LOW] Session cookie missing `__Host-` prefix**

Evidence: `api/server.js:199`
```js
return `gymsid=${makeSession(user)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly;${SECURE} SameSite=Lax`;
```
Risk Level: Low  
Attack Scenario: Without the `__Host-` prefix, a subdomain of the deployment host could set a `gymsid` cookie that the API accepts (in a scenario where the operator also controls subdomains). `SameSite=Lax` already mitigates most CSRF vectors.  
Impact: Defense-in-depth gap; no practical exploit path for a typical single-subdomain deployment.  
Solution: Change to `__Host-gymsid=...` (requires Secure flag, so only on HTTPS). Already conditional on `SECURE`, so the change is clean.

---

**5. [LOW] No structured audit log for auth events**

Evidence: `api/server.js:365`, `api/server.js:192`, throughout  
```js
console.error(key, e);
// ...
if (!user) { json(res, 401, { error: 'not signed in' }); return null; }
```
Risk Level: Low  
Attack Scenario: Auth failures, access-control denials, and admin operations go to `console.error` with no structured format. There is no audit trail for incident response (e.g., "which IP logged in as admin at time T?").  
Impact: A09 Logging and Monitoring — post-incident investigation is blind.  
Solution: Add structured JSON logging for: login success/failure (with uid, IP header), admin actions (admin uid, target uid, action), session invalidation events.

---

**6. [INFO] `atomicWrite` using `renameSync` — not truly atomic on Windows**

Evidence: `api/server.js:45–48`
```js
function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}
```
Risk Level: Info  
Attack Scenario: On Windows, `fs.renameSync` can throw `EPERM` if another process holds the target file open at the rename moment. Unlikely in practice (state file reads are brief), but a Windows self-hosted deployment could see intermittent write failures.  
Impact: Rare write failure causing state sync to fail silently (the error is caught at server.js:579).  
Solution: Add error handling around `atomicWrite` and surface the failure to the client rather than swallowing it in the route catch-all.

---

## What is well-built

The session and auth implementation is strong:

- **HMAC-SHA256 with timing-safe compare** (server.js:159): `crypto.timingSafeEqual` prevents timing oracle on session tokens.
- **Single-consume challenges** (server.js:210): `takeChallenge` deletes the entry on first call — replay protection is structural, not a flag check.
- **Session version bumping** (server.js:375–381): `POST /api/logout/all` increments `user.sv`, making every prior cookie cryptographically invalid without needing to store a revocation list.
- **Atomic file writes** (server.js:45): tmp-file + rename prevents partial-write corruption of state files.
- **Path traversal prevention** (server.js:50): `uid.replace(/[^a-zA-Z0-9_-]/g, '')` is a whitelist, not a blacklist — robust against Unicode tricks.
- **5 MB body limit** (server.js:27): prevents memory exhaustion from large POST bodies.
- **`no-store` on all API responses** (server.js:219): prevents sensitive data landing in proxies or browser caches.
- **Invite re-checked at commit time** (server.js:313): the TOCTOU window between options and verify is closed — invite validity is re-verified at the moment it is consumed.
- **Admin cannot disable another admin** (server.js:529): guard prevents privilege revocation of the last admin.
- **WebAuthn counter validation** (via @simplewebauthn/server): replay of cloned authenticator credentials is detected via counter mismatch.

## OWASP Top 10 coverage

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | ✅ audited | 2 findings: user count leak, admin db-flag path |
| A02 Cryptographic Failures | ✅ no issues | HMAC-SHA256, timing-safe, secrets in file system at mode 0o600 |
| A03 Injection | ✅ no issues | path traversal blocked; food proxy uses encodeURIComponent |
| A04 Insecure Design | ⚠️ finding #2 | rate limiting delegated without documentation as hard requirement |
| A05 Security Misconfiguration | ✅ documented | CSP delegated to nginx (correct); Secure cookie conditional on HTTPS |
| A06 Vulnerable Components | ✅ no issues at review date | @simplewebauthn/server@13.1.1, web-push@3.6.7 — no known CVEs |
| A07 Authentication and Session | ✅ well-implemented | WebAuthn + HMAC session + logout/all version bump |
| A08 Software/Data Integrity | ✅ no issues | atomic writes; WebAuthn signature verification |
| A09 Logging and Monitoring | ⚠️ finding #5 | no structured audit log |
| A10 SSRF | ✅ low risk | food proxy forwards query string only via fetch + encodeURIComponent |

## What could not be verified

- **nginx CSP configuration**: not in the repository. The architecture relies on nginx serving a strong `Content-Security-Policy` header but the nginx config is not committed. A missing or weak CSP would be a significant XSS vector.
- **React admin dashboard XSS safety**: the admin views that render user-supplied workout names and routine names were not audited. React's default JSX escaping provides baseline protection, but any `dangerouslySetInnerHTML` usage would bypass it.
- **Capacitor/Android build trust model**: the Android build uses a Capacitor WebView. It talks to no server, so passkey credential handling is platform-managed. Not audited.
