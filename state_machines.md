# State Machines — openfit

> Entity lifecycles: what states exist, how transitions happen, what guards them.

## User account

**States:** active, disabled  
**Initial:** active (on registration)  
**Transitions:**
- active → disabled on `POST /api/admin/user/disable` `{disabled:true}`, guarded by `requireAdmin` + not-an-admin check
- disabled → active on `POST /api/admin/user/disable` `{disabled:false}`, guarded by `requireAdmin`  
**Source:** `api/server.js:525`

---

## Session (gymsid cookie)

**States:** valid, expired, invalidated, cleared  
**Initial:** valid (minted on `login/verify` or `register/verify`)  
**Transitions:**
- valid → expired when cookie timestamp < Date.now() (SESSION_DAYS after mint)
- valid → invalidated when `user.sv` is incremented by `POST /api/logout/all`; all prior cookies fail the version check
- valid → cleared by `POST /api/logout` (client sets Max-Age=0; server has no record to remove)  
**Source:** `api/server.js:162–200`

---

## WebAuthn challenge

**States:** pending, consumed, expired  
**Initial:** pending (created by `register/options` or `login/options`)  
**Transitions:**
- pending → consumed on first call to `takeChallenge()` — deleted from Map immediately; there is no second call
- pending → expired when TTL check fails (5 min); also cleaned by `setInterval` every 60 s  
**Source:** `api/server.js:204–216`

---

## Invite code

**States:** available, used, revoked  
**Initial:** available (on `POST /api/admin/invites/new`)  
**Transitions:**
- available → used on `POST /api/register/verify` (sets `usedBy` + `usedAt`)
- available → revoked on `POST /api/admin/invites/revoke` (removes from `db.invites`)
- used → revoke is blocked (guard at `server.js:565`: `if (inv.usedBy) return 400`)  
**Source:** `api/server.js:546–570`

---

## Workout (client-side, Zustand store)

**States:** planned, active, completed, abandoned  
**Initial:** planned (exists in routine/week schedule; no workout logged for that date)  
**Transitions:**
- planned → active on start-workout action (sets `S.active` in Zustand store)
- active → completed on finish-workout action (appends to `S.workouts`; clears `S.active`)
- active → abandoned on discard action (clears `S.active` without appending to workouts)  
**Note:** `active` is stripped from the state before server sync (`server.js:397`) — in-progress workouts stay device-local.  
**Source:** `frontend/src/store/useStore.js:DEF.active`
