# openfit

Self-hosted offline-first fitness tracker PWA with passkey auth and optional Node.js backend for multi-device sync.

## Language

**Passkey**:
A WebAuthn credential stored in the platform authenticator (Face ID, fingerprint, Windows Hello). The only login mechanism in openfit — there are no passwords.
_Avoid_: password, login credential
<!-- source: api/server.js:1 -->

**Routine**:
A named collection of exercises the user trains on a given weekday or by explicit schedule.
_Avoid_: workout plan, program
<!-- source: frontend/src/store/useStore.js:DEF.routines -->

**Workout**:
A single completed training session — timestamped, containing the logged sets for each exercise.
_Avoid_: session, training (unless quoting user-facing copy)
<!-- source: frontend/src/store/useStore.js:DEF.workouts -->

**Progression**:
The algorithm that derives the next target weight and reps from workout history. Four named policies: `linear`, `greyskull`, `double`, `timed`.
_Avoid_: auto-increment, advancement, auto-progression
<!-- source: frontend/src/lib/progression.js:POLICIES -->

**State**:
The full JSON blob of a user's workout history, routines, bodyweight log, nutrition diary, and preferences. Persisted in localStorage and optionally synced to the server.
_Avoid_: profile, data (too generic in this codebase)
<!-- source: api/server.js:383, frontend/src/store/useStore.js:DEF -->

**Session**:
An authenticated connection represented by the `gymsid` HMAC-SHA256 signed cookie. Contains uid, expiry, and a version counter for global invalidation.
_Avoid_: token, JWT (it is not a JWT)
<!-- source: api/server.js:162 -->

**Challenge**:
A single-use random nonce used in the WebAuthn handshake. Stored in-memory for 5 minutes and deleted on first use (replay protection).
_Avoid_: nonce, token
<!-- source: api/server.js:204 -->

**Admin**:
A user with elevated privileges — can view all users' workout history, manage invite codes, and disable accounts. Granted via `ADMIN_UIDS` environment variable or `user.admin` field in `db.json`.
_Avoid_: superuser, moderator
<!-- source: api/server.js:43 -->

**DATA_DIR**:
The filesystem directory where the API server persists all data: `db.json`, per-user state files, the session signing secret, and VAPID keys.
_Avoid_: database, data volume (it is a directory of flat JSON files)
<!-- source: api/server.js:14 -->

**Presence**:
Ephemeral in-memory record of which users are actively in a workout right now (heartbeat from `POST /api/activity`). Never persisted. Shown on the admin dashboard.
_Avoid_: online status, activity log
<!-- source: api/server.js:244 -->
