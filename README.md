<div align="center">

# openfit

<img src="assets/banner.png" alt="openfit" width="720">

<br>

**The privacy-first, self-hosted gym, body-weight & nutrition tracker you actually own.**

Plan routines, run guided workouts with automated progressive overload, track nutrition with barcode scanning, and monitor body composition — on your phone, synced across devices, behind your own passkey login.

No subscription, no ads, no cloud lock-in, zero telemetry. Just `docker compose up`.

<br>

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
![Self-hosted](https://img.shields.io/badge/self--hosted-%F0%9F%8F%A0-22d3ee?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-06b6d4?style=flat-square)
![React](https://img.shields.io/badge/React-19-38bdf8?style=flat-square&logo=react&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Nutrition](https://img.shields.io/badge/nutrition-barcode--scanner-f43f5e?style=flat-square)
![Privacy](https://img.shields.io/badge/telemetry-none-a3e635?style=flat-square)
[![Target Repo](https://img.shields.io/badge/github-rupal2k%2Fopenfit-0c0e12?style=flat-square&logo=github)](https://github.com/rupal2k/openfit)

</div>

<br>

<div align="center">
<table>
<tr>
<td align="center"><img src="assets/screenshots/home.png" alt="Home" width="175"><br><sub><b>Home</b> — today's session & weight</sub></td>
<td align="center"><img src="assets/screenshots/workout.png" alt="Workout" width="175"><br><sub><b>Guided workout</b> — animations & rest timers</sub></td>
<td align="center"><img src="assets/screenshots/nutrition.png" alt="Nutrition" width="175"><br><sub><b>Nutrition</b> — diary & barcode scan</sub></td>
<td align="center"><img src="assets/screenshots/stats.png" alt="Stats" width="175"><br><sub><b>Stats</b> — heatmaps, charts & 1RM</sub></td>
<td align="center"><img src="assets/screenshots/plan.png" alt="Plan" width="175"><br><sub><b>Plan</b> — schedule & custom split</sub></td>
</tr>
</table>
</div>

---

## Why openfit?

Most fitness apps lock your training data behind paywalls, bombard you with subscription upsells, or shut down when a startup pivots. 

**openfit** is built on a different principle: **your health and workout data belongs entirely to you.**

- **Self-Hosted & Private:** Runs in a lightweight Docker container on your server or home lab.
- **Single Source of Truth:** Unifies training, body weight, progressive overload, and food tracking in one cohesive app.
- **Native-Like PWA:** Install directly to your home screen on iOS and Android with fast offline caching and wake-lock while training.
- **Hardware-Secured Authentication:** Passwordless login using WebAuthn / Passkeys (Face ID, Touch ID, Fingerprint).
- **Zero Lock-In:** Easy one-click backups, Excel (CSV) and JSON plan imports/exports, and zero telemetry.

---

## Features

### 🏋️ Training & Guided Workouts
- **1,320+ Exercise Library:** Searchable by name, target muscle, or equipment with animated demonstrations.
- **Guided Workout Player:** Pre-fills weights from your last session, runs configurable rest timers, logs supersets, and detects new Personal Records (PRs).
- **Screen Wake-Lock:** Keeps your screen awake throughout your session so you never have to unlock your phone mid-workout.
- **Timed & Bodyweight Exercises:** Dedicated work timer for planks, wall sits, and loaded carries. Bodyweight exercises intelligently switch between rep progression and weighted plate loads.
- **Smart Progressive Overload Engine:** Supports Linear Progression, **Greyskull LP** (AMRAP top set, double jumps, 10% deload resets), Double Progression, and Time Progression. Every target clearly displays *why* it was chosen.
- **Estimated 1RM & Curves:** Computes your estimated one-rep max per exercise with historical progression graphs.
- **RPE & RIR Effort Logging:** Optional third column to record Reps In Reserve (RIR) or Rate of Perceived Exertion (RPE).
- **Muscle Engagement Map:** Front-and-back body diagram shaded by weekly or all-time training volume with neglected muscle identification.
- **Activity Heatmap:** Year-at-a-glance GitHub-style visual workout consistency log.

### 🍎 Nutrition & Food Diary
- **Scientific Macro Targets:** Energy goals and macro splits computed via the IOM 2005 equations (ported from OpenNutriTracker) tailored to gym athletes (1.6 g protein per kg bodyweight).
- **Daily Food Diary:** Log meals across Breakfast, Lunch, Dinner, and Snacks with live calorie and macro progress bars.
- **Barcode Scanner:** Instant product scanning using the native browser camera `BarcodeDetector` with manual code lookup fallback.
- **Open Food Facts Integration:** Rapid online food search powered by a cached backend proxy to Open Food Facts.
- **Snapshot Entries:** Every diary entry stores an immutable snapshot of food nutritional data, ensuring historical accuracy.
- **Custom Foods:** Create and save your own pantry items and recipes with instant per-100g nutrient calculations.

### 📋 Flexible Planning & Spreadsheet Imports
- **Excel / CSV Plan Upload:** Create and edit routines in Excel or Google Sheets, then drop the CSV into openfit to import splits seamlessly.
- **Downloadable Sample Plans:** Direct sample CSV downloads for popular splits (Push/Pull/Legs, Upper/Lower, Functional Full-Body).
- **Curated Starter Templates:** Built-in workout templates ready to instantiate with one click.
- **Printable PDF Cards:** Generate clean, non-splitting single-page PDF workout printouts for gym binders.

### 🎨 Theme & Design System
- **Volt Lime (`#a3e635`):** High-energy gym workout driver, linear progression milestones, and Personal Record badges.
- **Cyber Cyan (`#22d3ee` / `#06b6d4`):** Progressive overload calculations, bodyweight curves, and analytics heatmaps.
- **Coral Flare (`#f43f5e`):** Nutrition food diary, macro progress rings, and real-time barcode laser targeting.
- **Obsidian Dark (`#0c0e12` / `#161922`):** Pure AMOLED deep-dark contrast mode optimized for low battery draw and high readability in gym environments.

### 🔒 Privacy, Security & Data Ownership
- **Passkey Login (WebAuthn):** Fast, passwordless biometric authentication. Private keys never leave your device.
- **Sync & Multi-User Support:** Multi-device synchronization across phone, tablet, and desktop with multi-profile support for family or gym partners.
- **History Importers:** Effortlessly migrate past history from **FitNotes**, **Strong**, **Hevy**, and **Apple Health**.
- **Admin Dashboard (Optional):** Monitor active sessions, manage user profiles, and enforce invite-only registration.
- **12 Languages:** Fully localized interface with multi-language exercise instruction packs.

---

## Architecture

openfit runs entirely on a single origin with zero external database dependencies:

```
┌─────────────────────────────────┐
│     Your Phone / Browser        │
│  (PWA · React 19 · Zustand)     │
└────────────────┬────────────────┘
                 │ HTTPS (Port 8080)
                 ▼
┌─────────────────────────────────┐
│       nginx Reverse Proxy       │
│  ├─ Serves static frontend      │
│  └─ Proxies /api ─────────────┐ │
└───────────────────────────────┼─┘
                                │
                                ▼
┌─────────────────────────────────┐
│     Node.js API Container       │
│  ├─ WebAuthn / Passkeys         │
│  ├─ Open Food Facts Cache Proxy │
│  └─ Persistence to ./data JSON  │
└─────────────────────────────────┘
```

---

## Quick Start (Self-Hosting with Docker)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) with Compose.

### 1. Clone & Configure
```bash
git clone https://github.com/rupal2k/openfit.git
cd openfit
cp .env.example .env
```

### 2. Launch
```bash
docker compose up -d --build
```

Open **`http://localhost:8080`**, click **Create profile**, register your biometric passkey, and you are ready to train!

On first run, exercise demonstration media (~140 MB) is downloaded and cached locally.

---

## Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `RP_ID` | Hostname bound to WebAuthn passkeys | `localhost` |
| `ORIGIN` | Full origin URL of your instance | `http://localhost:8080` |
| `WEB_PORT` | Host port exposed for web access | `8080` |
| `RP_NAME` | Display name shown during passkey registration | `openfit` |
| `ADMIN_UIDS` | Comma-separated user IDs granted admin privileges | *(none)* |
| `INVITE_ONLY` | Require an invitation code to register profiles | *(off)* |

> **Production HTTPS Notice:** To use WebAuthn passkeys over the public internet, passkeys require HTTPS. Configure a reverse proxy (e.g., Caddy, Cloudflare Tunnel, Traefik, or Nginx Proxy Manager) and update `RP_ID` and `ORIGIN` in `.env`.

---

## Data Backups

All state is stored inside the `./data` directory on the host:
- `db.json` — User accounts and public passkey credentials.
- `state-<uid>.json` — Workout logs, custom routines, body weight entries, and food diaries.
- `secret` — Internal session signing key.
- `vapid.json` — Web push notification keys.

To back up your entire instance:
```bash
tar -czvf openfit-backup.tar.gz data/
```

---

## Development & Testing

Run unit and integration tests locally:

```bash
cd frontend
npm install
npx vitest run
```

Build production assets:
```bash
npm run build
```

---

## Upstream & Acknowledgements

**openfit** is open-source software built upon the work of exceptional open-source projects:

- **[openGym](https://github.com/DuarteSantos8/openGym)** by Duarte Santos — The upstream gym tracker foundation (AGPL-3.0).
- **[OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker)** by Simon Oppowa — Caloric and macronutrient calculation formulas (GPL-3.0).
- **[Open Food Facts](https://world.openfoodfacts.org)** — Global open food database (ODbL).
- **[MuscleMap](https://github.com/melihcolpan/MuscleMap)** by Melih Colpan — Anatomical vector outlines (MIT).
- **[exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)** by Hasan Eıldırım — Exercise catalog and demonstration animations.

See [`NOTICE.md`](NOTICE.md) for full licensing details and third-party notices.

---

## License

This project is licensed under the **[GNU Affero General Public License v3.0](LICENSE)** (AGPL-3.0-or-later).
