# Contributing to openfit

Thanks for taking a look! openfit is intentionally small and dependency-light, and the goal is
to keep it that way — easy to read, easy to self-host.

## Project layout

```
frontend/  React + Vite app (src/views, src/components, src/store, src/lib). Builds to static files.
           android/ + ios/ are the Capacitor shells for the standalone mobile app (docs/MOBILE.md).
api/       backend — server.js (Node, no framework), WebAuthn passkeys, Open Food Facts proxy.
web/       multi-stage Dockerfile (builds frontend → nginx) + nginx.conf (serves app, proxies /api).
samples/   curated starter routine templates (Push/Pull/Legs, Upper/Lower, Functional in CSV/JSON).
media/     exercise img/gif (gitignored, fetched at runtime).
docs/      self-hosting guide, mobile docs, architecture records.
```

## Running for development

```bash
cp .env.example .env
docker compose up -d --build      # api + web + media on :8080
# frontend hot reload:
cd frontend && npm install && npm run dev
# test suite (progression rules, 1RM, nutrition math, barcode/OFF parsing):
cd frontend && npm test
```

## Guidelines

- **Keep it dependency-light.** The frontend uses React + Router + Zustand and minimal native helpers;
  new dependencies (frontend or backend) are a hard sell. `api/` has two (`@simplewebauthn/server` for passkeys,
  `web-push` for notifications) — keep it near that.
- **Match the style.** Small components, clear names, comments only where the "why" isn't obvious.
  State lives in the Zustand store (`src/store`); pure math and helpers in `src/lib`.
- **Don't commit** the exercise media (`media/`) or `data/` — they're gitignored.
- **Test the flow** you touched — click through the affected screens (workout player, food diary, plan importer)
  in a browser before opening a PR.
- **Math and domain logic get unit tests.** Anything deciding what you lift next, calculating nutritional
  targets, parsing barcode data, or reading a logged session back belongs in a pure helper in `src/lib`
  with tests beside it (`npm test`).

## Good first issues

- Additional spreadsheet plan templates in `samples/`
- More languages for the exercise instructions (the dataset ships several)
- Percentage / training-max programming (5/3/1-style) on top of the progression engine in
  `src/lib/progression.js`
- Additional nutritional analytics and meal macro breakdown visualizations
- Accessibility passes on the workout, food diary, and chart screens

## Where to ask what

| You have | Goes to |
| --- | --- |
| A question, or self-hosting that won't behave | [Discussions → Q&A](https://github.com/rupal2k/openfit/discussions/categories/q-a) |
| An idea you're not sure about yet | [Discussions → Ideas](https://github.com/rupal2k/openfit/discussions/categories/ideas) |
| A reproducible bug | [Issues](https://github.com/rupal2k/openfit/issues) |
| A change you've already built | A pull request |

An answered question in Q&A is worth more than the same answer buried in a closed issue — the
next person searching "passkey login fails behind my reverse proxy" actually finds it.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and your browser/OS. If it's
about login/passkeys, include your `RP_ID`/`ORIGIN` (not the `data/` contents) — most login
issues are an origin mismatch.

By contributing you agree your work is licensed under the project's [GNU AGPL v3.0](LICENSE).
