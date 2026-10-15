<div align="center">

<img src="assets/logo.png" alt="OPENFIT logo" width="112">

# OPENFIT

**Self-hosted training, body-weight and nutrition tracking that you own.**

Plan routines, run guided workouts with automatic progressive overload, log meals by search or barcode, and track body weight, all in one app that runs on your own server.

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
![Self-hosted](https://img.shields.io/badge/self--hosted-docker-22d3ee?style=flat-square&logo=docker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-06b6d4?style=flat-square)
![Android](https://img.shields.io/badge/Android-Capacitor-3ddc84?style=flat-square&logo=android&logoColor=white)
![React](https://img.shields.io/badge/React-19-38bdf8?style=flat-square&logo=react&logoColor=white)
![Telemetry](https://img.shields.io/badge/telemetry-none-a3e635?style=flat-square)

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
| **Flexible portions** | Log by serving, grams, kilograms, ounces or millilitres. Product serving sizes are detected automatically. |
| **Science-based targets** | IOM 2005 energy equations with a lifter-focused protein target of 1.6 g/kg. |
| **History stays accurate** | Each entry snapshots the food's nutrition values, so later database edits never rewrite old logs. |

### Planning & data
| | |
|---|---|
| **Weekly planner** | Assign routines to days, reschedule, or start from built-in templates. |
| **Spreadsheet import** | Build plans in Excel or Google Sheets and import them as CSV or JSON. Sample plans are in [`samples/`](samples). |
| **History import** | Bring in past workouts from FitNotes, Strong, Hevy and Apple Health. |
| **Printable plans** | Clean one-page workout cards for the gym binder. |
| **Multi-user** | Profiles sync across devices, with an optional admin dashboard and invite-only sign-up. |
| **12 languages** | The full interface is localised, with matching exercise instructions. |

## Architecture

```
 Phone / browser  ──HTTPS──▶  nginx  ──▶  static PWA (React 19 · Zustand)
 (PWA or Android app)           │
                                └─/api─▶  Node.js API
                                           ├─ WebAuthn passkeys
                                           ├─ Open Food Facts proxy (cached)
                                           └─ JSON persistence in ./data
```

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
