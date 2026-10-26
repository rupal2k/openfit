# Performance Audit — openfit

**Scope:** full repository  
**Date:** 2026-10-26  
**Method:** pm-ai-shipping:performance-audit-static  
**Primary files reviewed:** `api/server.js`, `frontend/src/store/useStore.js`

---

## Findings

### `GET /api/admin/users` — N+1 synchronous file reads

- **Finding:** For every user in `db.users`, the handler calls `readState(u.id)` — which is `fs.readFileSync` — synchronously inside a `map()`. This blocks the Node.js event loop for the duration of all file reads. At 50 users with 100 KB state files each, this is 5 MB of blocking synchronous I/O before any response is sent.
- **Evidence:** `api/server.js:491–503`
  ```js
  const users = db.users.map(u => {
    const S = readState(u.id) || {};
    // ...
  });
  ```
- **Recommendation:** Replace with `Promise.all` over async `fs.readFile`:
  ```js
  const users = await Promise.all(db.users.map(async u => {
    const S = await readStateAsync(u.id) || {};
    // ...
  }));
  ```
  where `readStateAsync` wraps `fs.promises.readFile`. This allows Node to interleave I/O with other requests during the reads.
- **Effort:** Low
- **Priority:** High
- **Expected effect:** Admin dashboard response time drops from O(n × disk latency) sequential to O(max single-file latency) parallel; event loop unblocked during reads.

---

### `setInterval` reminder checker — synchronous file reads on hot loop

- **Finding:** The 10-second interval callback at `server.js:122` calls `readState(user.id)` (sync `readFileSync`) for every user that has push subscriptions. For a 100-user instance, this is up to 100 synchronous file reads every 10 seconds — up to 1 MB/s of blocking I/O even when no reminders fire.
- **Evidence:** `api/server.js:122–145`
  ```js
  setInterval(() => {
    for (const user of db.users) {
      if (!db.subs.some(s => s.userId === user.id)) continue;
      const S = readState(user.id);
      // ...
    }
  }, 10000).unref();
  ```
- **Recommendation:** Cache the last-read state per user in a `Map<uid, {state, loadedAt}>`. Invalidate the cache entry when `PUT /api/data` is called for that user. The reminder checker reads from cache; only the first read per session (or after a state push) hits disk.
- **Effort:** Medium
- **Priority:** High
- **Expected effect:** Reminder checker goes from O(n × disk) blocking per tick to O(n) memory lookups; essentially zero I/O for instances where state rarely changes between ticks.

---

### `GET /api/admin/user` — unbounded workout history response

- **Finding:** Returns the full reversed workout history for a user with no pagination:
  ```js
  workouts: (S.workouts || []).slice().reverse()
  ```
  A user with 3 years of daily workouts at ~2 KB per entry has ~2 MB of workout data. This is returned in one response.
- **Evidence:** `api/server.js:521`
- **Recommendation:** Add `?limit=100&offset=0` query parameters. Default `limit=100` covers most admin inspection use cases.
- **Effort:** Low
- **Priority:** Medium
- **Expected effect:** Typical admin-panel response drops from potentially megabytes to a few KB.

---

### `PUT /api/data` — full state write on every sync

- **Finding:** Every sync call writes the entire Zustand state JSON, including years of workout history. At 500 workouts × 2 KB per workout, this is a 1 MB write every time the user logs a set (debounced to 1.5 s).
- **Evidence:** `api/server.js:392–400`, `frontend/src/store/useStore.js:57–66`
- **Recommendation:** For personal instances (1–5 users) this is acceptable — JSON file writes are fast and atomic. For a family/group instance with 20+ active users, consider: (a) a differential patch format, or (b) separating immutable workout history from mutable preferences.
- **Effort:** High
- **Priority:** Low
- **Expected effect:** Only relevant at 500+ workouts per user or 20+ concurrent active users.

---

## What is already efficient

- **Food search cache:** 10-min TTL in-memory Map with 500-entry FIFO cap is well-matched to the use case. Search-as-you-type repeats the same queries; the cache eliminates nearly all outbound requests in practice.
- **Challenge and presence Maps:** in-memory with automatic TTL cleanup; correct use of `setInterval(...).unref()` to avoid keeping the process alive.
- **Atomic writes:** `tmp + renameSync` pattern avoids double-write; writes are cheap for the expected file sizes.
- **No SELECT * equivalent:** the API fetches only per-user state files; there is no broad scan of all users' data except in the admin endpoints covered above.
- **Service worker caching:** media (GIFs/images) served cache-first by the service worker; app assets served network-first with offline fallback. No repeated large downloads from the API.
- **VAPID key generated once:** push keys are generated on first start and persisted; no per-request crypto.
- **Body limit:** 5 MB cap prevents memory exhaustion from large payloads.

## What needs runtime profiling to confirm

- **`PUT /api/data` write latency** for real users with large state: the 1.5 s debounce means writes are infrequent per user, but the payload size is unknown without real usage data.
- **Reminder checker CPU impact at 100+ users:** the `setInterval` runs every 10 s; the per-tick cost depends on the number of push-subscribed users and their state file sizes. Load testing with a synthetic 100-user `db.json` would give a concrete number.
- **Admin users endpoint wall time** for large instances: the blocking behavior is definite, but the actual latency depends on disk speed and state file sizes. On SSD, even 100 synchronous reads may complete in under 100 ms; on a spinning disk NAS, it could be seconds.
