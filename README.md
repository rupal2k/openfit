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

<br><br>

<img src="assets/screenshots/openfit-carousel.gif" alt="OPENFIT App Walkthrough Carousel" width="360" style="max-width: 100%; height: auto; border-radius: 12px;">

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

One React codebase ships two ways: a **self-hosted web app** (nginx + a small Node.js API, data as JSON files) and a **standalone Android app** (Capacitor, no server).

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/architecture.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/images/architecture-light.png">
    <img alt="OPENFIT Full System Architecture" src="docs/images/architecture.png" width="100%">
  </picture>
</p>

> [!TIP]
> **Interactive Architecture Diagram**: An interactive showcase diagram is available in [`docs/architecture.html`](docs/architecture.html) — open it in any browser to explore subsystem filters (Self-Hosted Web, Standalone Android, On-Device AI Vision, Food Search Proxy), inspect components, and trace data-flow paths.

<details>
<summary><b>View GitHub-native Mermaid Diagram</b></summary>

```mermaid
flowchart LR
    subgraph CLIENTS["Clients (Offline-First)"]
        direction TB
        BROWSER["Browser / installed PWA<br/>React 19 + Service Worker"]
        ANDROID["Android app<br/>Capacitor 7 WebView shell"]
        STORE[("App local storage<br/>openfit-state.json")]
        ONNX["On-device AI<br/>ONNX WASM (CPU)"]
        ANDROID --> STORE
        STORE --> ONNX
    end

    subgraph SERVER["Self-hosted server · Docker Compose"]
        direction TB
        WEBC["Nginx web edge<br/>static React & reverse proxy"]
        APIC["Node.js 22 API<br/>pure stdlib HTTP server"]
        VOL[("Volumes<br/>./data · ./media")]
        WEBC -->|"/img"| VOL
        WEBC -->|"/api/*"| APIC
        APIC --> VOL
    end

    subgraph EXT["External & Model Hub"]
        direction TB
        OFF["Open Food Facts<br/>global barcode & food API"]
        HF["Hugging Face Hub<br/>~120MB food model"]
        PUSH["Web Push Service<br/>VAPID notifications"]
    end

    BROWSER -->|HTTPS :443| WEBC
    APIC -->|"food search (10-min cache)"| OFF
    APIC -.->|"push reminders"| PUSH
    ONNX -.->|"one-time model fetch"| HF
```

</details>

The web request path, the code layers (presentation / state / domain / adapters) and a mapping to Android Clean Architecture are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

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
