# Test Coverage — openfit

Coverage map produced by ship-check. **Existing** = a test in the repo asserts this today. **Proposed** = recommended but not yet written. **None** = no verification at all.

## Coverage table

| Use case | Rule | Expected behavior (+ deny case) | Evidence | Type | Status |
|----------|------|----------------------------------|----------|------|--------|
| Progression: linear policy | weight increases when all reps hit | correct next weight computed | `lib/progression.test.js` | unit | **existing** |
| Progression: Greyskull policy | AMRAP set triggers advance | correct threshold logic | `lib/progression.test.js` | unit | **existing** |
| Progression: double policy | two consecutive hits required | no advance on single hit | `lib/progression.test.js` | unit | **existing** |
| Progression: timed policy | time-based advance | correct behavior | `lib/progression.test.js` | unit | **existing** |
| Progression: deload | missed sessions trigger deload | correct deload weight | `lib/progression.test.js` | unit | **existing** |
| Set validation: all modes | reps/BW/timed/cardio accepted | invalid mode rejected | `lib/validate-set.test.js` | unit | **existing** |
| Set validation: weight caps | kg/lb limits enforced | over-cap input rejected | `lib/validate-set.test.js` | unit | **existing** |
| Set validation: typo detection | near-miss inputs flagged | clean input passes | `lib/validate-set.test.js` | unit | **existing** |
| API: health endpoint | returns 200 ok:true | — | `api/api.test.js:76` | integration | **existing** |
| API: config invite_only default | returns false | — | `api/api.test.js:84` | integration | **existing** |
| API: all protected routes 401 | unauthenticated → 401 | authenticated → not 401 | `api/api.test.js:180` | integration | **existing** |
| API: admin routes 401 | unauthenticated → 401 | authenticated non-admin → not tested | `api/api.test.js:202` | integration | **existing** |
| API: register/options validates name | empty name → 400 | valid name → 200 | `api/api.test.js:101` | integration | **existing** |
| API: challenges are unique | two challenges differ | — | `api/api.test.js:145` | integration | **existing** |
| API: challenge replay protection | second use of same cid → 400 | first use → 404 (not 400) | `api/api.test.js:245` | integration | **existing** |
| API: logout clears cookie | Max-Age=0 set | — | `api/api.test.js:170` | integration | **existing** |
| API: VAPID public key public | no auth needed, returns key | — | `api/api.test.js:224` | integration | **existing** |
| API: 404 for unknown routes | unmapped path → 404 | wrong method → 404 | `api/api.test.js:232` | integration | **existing** |
| INVITE_ONLY gates registration | missing/used invite → 403 | valid invite → 200 | INVITE_ONLY flag; server.js:280 | integration | **proposed** |
| Session version bump invalidates old cookies | prior cookie after logout/all → 401 | new cookie after logout/all → 200 | server.js:375 | integration | **proposed** |
| Disabled account blocked at login | login/verify with disabled user → 403 | enabled account → 200 | server.js:365 | integration | **proposed** |
| Admin cannot disable admin | disable-admin request → 400 | disable non-admin → 200 | server.js:529 | integration | **proposed** |
| Invite TOCTOU protection | invite revoked between options+verify → 403 | unrevoked invite completes | server.js:313 | integration | **proposed** |
| stateFile path sanitization | traversal chars stripped from uid | safe uid preserved | server.js:50 | unit | **proposed** |
| Admin 403 for authenticated non-admin | auth user without admin uid → 403 | admin uid → 200 | server.js:192 | integration | **proposed** |
| Rate limiting (reverse proxy dependency) | documented deployment requirement | — | VARIABLES.md | manual | **none** |
| CSP header served by nginx | documented nginx requirement | — | ARCHITECTURE.md | manual | **none** |
| Service worker offline caching | app loads offline after first visit | stale asset after update cleared | `public/sw.js` | manual | **none** |
| React admin dashboard XSS safety | workout names rendered safely | `<script>` in workout name is escaped | React default escaping | manual | **none** |

---

## Existing coverage

The repo has two test layers today:

**Frontend unit tests (Vitest, 407 tests across ~20 files in `frontend/src/`):**
- `lib/progression.test.js` — all 4 progression policies, deload, bodyweight, per-exercise overrides, legacy history
- `lib/validate-set.test.js` — all set modes, boundary values, weight caps kg/lb, typo detection, CSV import
- Other lib tests cover: nutrition tracking, 1RM calculation, effort scoring, exercise history, muscle targeting

**API integration tests (`api/api.test.js`, ~40 tests):**
- Spawns a real server process against a temp DATA_DIR on port 19473
- Covers: health, config, 401s on all protected routes, register/options edge cases, login/options uniqueness, challenge replay, logout cookie clearing, VAPID public key, 404 routing
- **Not currently in CI** (see Gaps below)

---

## Proposed tests

### Auth flows (integration, `api/api.test.js`)

**INVITE_ONLY registration gate:**
```
Arrange: start server with INVITE_ONLY=true, valid invite code in db
Act: POST /api/register/options with no code
Assert: 403 with error matching /invite/i
Negative: POST with valid code → 200
```

**Session version after logout/all:**
```
Arrange: register a user, capture session cookie A
Act: POST /api/logout/all with cookie A
Assert: GET /api/me with cookie A → 401
Negative: fresh login returns cookie B → GET /api/me 200
```

**Disabled account at login/verify:**
```
Arrange: register user, manually set disabled:true in db via test hook
Act: POST /api/login/verify with valid passkey credential
Assert: 403 with error matching /disabled/i
```

**Admin 403 for non-admin:**
```
Arrange: register a normal user (no ADMIN_UIDS match)
Act: GET /api/admin/users with that user's session
Assert: 403
```

**Invite TOCTOU:**
```
Arrange: start server with INVITE_ONLY=true, create invite code
Act: POST /api/register/options to get cid → revoke invite → POST /api/register/verify with cid
Assert: 403 with error matching /invite/i
```

### Server unit tests (new file: `api/server.test.js`)

**stateFile sanitization:**
```
Assert: stateFile('../../etc/passwd') does not contain '..'
Assert: stateFile('abc-123_XYZ') === path.join(DATA, 'state-abc-123_XYZ.json')
```

---

## Gate

**Current gate** (`.github/workflows/ci.yml`): push/PR → `npm ci` → `npm test` (Vitest 407 tests) → `npm run build` → `node --check ../api/server.js`. **Node 22, ubuntu-latest.**

**Gap:** API integration tests are not in the gate. `api/api.test.js` exists and passes locally but is never run in CI. Proposed addition to `.github/workflows/ci.yml`:

```yaml
  test-api:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: api/package-lock.json
      - run: npm ci
      - run: npm test
```

Guarded-live and manual tests never gate the default run.

---

## Gaps — documented but unverified

| Rule | Risk if crossed | Priority |
|------|----------------|----------|
| Rate limiting delegated to reverse proxy | Unlimited registration/login if deployed without nginx | **High** |
| `user.admin` db flag as alternate admin path | db.json leak escalates any user to admin | **High** |
| CSP header from nginx | XSS if nginx omits the header | **Medium** |
| Service worker update/stale caching | Users stuck on old app version | **Medium** |
| React admin dashboard safe rendering | Stored XSS if workout data rendered without escaping | **Medium** |
| `atomicWrite` race on Windows | Partial write corruption on Windows self-hosted deployments | **Low** |
