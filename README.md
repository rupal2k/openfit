<div align="center">

<img src="assets/logo.png" alt="OPENFIT logo" width="112">

# OPENFIT

**Self-hosted training, body-weight and nutrition tracking that you own.**

Plan routines, run guided workouts with automatic progressive overload, log meals by search or barcode, and track body weight, all in one app that runs on your own server.

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
![Self-hosted](https://img.shields.io/badge/self--hosted-docker-22d3ee?style=flat-square&logo=docker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-06b6d4?style=flat-square&logo=pwa&logoColor=white)
![Android](https://img.shields.io/badge/Android-standalone-3ddc84?style=flat-square&logo=android&logoColor=white)
![Telemetry](https://img.shields.io/badge/telemetry-none-a3e635?style=flat-square)

[![Download APK](https://img.shields.io/badge/Download-Android%20APK-3ddc84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/rupal2k/openfit/releases/latest/download/OPENFIT-android.apk)

<img src="assets/banner.png" alt="OPENFIT" width="720">

<table>
<tr>
<td align="center"><img src="assets/screenshots/home.png" alt="Home" width="160"><br><sub><b>Home</b><br>Today's session & weight trend</sub></td>
<td align="center"><img src="assets/screenshots/workout.png" alt="Guided workout" width="160"><br><sub><b>Workout</b><br>Animated guidance & targets</sub></td>
<td align="center"><img src="assets/screenshots/nutrition.png" alt="My Meals" width="160"><br><sub><b>My Meals</b><br>Food diary & macros</sub></td>
</tr>
<tr>
<td align="center"><img src="assets/screenshots/stats.png" alt="My Stats" width="160"><br><sub><b>My Stats</b><br>Activity heatmap & muscle balance</sub></td>
<td align="center"><img src="assets/screenshots/plan.png" alt="My Plan" width="160"><br><sub><b>My Plan</b><br>Weekly schedule & routines</sub></td>
<td align="center"><img src="assets/screenshots/library.png" alt="Exercises" width="160"><br><sub><b>Exercises</b><br>1,300+ animated exercises</sub></td>
</tr>
</table>

</div>

---

## Why OPENFIT

Fitness apps tend to put your own training history behind a subscription, or lose it when the company changes direction. OPENFIT keeps the data with you:

- **Self-hosted:** one Docker Compose stack on your server or home lab, with no external database.
- **One app:** workouts, progressive overload, body weight and nutrition live in one place.
- **Private by default:** passkey sign-in, no ads, no telemetry, and plain JSON files on disk.
- **Works where you train:** an installable PWA and an Android app, with offline caching and wake-lock during sessions.
- **No lock-in:** one-tap JSON backups, plus CSV and JSON import and export.

## Features

### Training
| | |
|---|---|
| **Exercise library** | 1,300+ exercises, searchable by name, muscle or equipment, each with an animated demo. |
| **Guided workouts** | Weights pre-filled from your last session, rest timers, supersets and PR detection. |
| **Progressive overload** | Linear, Greyskull LP, double progression and time progression. Each target explains why it was chosen. |
| **Effort tracking** | Optional RIR or RPE column, estimated 1RM, and per-exercise progress curves. |
| **Insights** | 12-month activity heatmap, and a front/back muscle-balance map that highlights neglected muscles. |

### Nutrition
| | |
|---|---|
| **Daily diary** | Breakfast, lunch, dinner and snacks, with live calorie and macro totals. |
| **Food search** | Open Food Facts search through a cached server-side proxy. |
| **Barcode scanner** | Native camera scanning with HD capture, tap-to-focus, zoom and torch. Manual code entry as a fallback. |
| **Photo logging (on-device AI)** | Snap a dish and OPENFIT recognises it (101 common dishes) with a small Hugging Face model (~120 MB incl. runtime, downloaded once and verified) that runs on your device. Nutrition and the typical portion come from USDA data. Photos are never uploaded, and it works offline. |
| **Flexible portions** | Log by serving, grams, kilograms, ounces or millilitres. Product serving sizes are detected automatically. |
| **Science-based targets** | IOM 2005 energy equations with a lifter-focused protein target of 1.6 g/kg. |
| **History stays accurate** | Each entry snapshots the food's nutrition values, so later database edits never rewrite old logs. |

<div align="center">
<table>
<tr>
<td align="center"><img src="assets/screenshots/photo-capture.png" alt="Photo logging: take or choose a photo" width="200"><br><sub><b>Snap a dish</b><br>Recognised on your device</sub></td>
<td align="center"><img src="assets/screenshots/photo-review.png" alt="Photo logging: review the recognised dish" width="200"><br><sub><b>Review and log</b><br>Top-3 guesses, USDA portion and macros</sub></td>
</tr>
</table>
</div>

### Planning & data
| | |
|---|---|
| **Weekly planner** | Assign routines to days, reschedule, or start from built-in templates. |
| **Spreadsheet import** | Build plans in Excel or Google Sheets and import them as CSV or JSON. Sample plans are in [`samples/`](samples). |
| **History import** | Bring in past workouts from FitNotes, Strong, Hevy and Apple Health. |
| **Printable plans** | Clean one-page workout cards for the gym binder. |
| **Multi-user** | Profiles sync across devices, with an optional admin dashboard and invite-only sign-up. |
| **12 languages** | The full interface is localised, with matching exercise instructions. |

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | ![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-5-443E38?style=for-the-badge) ![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white) |
| **Mobile** | ![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?style=for-the-badge&logo=capacitor&logoColor=white) ![Android](https://img.shields.io/badge/Android-WebView-3DDC84?style=for-the-badge&logo=android&logoColor=white) ![Gradle](https://img.shields.io/badge/Gradle-build-02303A?style=for-the-badge&logo=gradle&logoColor=white) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white) ![WebAuthn](https://img.shields.io/badge/WebAuthn-passkeys-3423A6?style=for-the-badge&logo=webauthn&logoColor=white) ![nginx](https://img.shields.io/badge/nginx-proxy-009639?style=for-the-badge&logo=nginx&logoColor=white) |
| **On-device AI** | ![Hugging Face](https://img.shields.io/badge/transformers.js-4.3-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black) ![ONNX](https://img.shields.io/badge/ONNX_Runtime-WASM-005CED?style=for-the-badge&logo=onnx&logoColor=white) ![WebAssembly](https://img.shields.io/badge/WebAssembly-CPU-654FF0?style=for-the-badge&logo=webassembly&logoColor=white) |
| **Data** | ![Open Food Facts](https://img.shields.io/badge/Open_Food_Facts-ODbL-FF8714?style=for-the-badge) ![USDA](https://img.shields.io/badge/USDA-FNDDS-2E7D32?style=for-the-badge) ![JSON](https://img.shields.io/badge/storage-JSON_files-000000?style=for-the-badge&logo=json&logoColor=white) |
| **Ops & tests** | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=for-the-badge&logo=vitest&logoColor=white) |

## Architecture

One React codebase ships two ways: as a **self-hosted web app** with a small Node.js server, and as a **standalone Android app** that needs no server. The sections below go from the outside in: system context, the web request path, then the code layers inside the app.

### 1. System overview

```mermaid
flowchart LR
    subgraph CLIENTS["Clients"]
        direction TB
        BROWSER["Browser / installed PWA"]
        ANDROID["Android app<br/>Capacitor WebView shell"]
    end

    subgraph SERVER["Self-hosted server · Docker Compose"]
        direction TB
        WEBC["web container<br/>nginx"]
        APIC["api container<br/>Node.js 22"]
        VOL[("volumes<br/>./data · ./media")]
    end

    subgraph EXT["External services"]
        direction TB
        OFF["Open Food Facts"]
        HF["Hugging Face<br/>model files"]
    end

    BROWSER -->|HTTPS| WEBC
    WEBC -->|"/api/*"| APIC
    APIC --> VOL
    WEBC --> VOL
    APIC -->|"food search, cached"| OFF
    ANDROID -->|"food search, direct"| OFF
    BROWSER -.->|"one-time model download"| HF
    ANDROID -.->|"one-time model download"| HF
```

The Android app talks to no OPENFIT server. Its state lives in `openfit-state.json` in app-private storage.

### 2. Web architecture

A request from the browser goes through nginx, which serves the built app and exercise media itself and passes only `/api/*` to Node. The API is a single dependency-light Node process (no framework). It routes by `METHOD path` through one table to five handler groups, and every group reads and writes plain JSON files.

```mermaid
flowchart TB
    CLIENT["Browser / PWA<br/>service worker: media cache-first,<br/>app network-first with offline fallback"]

    subgraph EDGE["nginx · web container"]
        direction LR
        STATIC["/ → built React app<br/>(hashed assets)"]
        MEDIA["/img · /gif → exercise<br/>media (read-only volume)"]
        PROXY["/api/* → reverse proxy"]
    end

    subgraph API["Node.js API · api/server.js"]
        direction TB
        GATE["HTTP gate<br/>session cookie · body limit · route table"]
        subgraph HANDLERS["Handlers"]
            direction LR
            AUTH["Auth<br/>/api/register · /api/login<br/>/api/logout · /api/me"]
            SYNC["State sync<br/>GET / PUT /api/data"]
            FOOD["Food proxy<br/>/api/food/search<br/>10-min TTL cache"]
            PUSH["Web push<br/>/api/push/*"]
            ADMIN["Admin<br/>/api/admin/*<br/>invites · users"]
        end
        GATE --> HANDLERS
    end

    subgraph STORE["./data volume"]
        direction LR
        DB[("db.json<br/>accounts · passkeys")]
        STATE[("state-&lt;uid&gt;.json<br/>workouts · weight · food")]
        KEYS[("secret · vapid.json")]
    end

    OFF["Open Food Facts"]

    CLIENT -->|HTTPS| EDGE
    PROXY --> GATE
    AUTH --> DB
    ADMIN --> DB
    SYNC --> STATE
    PUSH --> KEYS
    FOOD --> OFF
```

### 3. Code layers and separation of concerns

Inside the app the code is split into four layers. Dependencies point one way, from the UI down to the domain, and the domain layer has no React, no network and no storage. That keeps the training and nutrition rules testable as plain functions (18 test files, 253 tests).

```mermaid
flowchart TB
    P["<b>Presentation</b><br/>views/ · components/ · sheets<br/><i>renders state, forwards user intent</i>"]
    S["<b>State</b><br/>store/useStore.js · store/useUI.js · Zustand<br/><i>single source of truth, persist()</i>"]
    D["<b>Domain</b> · pure functions, no I/O<br/>progression · onerm · effort · history · muscles<br/>nutrition · plan-share · import-csv · vision matching<br/><i>unit-tested business rules</i>"]
    A["<b>Adapters</b> · the outside world<br/>api.js · food.js · off.js · mobile.js<br/>push.js · wakelock.js · vision/client + worker<br/><i>network, storage, device, ML runtime</i>"]

    P -->|"reads / dispatches"| S
    P -->|"calls"| D
    S -->|"calls"| D
    S -->|"load / save"| A
    P -->|"device features"| A

    classDef pres fill:#1e3a5f,stroke:#38bdf8,color:#e0f2fe
    classDef state fill:#3b2f63,stroke:#a78bfa,color:#ede9fe
    classDef domain fill:#1f4d2b,stroke:#a3e635,color:#ecfccb
    classDef adapt fill:#4a3415,stroke:#f59e0b,color:#fef3c7
    class P pres
    class S state
    class D domain
    class A adapt
```

If you come from Android, the layers map onto the usual Clean Architecture terms like this:

| OPENFIT layer | Folder | Android / Kotlin equivalent |
|---|---|---|
| Presentation | `views/`, `components/`, `*-sheets.jsx` | Composables / Fragments |
| State | `store/` (Zustand) | ViewModel + `StateFlow` |
| Domain | `lib/` pure modules, `lib/vision/` matching | Use cases + domain models (pure Kotlin) |
| Adapters | `lib/api.js`, `food.js`, `off.js`, `mobile.js`, `vision/client.js` | Repositories + data sources (Retrofit, Room, DataStore) |

Where the code does not follow the layering strictly:
- **No separate use-case objects.** Views call domain functions directly, the way a ViewModel would call a use case.
- **The domain doesn't depend on interfaces.** Unlike Clean Architecture in Kotlin, nothing is injected: each target picks its adapter with a build-time flag (`VITE_MOBILE`), and the code for the other target is removed when the app is built.
- **Three utility modules depend on the UI layer.** `i18n.js` and `wakelock.js` expose React hooks, and `glyphs.js` reads icon names from `components/Icon.jsx`. Because `format.js` imports `i18n.js`, part of the domain indirectly depends on React. Moving those hooks into `components/` would remove that dependency.

## Quick start

**Requirements:** [Docker](https://docs.docker.com/get-docker/) with Compose.

```bash
git clone https://github.com/rupal2k/openfit.git
cd openfit
cp .env.example .env
docker compose up -d --build
```

Open <http://localhost:8080>, choose **Create profile** and register a passkey. On first run the stack downloads and caches the exercise media (~140 MB).

> **Note:** browsers only allow passkeys over HTTPS (except on `localhost`). For public access, put OPENFIT behind a TLS reverse proxy (Caddy, Traefik, Cloudflare Tunnel or similar) and set `RP_ID` and `ORIGIN`.

### Configuration

| Variable | Purpose | Default |
|---|---|---|
| `RP_ID` | Hostname that passkeys are bound to | `localhost` |
| `ORIGIN` | Full public origin of the instance | `http://localhost:8080` |
| `WEB_PORT` | Host port for the web service | `8080` |
| `RP_NAME` | Name shown in passkey prompts | `openfit` |
| `ADMIN_UIDS` | Comma-separated user IDs with admin access | — |
| `INVITE_ONLY` | `1` requires an invite code to register | `0` |

### Backups

All state lives in `./data`:

| File | Contents |
|---|---|
| `db.json` | Accounts and public passkey credentials |
| `state-<uid>.json` | Workouts, routines, body weight and food diary |
| `secret` | Session signing key |
| `vapid.json` | Web-push keys |

```bash
tar -czf openfit-backup.tar.gz data/
```

## Android app

**[⬇ Download the latest APK](https://github.com/rupal2k/openfit/releases/latest/download/OPENFIT-android.apk)** (sideload: allow "Install unknown apps" for your browser or file manager). All releases: [Releases](https://github.com/rupal2k/openfit/releases).

The Android build is a standalone Capacitor app. Data stays on the device, and food search calls Open Food Facts directly.

```bash
cd frontend
npm install
npm run build:mobile                 # web bundle + cap sync
cd android && ./gradlew assembleDebug  # APK in app/build/outputs/apk/debug/
```

## Development

```bash
cd frontend
npm install
npm run dev        # Vite dev server
npx vitest run     # unit tests
npm run build      # production bundle
```

To regenerate every icon, splash screen and the banner from `assets/icon-source.png`, run `node scripts/generate-brand.mjs`.

## Acknowledgements

OPENFIT builds on these open-source projects:

- **[openGym](https://github.com/DuarteSantos8/openGym)** by Duarte Santos: the upstream tracker this project forks (AGPL-3.0).
- **[OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker)** by Simon Oppowa: energy and macro equations (GPL-3.0).
- **[Open Food Facts](https://world.openfoodfacts.org)**: open food database (ODbL).
- **[MuscleMap](https://github.com/melihcolpan/MuscleMap)** by Melih Colpan: anatomical outlines (MIT).
- **[exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)** by hasaneyldrm: exercise catalogue and animations.

Full notices are in [`NOTICE.md`](NOTICE.md).

## License

[GNU Affero General Public License v3.0 or later](LICENSE).
