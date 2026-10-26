# Data Flow — openfit

> Where data originates, how it transforms, where it ends up.

## Passkey registration

**Source:** Browser — user triggers passkey creation in the PWA  
**Sink:** `db.json` — new user row + credential row  
**Transformations:**
1. `POST /api/register/options` → server generates WebAuthn options + stores challenge in-memory
2. Browser calls `navigator.credentials.create()` — platform authenticator signs the challenge
3. `POST /api/register/verify` → `@simplewebauthn/server` verifies attestation → `db.users.push(user)`, `db.creds.push(cred)`, invite marked used

**Shape at each step:**
- Step 1 response: `{ cid: string, options: PublicKeyCredentialCreationOptionsJSON }`
- Step 3 request: `{ cid, credential: { id, rawId, response: { attestationObject, clientDataJSON, transports } } }`
- Stored credential: `{ id, userId, publicKey (base64url), counter, transports }`

**Source:** `api/server.js:275–327`

---

## Passkey login

**Source:** Browser — user triggers passkey assertion  
**Sink:** `db.creds` counter updated; session cookie set on HTTP response  
**Transformations:**
1. `POST /api/login/options` → challenge stored in-memory
2. Browser calls `navigator.credentials.get()` — authenticator signs challenge
3. `POST /api/login/verify` → verify signature + counter → set `gymsid` cookie

**Shape at each step:**
- Step 3 request: `{ cid, credential: { id, rawId, response: { authenticatorData, signature, userHandle, clientDataJSON } } }`
- Cookie: `gymsid=<uid>:<expiry>:<sv>.HMAC` (HttpOnly, SameSite=Lax, Secure on HTTPS)

**Source:** `api/server.js:330–366`

---

## Workout state sync

**Source:** User interaction in React app → Zustand store → localStorage  
**Sink:** `state-<uid>.json` on server, then back to other devices via pull  
**Transformations:**
1. User action → `store.persist()` → `localStorage.setItem(KEY, JSON.stringify(S))` (immediate)
2. 1500 ms debounce → `PUT /api/data` with full state JSON
3. Server strips `S.active` field → `atomicWrite(stateFile(uid), JSON.stringify(state))`
4. On next device page load → `GET /api/data` → merge with localStorage (newest `_ts` wins)

**Shape:** full Zustand state JSON — `{ workouts[], routines[], bodyweight[], nutrition{}, settings..., _ts: timestamp }`

**Source:** `frontend/src/store/useStore.js:56–80`, `api/server.js:383–400`

---

## Food search (nutrition diary)

**Source:** User search query in nutrition view  
**Sink:** browser renders results; no server-side persistence  
**Transformations:**
1. `GET /api/food/search?q=<query>` → check in-memory cache (10-min TTL, 500 entry FIFO cap)
2. On cache miss: `fetch('https://search.openfoodfacts.org/search?...')` with query string only
3. Response cached and returned: `{ hits: [ { code, product_name, nutriments, serving_size, ... } ] }`

**Source:** `api/server.js:402–420`

---

## Daily workout reminder

**Source:** `setInterval` (10 s) — server-internal  
**Sink:** push notification on user's device via Web Push / VAPID service  
**Transformations:**
1. For each user with push subscriptions: read `state-<uid>.json`
2. Check `S.reminder.on`, `S.reminder.time`, `S.reminder.tz`
3. Compare to `userNow(tz)` in the user's own timezone
4. If time matches, workout planned today (via `effectiveRoutineId`), and not already logged → `sendPush()`
5. `webpush.sendNotification()` → external Web Push service → device notification

**Shape out:** `{ title: string, body: string, tag: 'day-reminder' }`

**Source:** `api/server.js:122–145`

---

## On-device food photo recognition

**Source:** Camera capture or image upload in the nutrition view  
**Sink:** food item pre-filled in diary (client-side only; never sent to server)  
**Transformations:**
1. One-time: `@huggingface/transformers` downloads ~120 MB ONNX food classification model from Hugging Face Hub
2. ONNX WASM runtime runs inference on device CPU
3. Top predictions matched against local food database → suggested food item

**Note:** model weights and inference happen entirely on-device. No image data leaves the browser.

**Source:** `frontend/src/lib/vision/` (client-side only, not shipped on server builds)
