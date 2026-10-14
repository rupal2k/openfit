# Nutrition Tracking Implementation Plan (openfit)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read **§Agentic handoff** at the bottom before dispatching anything.

**Goal:** Add a food diary with calorie and macro targets to openGym (republished as `github.com/rupal2k/openfit`), so one app tracks training, body weight and nutrition.

**Architecture:** The nutrition data lives inside the existing per-user state object `S` (`S.nutrition`), so it syncs, backs up and exports through the paths that already exist. The target math and Open Food Facts (OFF) normalisation are pure, unit-tested modules ported from OpenNutriTracker. Food search goes through one new signed-in-only proxy route on the existing Node API, because `search.openfoodfacts.org` sends no CORS headers. Barcode lookups go straight from the browser to `world.openfoodfacts.org`, which does send `Access-Control-Allow-Origin: *`.

**Tech Stack:** React 19, Zustand 5, Vite 8, Vitest 4 (frontend); Node 22, no framework (`api/server.js`); Docker Compose plus nginx.

**Spec:** this file. §Design is the spec. The reference implementation is OpenNutriTracker (GPL-3.0), `github.com/simonoppowa/OpenNutriTracker`, files `lib/core/utils/calc/{tdee_calc,pal_calc,calorie_goal_calc,macro_calc}.dart` and `lib/core/utils/off_const.dart`.

## Global Constraints

- License: openGym is AGPL-3.0-or-later. Formulas ported from OpenNutriTracker (GPL-3.0) are compatible (GPLv3 §13), but `NOTICE.md` must credit them (Task 9).
- No new npm dependencies, in either `frontend/` or `api/`. Barcode scanning uses the native `BarcodeDetector` API.
- Every user-visible string goes through `t('English source string')` from `src/lib/i18n.js`. Translations are not part of this plan, because `t()` falls back to English.
- Icons come only from `src/components/Icon.jsx`. No emoji in the UI.
- All nutrition data lives in `S.nutrition`. Never use new `localStorage` keys or new state files.
- Grams are the only amount unit. Nutrient values are stored **per 100 g**.
- Every diary entry stores a **snapshot** of the food. An entry never references a food by ID, so later changes to OFF or to a custom food never rewrite history.
- Body weight comes from the existing `S.bodyweight` log. When `S.unit === 'lb'`, convert with `× 0.45359237`.
- Preserve the existing layouts (user rule). The only change to existing chrome is the one new tab bar button in Task 7.
- The food proxy must require a session (`readSession(req)`), so it is not an open proxy.
- Run tests from `frontend/` with `npx vitest run`.
- Commits end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Design

### Data model (added to `DEF` in `src/store/useStore.js`)

```js
nutrition: {
  profile: null,   // null until set up, then:
  // { sex: 'male'|'female'|'other', birthYear: 1996, heightCm: 180,
  //   pal: 'sedentary'|'low'|'active'|'very', goal: 'lose'|'maintain'|'gain',
  //   kcal: null | number   // manual override; skips the formula when set }
  days: {},        // { 'YYYY-MM-DD': Entry[] }
  foods: []        // custom foods: Food[]
}
// Food  = { src: 'off'|'custom', id?: string, code: string, name: string, brand: string,
//           serving: number|null /* grams */, per100: { kcal, p, c, f } }
// Entry = { id: string, meal: 'breakfast'|'lunch'|'dinner'|'snack', g: number, t: number, food: Food }
```

### Targets (ported from OpenNutriTracker)

- TDEE uses the IOM 2005 equations. PAL categories: sedentary 1.25, low 1.5, active 1.75, very 2.2. PAL maps to the PA coefficient as follows: `<1.4 → 1.0`; `<1.6 → 1.12 (male) / 1.14 (female)`; `<1.9 → 1.27`; otherwise `1.54 (male) / 1.45 (female)`. `sex: 'other'` uses the average of the male and female results.
- The goal adjusts the result: lose −500 kcal, maintain 0, gain +500.
- **Deliberate deviation for a gym app:** protein is set to 1.6 g per kg of body weight, instead of OpenNutriTracker's 15 % of energy. Fat is 25 % of kcal, and carbs take the remainder (never below 0). If no body weight is logged, protein falls back to 25 % of kcal.
- `targets()` returns `null` when it can't compute an honest number. The UI then prompts the user to set up their profile.

### Out of scope (follow-ups, not in this plan)

- Burning workout calories back into the target.
- Recipes, fasting, water, micronutrients, and USDA FDC search.
- Translations of the new strings.
- Food search in the mobile and demo builds, which have no backend. Those builds still get barcode lookups and custom foods.
- A nutrition card on Home.

### File map

| File | Status | Responsibility |
|---|---|---|
| `.gitignore` | create | Keep `data/`, `.env`, `node_modules`, `dist` and `.DS_Store` out of git |
| `frontend/src/lib/nutrition.js` | create | Pure functions: TDEE, targets, entry and day totals, diary mutators, recent foods |
| `frontend/src/lib/nutrition.test.js` | create | Tests for the above |
| `frontend/src/lib/off.js` | create | Pure: `OFF_FIELDS` and `normalizeOFF(product) → Food \| null` |
| `frontend/src/lib/off.test.js` | create | Tests for the above |
| `frontend/src/lib/food.js` | create | Network: `searchFoods(q)` through the API, `lookupBarcode(code)` direct to OFF |
| `api/server.js` | modify | `GET /api/food/search` proxy plus cache |
| `frontend/src/store/useStore.js` | modify | `DEF.nutrition`; `hasData` counts nutrition days |
| `frontend/src/nutrition-sheets.jsx` | create | Profile, search, amount, custom food and barcode sheets (kept out of the 1,200-line `sheets.jsx`) |
| `frontend/src/views/Nutrition.jsx` | create | The diary screen |
| `frontend/src/App.jsx` | modify | `/nutrition` route |
| `frontend/src/components/TabBar.jsx` | modify | Food tab |
| `frontend/src/components/Icon.jsx` | modify | `apple` and `barcode` icons |
| `NOTICE.md`, `README.md`, `CHANGELOG.md` | modify | Attribution, feature line, changelog entry |

---

### Task 0: Repo hygiene and the openfit remote ⚠️ USER-GATED

The session signing key (`data/secret`), the push keys (`data/vapid.json`) and the user DB (`data/db.json`) were committed in `3efe375` and pushed to `arvids-unavailable/openGym`. `rupal2k/openfit` is **public and empty**. Pushing the current history to it would publish those keys.

**Files:**
- Create: `.gitignore`
- Untrack: `data/secret`, `data/vapid.json`, `data/db.json`

- [ ] **Step 1: Create `.gitignore`** at the repo root.

```gitignore
# runtime data — users, passkeys, session secret, push keys. NEVER commit.
data/
.env
node_modules/
dist/
.DS_Store
```

- [ ] **Step 2: Untrack the data files without deleting them from disk.**

```bash
cd /home/rupaldas/openGym
git rm --cached data/secret data/vapid.json data/db.json
git rm --cached -r --ignore-unmatch '*.DS_Store'
```

- [ ] **Step 3: Rotate the leaked keys.** **Ask the user first.** This signs every user out, and every device has to re-enable push notifications.

```bash
docker compose stop api
rm data/secret data/vapid.json          # server regenerates both on start
docker compose start api
docker compose logs api | tail -3       # expect "gym-api on :3000"
```

- [ ] **Step 4: Commit the in-progress work (the rebrand, plan templates and plan upload) as its own commit.** Ask the user whether the three sample plan files in the repo root (`*_plan.csv`, `*_plan.json`) belong in the repo. If they don't, add them to `.gitignore`.

```bash
git add .gitignore .env.example docker-compose.yml frontend/
git commit -m "chore: ignore runtime data; Vantage Fit rebrand, plan templates and plan upload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Publish to openfit with a fresh history, so the old commits containing the keys never reach the public repo.** **Ask the user before pushing.**

```bash
git checkout --orphan openfit-main
git commit -m "openfit: initial import (fork of DuarteSantos8/openGym, AGPL-3.0)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git remote add openfit https://github.com/rupal2k/openfit.git
git push -u openfit openfit-main:main
git log --all --oneline -- data/secret   # check that only old branches list it, not openfit-main
```

- [ ] **Step 6: Get a green baseline.**

```bash
cd frontend && npm ci && npx vitest run
```

Expected: every existing test file passes. If any fail before the nutrition work starts, stop and report them. Don't fix unrelated tests.

---

### Task 1: Nutrition math (`lib/nutrition.js`, part 1: targets)

**Files:**
- Create: `frontend/src/lib/nutrition.js`
- Test: `frontend/src/lib/nutrition.test.js`

**Interfaces:**
- Produces: `PAL`, `GOAL_ADJ`, `MEALS`, `tdee({sex, age, heightCm, weightKg, pal}) → number`, `ageFrom(birthYear, now?) → number`, `bodyKg(S) → number|null`, `targets(S, now?) → {kcal, protein, carbs, fat} | null`. All gram values are integers.

- [ ] **Step 1: Write the failing test** `frontend/src/lib/nutrition.test.js`

```js
import { describe, it, expect } from 'vitest'
import { tdee, targets, ageFrom, bodyKg } from './nutrition.js'

const NOW = new Date('2026-06-01T12:00:00')
const S = (over = {}) => ({
  unit: 'kg',
  bodyweight: [{ d: '2026-05-30', w: 80 }],
  nutrition: { profile: { sex: 'male', birthYear: 1996, heightCm: 180, pal: 'active', goal: 'maintain', kcal: null }, days: {}, foods: [] },
  ...over
})

describe('tdee (IOM 2005, ported from OpenNutriTracker)', () => {
  it('matches hand-computed values', () => {
    expect(tdee({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, pal: 'active' })).toBeCloseTo(3164.978, 2)
    expect(tdee({ sex: 'female', age: 30, heightCm: 165, weightKg: 60, pal: 'low' })).toBeCloseTo(2156.037, 2)
    expect(tdee({ sex: 'male', age: 40, heightCm: 175, weightKg: 70, pal: 'sedentary' })).toBeCloseTo(2349.45, 2)
  })
  it('averages both equations for sex "other"', () => {
    expect(tdee({ sex: 'other', age: 30, heightCm: 180, weightKg: 80, pal: 'active' })).toBeCloseTo(2975.239, 2)
  })
})

describe('ageFrom / bodyKg', () => {
  it('derives age from birth year', () => { expect(ageFrom(1996, NOW)).toBe(30) })
  it('reads the latest weigh-in and converts lb', () => {
    expect(bodyKg(S())).toBe(80)
    expect(bodyKg(S({ unit: 'lb', bodyweight: [{ d: 'x', w: 176.37 }] }))).toBeCloseTo(80, 3)
    expect(bodyKg(S({ bodyweight: [] }))).toBeNull()
  })
})

describe('targets', () => {
  it('maintain: TDEE, 1.6 g/kg protein, 25 % fat, carbs remainder', () => {
    expect(targets(S(), NOW)).toEqual({ kcal: 3165, protein: 128, carbs: 465, fat: 88 })
  })
  it('lose subtracts 500 kcal', () => {
    const s = S(); s.nutrition.profile.goal = 'lose'
    expect(targets(s, NOW)).toEqual({ kcal: 2665, protein: 128, carbs: 372, fat: 74 })
  })
  it('manual kcal override skips the formula', () => {
    const s = S(); s.nutrition.profile.kcal = 2000
    expect(targets(s, NOW)).toEqual({ kcal: 2000, protein: 128, carbs: 246, fat: 56 })
  })
  it('override without any weigh-in falls back to 25 % protein', () => {
    const s = S({ bodyweight: [] }); s.nutrition.profile.kcal = 2000
    expect(targets(s, NOW)).toEqual({ kcal: 2000, protein: 125, carbs: 249, fat: 56 })
  })
  it('returns null when it cannot compute honestly', () => {
    expect(targets(S({ nutrition: { profile: null, days: {}, foods: [] } }), NOW)).toBeNull()
    expect(targets(S({ bodyweight: [] }), NOW)).toBeNull()
    const s = S(); s.nutrition.profile.heightCm = null
    expect(targets(s, NOW)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and check that it fails.** Run `cd frontend && npx vitest run src/lib/nutrition.test.js`. Expected: FAIL, "Failed to resolve import './nutrition.js'".

- [ ] **Step 3: Implement** `frontend/src/lib/nutrition.js`

```js
// Nutrition targets + food-diary math. The energy formulas are ported from OpenNutriTracker
// (GPL-3.0, github.com/simonoppowa/OpenNutriTracker, lib/core/utils/calc/): IOM 2005 TDEE,
// its PAL categories and the ±500 kcal goal adjustment. Protein deliberately differs — a gym
// app targets 1.6 g/kg bodyweight, not 15 % of energy.
export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
export const PAL = { sedentary: 1.25, low: 1.5, active: 1.75, very: 2.2 }
export const GOAL_ADJ = { lose: -500, maintain: 0, gain: 500 }
const PROTEIN_PER_KG = 1.6
const FAT_SHARE = 0.25
const LB = 0.45359237

function paFor(pal, male) {
  if (pal < 1.4) return 1.0
  if (pal < 1.6) return male ? 1.12 : 1.14
  if (pal < 1.9) return 1.27
  return male ? 1.54 : 1.45
}

// IOM 2005 total daily energy expenditure, kcal. sex 'other' = mean of both equations.
export function tdee({ sex, age, heightCm, weightKg, pal }) {
  const v = PAL[pal] ?? PAL.low
  const h = heightCm / 100
  const male = 864 - 9.72 * age + paFor(v, true) * (14.2 * weightKg + 503 * h)
  const female = 387 - 7.31 * age + paFor(v, false) * (10.9 * weightKg + 660.7 * h)
  return sex === 'male' ? male : sex === 'female' ? female : (male + female) / 2
}

export const ageFrom = (birthYear, now = new Date()) => now.getFullYear() - birthYear

// Latest weigh-in in kg (the log stores numbers in whatever S.unit is).
export function bodyKg(S) {
  const b = S.bodyweight?.[S.bodyweight.length - 1]
  if (!b) return null
  return S.unit === 'lb' ? b.w * LB : b.w
}

// Daily targets, or null when there isn't enough to give an honest number.
export function targets(S, now = new Date()) {
  const p = S.nutrition?.profile
  if (!p) return null
  const w = bodyKg(S)
  let kcal
  if (p.kcal) kcal = p.kcal
  else {
    if (!w || !p.heightCm || !p.birthYear) return null
    kcal = tdee({ sex: p.sex, age: ageFrom(p.birthYear, now), heightCm: p.heightCm, weightKg: w, pal: p.pal }) + (GOAL_ADJ[p.goal] ?? 0)
  }
  kcal = Math.round(kcal)
  const protein = w ? Math.round(w * PROTEIN_PER_KG) : Math.round(kcal * 0.25 / 4)
  const fat = Math.round(kcal * FAT_SHARE / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}
```

- [ ] **Step 4: Run it and check that it passes.** Run `npx vitest run src/lib/nutrition.test.js`. Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/nutrition.js frontend/src/lib/nutrition.test.js
git commit -m "feat(nutrition): TDEE + macro targets ported from OpenNutriTracker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Diary math and state wiring

**Files:**
- Modify: `frontend/src/lib/nutrition.js` (append)
- Modify: `frontend/src/store/useStore.js` (the `DEF` object and `hasData`)
- Test: `frontend/src/lib/nutrition.test.js` (append)

**Interfaces:**
- Consumes: `MEALS` (Task 1).
- Produces:
  - `entryTotals(entry) → {kcal, p, c, f}`, rounded to 1 decimal.
  - `dayTotals(entries) → {kcal, p, c, f}`, rounded to 1 decimal.
  - `addEntry(S, iso, {meal, g, food}) → Entry`, which mutates the draft `S` and stamps `id` and `t`.
  - `updateEntry(S, iso, id, patch)`.
  - `removeEntry(S, iso, id)`, which deletes the day key once it is empty.
  - `recentFoods(S, limit=20) → Food[]`, newest first, de-duplicated by `code || name`.
  - `DEF.nutrition = { profile: null, days: {}, foods: [] }`.

- [ ] **Step 1: Append the failing tests** to `nutrition.test.js`

```js
import { entryTotals, dayTotals, addEntry, updateEntry, removeEntry, recentFoods } from './nutrition.js'

const YOG = { src: 'off', code: '0894700010137', name: 'Nonfat Greek Yogurt', brand: 'Chobani', serving: 170, per100: { kcal: 52.9, p: 9.41, c: 3.53, f: 0 } }
const OAT = { src: 'custom', id: 'c1', code: '', name: 'Oats', brand: '', serving: null, per100: { kcal: 379, p: 13.2, c: 67.7, f: 6.5 } }
const blank = () => ({ nutrition: { profile: null, days: {}, foods: [] } })

describe('entry/day totals', () => {
  it('scales per-100 g values by grams', () => {
    expect(entryTotals({ g: 170, food: YOG })).toEqual({ kcal: 89.9, p: 16, c: 6, f: 0 })
  })
  it('sums a day, empty day is zero', () => {
    expect(dayTotals([{ g: 170, food: YOG }, { g: 50, food: OAT }])).toEqual({ kcal: 279.4, p: 22.6, c: 39.9, f: 3.3 })
    expect(dayTotals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
    expect(dayTotals(undefined)).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
  })
})

describe('diary mutators', () => {
  it('adds, updates and removes entries; empty days disappear', () => {
    const S = blank()
    const e = addEntry(S, '2026-06-01', { meal: 'breakfast', g: 170, food: YOG })
    expect(e.id).toBeTruthy()
    expect(typeof e.t).toBe('number')
    expect(S.nutrition.days['2026-06-01']).toHaveLength(1)
    updateEntry(S, '2026-06-01', e.id, { g: 200, meal: 'snack' })
    expect(S.nutrition.days['2026-06-01'][0]).toMatchObject({ g: 200, meal: 'snack' })
    removeEntry(S, '2026-06-01', e.id)
    expect(S.nutrition.days['2026-06-01']).toBeUndefined()
  })
  it('snapshots the food so later edits to the source do not rewrite history', () => {
    const S = blank()
    const src = structuredClone(OAT)
    addEntry(S, '2026-06-01', { meal: 'lunch', g: 50, food: src })
    src.per100.kcal = 1
    expect(S.nutrition.days['2026-06-01'][0].food.per100.kcal).toBe(379)
  })
  it('recentFoods: newest first, de-duplicated', () => {
    const S = blank()
    S.nutrition.days = {
      '2026-05-30': [{ id: 'a', meal: 'lunch', g: 50, t: 1, food: OAT }],
      '2026-06-01': [{ id: 'b', meal: 'breakfast', g: 170, t: 3, food: YOG }, { id: 'c', meal: 'snack', g: 40, t: 2, food: OAT }]
    }
    expect(recentFoods(S).map(f => f.name)).toEqual(['Nonfat Greek Yogurt', 'Oats'])
    expect(recentFoods(S, 1)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run them and check that they fail.** Run `npx vitest run src/lib/nutrition.test.js`. Expected: FAIL, "entryTotals is not a function" (or a missing export).

- [ ] **Step 3: Append the implementation** to `nutrition.js`

```js
import { uid } from './format.js'

const r1 = x => Math.round(x * 10) / 10
const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0 })

export function entryTotals({ g, food }) {
  const k = g / 100, n = food.per100
  return { kcal: r1(n.kcal * k), p: r1(n.p * k), c: r1(n.c * k), f: r1(n.f * k) }
}

export function dayTotals(entries) {
  const sum = ZERO()
  for (const e of entries || []) {
    const k = e.g / 100, n = e.food.per100
    sum.kcal += n.kcal * k; sum.p += n.p * k; sum.c += n.c * k; sum.f += n.f * k
  }
  return { kcal: r1(sum.kcal), p: r1(sum.p), c: r1(sum.c), f: r1(sum.f) }
}

// Mutators take the draft S handed out by useStore().update(mut).
export function addEntry(S, iso, { meal, g, food }) {
  const e = { id: uid(), meal, g, t: Date.now(), food: structuredClone(food) }
  ;(S.nutrition.days[iso] ||= []).push(e)
  return e
}
export function updateEntry(S, iso, id, patch) {
  const e = (S.nutrition.days[iso] || []).find(x => x.id === id)
  if (e) Object.assign(e, patch)
}
export function removeEntry(S, iso, id) {
  const list = (S.nutrition.days[iso] || []).filter(x => x.id !== id)
  if (list.length) S.nutrition.days[iso] = list
  else delete S.nutrition.days[iso]
}

// ponytail: scans every logged day; fine for years of logs. Index it if it ever shows in a profile.
export function recentFoods(S, limit = 20) {
  const all = Object.values(S.nutrition?.days || {}).flat().sort((a, b) => b.t - a.t)
  const seen = new Set(), out = []
  for (const e of all) {
    const key = e.food.code || e.food.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key); out.push(e.food)
    if (out.length >= limit) break
  }
  return out
}
```

Then check the day-sum expectation: 52.9×1.7 + 379×0.5 = 89.93 + 189.5 = 279.43, which rounds to 279.4. ✓ Protein: 15.997 + 6.6 = 22.597, which rounds to 22.6. ✓ Carbs: 6.001 + 33.85 = 39.851, which rounds to 39.9. ✓ Fat: 0 + 3.25 = 3.25. `Math.round(32.5) / 10` gives **3.3**. ✓

- [ ] **Step 4: Wire the state.** In `frontend/src/store/useStore.js`, add one line to `DEF` after the `reminder:` line (keep the trailing comma style):

```js
  reminder: { on: false, time: '08:00', tz: null }, effort: null,
  // food diary — see lib/nutrition.js for the shapes
  nutrition: { profile: null, days: {}, foods: [] }
```

Then replace `hasData`. Without this change, a profile that has only logged food counts as "empty", and `pullState()` overwrites the local food log with the server copy:

```js
const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length
  || Object.keys(st.nutrition?.days || {}).length)
```

- [ ] **Step 5: Run all the tests.** Run `npx vitest run`. Expected: everything passes, including the earlier test files.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/nutrition.js frontend/src/lib/nutrition.test.js frontend/src/store/useStore.js
git commit -m "feat(nutrition): diary entries, totals and synced state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Open Food Facts normaliser (`lib/off.js`)

**Files:**
- Create: `frontend/src/lib/off.js`
- Test: `frontend/src/lib/off.test.js`

**Interfaces:**
- Produces:
  - `OFF_FIELDS`, a comma-separated string.
  - `normalizeOFF(product) → Food | null`. It returns `null` when the product has no name or no energy value.
- Shapes checked live on 2026-10-15:
  - Search hits have `brands` as an **array**.
  - The v2 product API has `brands` as a **comma string**.
  - `serving_quantity` may be absent.
  - Energy is `energy-kcal_100g`; `energy_100g` is in kJ.

- [ ] **Step 1: Write the failing test** `frontend/src/lib/off.test.js`

```js
import { describe, it, expect } from 'vitest'
import { normalizeOFF } from './off.js'

describe('normalizeOFF', () => {
  it('maps a search hit (brands as array)', () => {
    const hit = { code: '0894700010137', product_name: 'Nonfat Greek Yogurt ', brands: ['Chobani', 'X'], serving_quantity: '170',
      nutriments: { 'energy-kcal_100g': 52.9, proteins_100g: 9.41, carbohydrates_100g: 3.53, fat_100g: 0 } }
    expect(normalizeOFF(hit)).toEqual({ src: 'off', code: '0894700010137', name: 'Nonfat Greek Yogurt', brand: 'Chobani',
      serving: 170, per100: { kcal: 52.9, p: 9.41, c: 3.53, f: 0 } })
  })
  it('maps a v2 product (brands as comma string), missing macros → 0, no serving → null', () => {
    const p = { code: '3017624010701', product_name: 'Nutella', brands: 'Ferrero, Nutella', nutriments: { 'energy-kcal_100g': 539 } }
    expect(normalizeOFF(p)).toMatchObject({ brand: 'Ferrero', serving: null, per100: { kcal: 539, p: 0, c: 0, f: 0 } })
  })
  it('falls back to kJ when kcal is missing', () => {
    expect(normalizeOFF({ code: '1', product_name: 'A', nutriments: { energy_100g: 2255 } }).per100.kcal).toBe(539)
  })
  it('uses product_name_en when product_name is empty', () => {
    expect(normalizeOFF({ code: '1', product_name: '', product_name_en: 'Oats', nutriments: { 'energy-kcal_100g': 379 } }).name).toBe('Oats')
  })
  it('rejects products without a name or energy', () => {
    expect(normalizeOFF({ code: '1', product_name: 'A', nutriments: {} })).toBeNull()
    expect(normalizeOFF({ code: '1', nutriments: { 'energy-kcal_100g': 10 } })).toBeNull()
    expect(normalizeOFF(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and check that it fails.** Run `npx vitest run src/lib/off.test.js`. Expected: FAIL, unresolved import.

- [ ] **Step 3: Implement** `frontend/src/lib/off.js`

```js
// Open Food Facts → our Food shape (see lib/nutrition.js). Field names follow OpenNutriTracker's
// off_const.dart. Search hits carry `brands` as an array, the v2 product API as a comma string.
export const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_quantity'

const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v)

export function normalizeOFF(p) {
  if (!p) return null
  const n = p.nutriments || {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === null && num(n.energy_100g) !== null) kcal = Math.round(num(n.energy_100g) / 4.184 * 10) / 10
  const name = (p.product_name || p.product_name_en || '').trim()
  if (!name || kcal === null) return null
  const brand = Array.isArray(p.brands) ? p.brands[0] || '' : String(p.brands || '').split(',')[0].trim()
  return {
    src: 'off', code: String(p.code || ''), name, brand,
    serving: num(p.serving_quantity),
    per100: { kcal, p: num(n.proteins_100g) ?? 0, c: num(n.carbohydrates_100g) ?? 0, f: num(n.fat_100g) ?? 0 }
  }
}
```

- [ ] **Step 4: Run it and check that it passes.** Run `npx vitest run src/lib/off.test.js`. Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/off.js frontend/src/lib/off.test.js
git commit -m "feat(nutrition): Open Food Facts normaliser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Food search proxy (API) and food client

**Files:**
- Modify: `api/server.js`. Add a block before `/* ---------- routes ---------- */` and a route inside `routes`.
- Create: `frontend/src/lib/food.js`

**Interfaces:**
- Consumes: `OFF_FIELDS` and `normalizeOFF` (Task 3); `api()` from `src/lib/api.js`; `MOBILE` from `src/lib/mobile.js`; `DEMO` from `src/lib/demo.js`.
- Produces:
  - HTTP `GET /api/food/search?q=<2..100 chars>`. Responses: `200 {hits: OFFProduct[]}`, `400`, `401` or `502`.
  - JS `SEARCH_OK: boolean`.
  - `searchFoods(q) → Promise<Food[]>`.
  - `lookupBarcode(code) → Promise<Food|null>`.

- [ ] **Step 1: Add the proxy block** to `api/server.js`, directly above `/* ---------- routes ---------- */`

```js
/* ---------- food search proxy (Open Food Facts) ---------- */
// search.openfoodfacts.org sends no CORS headers, so the browser can't query it itself.
// Signed-in users only — never an open proxy. Cached briefly: search-as-you-type repeats a lot.
const OFF_UA = 'openfit/1 (self-hosted; github.com/rupal2k/openfit)';
const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_quantity';
const foodCache = new Map();               // query -> { at, hits }; insertion-ordered = FIFO
const FOOD_TTL = 10 * 60000, FOOD_CACHE_MAX = 500;
```

- [ ] **Step 2: Add the route** inside `const routes = {`, after `'PUT /api/data'`

```js
  'GET /api/food/search': async (req, res) => {
    if (!readSession(req)) return json(res, 401, { error: 'not signed in' });
    const q = (new URL(req.url, 'http://x').searchParams.get('q') || '').trim().slice(0, 100);
    if (q.length < 2) return json(res, 400, { error: 'query too short' });
    const key = q.toLowerCase();
    const c = foodCache.get(key);
    if (c && Date.now() - c.at < FOOD_TTL) return json(res, 200, { hits: c.hits });
    let r;
    try {
      r = await fetch('https://search.openfoodfacts.org/search?page_size=25&fields=' + OFF_FIELDS + '&q=' + encodeURIComponent(q),
        { headers: { 'User-Agent': OFF_UA }, signal: AbortSignal.timeout(8000) });
    } catch { return json(res, 502, { error: 'food database unreachable' }); }
    if (!r.ok) return json(res, 502, { error: 'food database error ' + r.status });
    const hits = (await r.json()).hits || [];
    foodCache.set(key, { at: Date.now(), hits });
    if (foodCache.size > FOOD_CACHE_MAX) foodCache.delete(foodCache.keys().next().value);
    json(res, 200, { hits });
  },
```

- [ ] **Step 3: Rebuild the API and verify that it refuses anonymous callers.**

```bash
cd /home/rupaldas/openGym && docker compose up -d --build api web
docker compose exec web wget -qO- --server-response http://api:3000/api/food/search?q=oats 2>&1 | grep -E "HTTP/|error"
```

Expected: `HTTP/1.1 401` with `{"error":"not signed in"}`.

- [ ] **Step 4: Create** `frontend/src/lib/food.js`

```js
// Food lookups. Search goes through our API (OFF search has no CORS); barcode lookups hit
// world.openfoodfacts.org directly — it sends Access-Control-Allow-Origin: *, so they also work
// in the mobile and demo builds, which have no backend.
import { api } from './api.js'
import { MOBILE } from './mobile.js'
import { DEMO } from './demo.js'
import { OFF_FIELDS, normalizeOFF } from './off.js'

export const SEARCH_OK = !MOBILE && !DEMO

export async function searchFoods(q) {
  const { hits } = await api('/api/food/search?q=' + encodeURIComponent(q))
  return hits.map(normalizeOFF).filter(Boolean)
}

export async function lookupBarcode(code) {
  const clean = String(code).replace(/\D/g, '')
  if (clean.length < 8) return null
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}?fields=${OFF_FIELDS}`)
  const d = await r.json().catch(() => ({}))
  return d.status === 1 ? normalizeOFF(d.product) : null   // unknown codes come back 200 + status 0
}
```

- [ ] **Step 5: Run the build and tests.** Run `cd frontend && npx vitest run && npm run build`. Expected: everything passes and the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add api/server.js frontend/src/lib/food.js
git commit -m "feat(nutrition): signed-in OFF search proxy + barcode lookup client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Nutrition profile sheet (targets set-up)

**Files:**
- Create: `frontend/src/nutrition-sheets.jsx`

**Interfaces:**
- Consumes: `targets`, `bodyKg`, `PAL` (Task 1); `useStore`, `useUI`; `Segmented`, `SelectRow`, `NumberField`, `Row`, `Button` from `components/ui.jsx`; `bwSheet` from `sheets.jsx`.
- Produces: `nutritionProfileSheet()`.

- [ ] **Step 1: Create the file** with its shared header and the profile sheet

```jsx
// Nutrition sheets: targets set-up, food search, amount, custom food, barcode scan.
// Kept apart from sheets.jsx (workouts/plan), which is already 1,200 lines.
import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { t } from './lib/i18n.js'
import { fmtNum, uid } from './lib/format.js'
import { targets, bodyKg, entryTotals, addEntry, updateEntry, removeEntry, recentFoods, MEALS } from './lib/nutrition.js'
import { searchFoods, lookupBarcode, SEARCH_OK } from './lib/food.js'
import { bwSheet } from './sheets.jsx'
import Icon from './components/Icon.jsx'
import { Button, Segmented, SelectRow, NumberField, Row, Stepper, SearchField, TextField } from './components/ui.jsx'

const update = (...a) => useStore.getState().update(...a)
const ui = () => useUI.getState()
const toast = m => ui().toast(m)
export const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

/* ============================ profile / targets ============================ */
const DEF_PROFILE = { sex: 'male', birthYear: null, heightCm: null, pal: 'low', goal: 'maintain', kcal: null }

export const nutritionProfileSheet = () => ui().openSheet(close => <NutritionProfile close={close} />)

function NutritionProfile({ close }) {
  const S = useStore(s => s.S)
  const [p, setP] = useState({ ...DEF_PROFILE, ...(S.nutrition.profile || {}) })
  const set = k => v => setP(o => ({ ...o, [k]: v }))
  const preview = targets({ ...S, nutrition: { ...S.nutrition, profile: p } })
  const w = bodyKg(S)
  const save = () => { update(s => { s.nutrition.profile = p }); close(); toast(t('Targets saved')) }
  return <>
    <h3>{t('Your targets')}</h3>
    <Row title={t('Sex')}><Segmented className="seg-inline" value={p.sex} onChange={set('sex')}
      options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'other', label: t('Other') }]} /></Row>
    <Row title={t('Birth year')}><NumberField decimal={false} nullable value={p.birthYear} onChange={set('birthYear')} placeholder="1990" /></Row>
    <Row title={t('Height (cm)')}><NumberField decimal={false} nullable value={p.heightCm} onChange={set('heightCm')} placeholder="175" /></Row>
    <Row title={t('Body weight')} value={w ? fmtNum(w) + ' kg' : t('Not logged')} accessory="chevron" onClick={() => bwSheet()} />
    <SelectRow title={t('Activity')} value={p.pal} onChange={set('pal')} options={[
      { value: 'sedentary', label: t('Sedentary'), subtitle: t('Desk job, little walking') },
      { value: 'low', label: t('Lightly active'), subtitle: t('Some walking, training 1–3× a week') },
      { value: 'active', label: t('Active'), subtitle: t('On your feet a lot, training 3–5× a week') },
      { value: 'very', label: t('Very active'), subtitle: t('Physical job or training daily') }]} />
    <Row title={t('Goal')}><Segmented className="seg-inline" value={p.goal} onChange={set('goal')}
      options={[{ value: 'lose', label: t('Lose') }, { value: 'maintain', label: t('Maintain') }, { value: 'gain', label: t('Gain') }]} /></Row>
    <Row title={t('Calorie override')} subtitle={t('Leave empty to calculate')}>
      <NumberField decimal={false} nullable value={p.kcal} onChange={set('kcal')} placeholder="—" /></Row>
    <div className="card" style={{ margin: '12px 0' }}>
      {preview
        ? <div className="row between"><b className="accent">{preview.kcal} kcal</b>
            <span className="small muted">{t('P {0} g · C {1} g · F {2} g', preview.protein, preview.carbs, preview.fat)}</span></div>
        : <div className="small muted">{t('Add birth year, height and a weigh-in — or set a calorie override.')}</div>}
    </div>
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
    <div className="small dim" style={{ marginTop: 8 }}>{t('Estimate from the IOM 2005 equations, as used by OpenNutriTracker. Protein: 1.6 g per kg body weight.')}</div>
  </>
}
```

`bwSheet` is exported from `sheets.jsx`; it is already imported in `Home.jsx`. Before relying on it, check that it takes no required arguments by running `grep -n "export const bwSheet" frontend/src/sheets.jsx`. If it needs arguments, pass the same ones `Home.jsx` passes.

- [ ] **Step 2: Build.** Run `cd frontend && npm run build`. Expected: success. The sheet isn't reachable yet; it gets wired up in Task 7.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/nutrition-sheets.jsx
git commit -m "feat(nutrition): targets set-up sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Food search, amount and custom-food sheets

**Files:**
- Modify: `frontend/src/nutrition-sheets.jsx` (append)

**Interfaces:**
- Consumes: Tasks 1 to 5.
- Produces: `foodSearchSheet(iso, meal)`, `foodAmountSheet(iso, meal, food, entry?)`, `customFoodSheet(onDone)`.

- [ ] **Step 1: Append the amount sheet.** It handles both adding a new entry and editing an existing one.

```jsx
/* ============================ amount (add / edit) ============================ */
export const foodAmountSheet = (iso, meal, food, entry) =>
  ui().openSheet(close => <FoodAmount iso={iso} meal={meal} food={food} entry={entry} close={close} />)

function FoodAmount({ iso, meal: meal0, food, entry, close }) {
  const [g, setG] = useState(entry ? entry.g : food.serving || 100)
  const [meal, setMeal] = useState(entry ? entry.meal : meal0)
  const tot = entryTotals({ g: g || 0, food })
  const save = () => {
    if (!(g > 0)) return toast(t('Enter an amount'))
    update(s => entry ? updateEntry(s, iso, entry.id, { g, meal }) : addEntry(s, iso, { meal, g, food }))
    close()
  }
  return <>
    <h3>{food.name}</h3>
    {food.brand && <div className="small muted" style={{ marginTop: -6, marginBottom: 10 }}>{food.brand}</div>}
    <Stepper label={t('Amount')} unit="g" value={g} step={10} decimal={false} onChange={setG} />
    {food.serving && <Button size="sm" variant="ghost" onClick={() => setG(food.serving)}>{t('1 serving ({0} g)', food.serving)}</Button>}
    <div style={{ margin: '12px 0' }}><Segmented value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: t(MEAL_LABEL[m]) }))} /></div>
    <div className="card row between" style={{ marginBottom: 12 }}>
      <b className="accent">{fmtNum(tot.kcal)} kcal</b>
      <span className="small muted">{t('P {0} g · C {1} g · F {2} g', fmtNum(tot.p), fmtNum(tot.c), fmtNum(tot.f))}</span>
    </div>
    <Button variant="primary" onClick={save}>{entry ? t('Save') : t('Add')}</Button>
    {entry && <><div style={{ height: 8 }} />
      <Button variant="danger" icon="trash" onClick={() => { update(s => removeEntry(s, iso, entry.id)); close() }}>{t('Remove')}</Button></>}
  </>
}
```

- [ ] **Step 2: Append the custom-food sheet.**

```jsx
/* ============================ custom food ============================ */
export const customFoodSheet = onDone => ui().openSheet(close => <CustomFood onDone={onDone} close={close} />)

function CustomFood({ onDone, close }) {
  const [name, setName] = useState('')
  const [n, setN] = useState({ kcal: null, p: null, c: null, f: null })
  const setK = k => v => setN(o => ({ ...o, [k]: v }))
  const save = () => {
    if (!name.trim() || n.kcal === null) return toast(t('Name and calories are required'))
    const food = { src: 'custom', id: uid(), code: '', name: name.trim(), brand: '', serving: null,
      per100: { kcal: n.kcal, p: n.p ?? 0, c: n.c ?? 0, f: n.f ?? 0 } }
    update(s => { s.nutrition.foods.push(food) })
    close(); onDone && onDone(food)
  }
  return <>
    <h3>{t('New food')}</h3>
    <TextField placeholder={t('Name')} value={name} onChange={e => setName(e.target.value)} autoFocus />
    <h4 className="sec">{t('Per 100 g')}</h4>
    <Row title={t('Calories (kcal)')}><NumberField nullable value={n.kcal} onChange={setK('kcal')} /></Row>
    <Row title={t('Protein (g)')}><NumberField nullable value={n.p} onChange={setK('p')} /></Row>
    <Row title={t('Carbs (g)')}><NumberField nullable value={n.c} onChange={setK('c')} /></Row>
    <Row title={t('Fat (g)')}><NumberField nullable value={n.f} onChange={setK('f')} /></Row>
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </>
}
```

- [ ] **Step 3: Append the search sheet.** When the query is empty it shows recent foods and the user's own foods. Typing searches after a 400 ms pause. Stale responses are ignored.

```jsx
/* ============================ search ============================ */
export const foodSearchSheet = (iso, meal) => ui().openSheet(close => <FoodSearch iso={iso} meal={meal} close={close} />)

function FoodSearch({ iso, meal, close }) {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [res, setRes] = useState({ q: '', foods: [], busy: false, err: null })
  const seq = useRef(0)
  useEffect(() => {
    const term = q.trim()
    if (!SEARCH_OK || term.length < 2) { setRes({ q: '', foods: [], busy: false, err: null }); return }
    const my = ++seq.current
    setRes(r => ({ ...r, busy: true, err: null }))
    const tm = setTimeout(() => searchFoods(term)
      .then(foods => { if (my === seq.current) setRes({ q: term, foods, busy: false, err: null }) })
      .catch(e => { if (my === seq.current) setRes({ q: term, foods: [], busy: false, err: e.message }) }), 400)
    return () => clearTimeout(tm)
  }, [q])

  const pick = food => { close(); foodAmountSheet(iso, meal, food) }
  const term = q.trim().toLowerCase()
  const mine = S.nutrition.foods.filter(f => !term || f.name.toLowerCase().includes(term))
  const recent = term ? [] : recentFoods(S, 15)
  const row = (f, i) => <Row key={(f.code || f.id || f.name) + i} title={f.name}
    subtitle={[f.brand, t('{0} kcal / 100 g', fmtNum(f.per100.kcal))].filter(Boolean).join(' · ')}
    accessory="chevron" onClick={() => pick(f)} />

  return <>
    <h3>{t('Add to {0}', t(MEAL_LABEL[meal]))}</h3>
    {SEARCH_OK
      ? <SearchField placeholder={t('Search foods')} value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} autoFocus />
      : <div className="small muted">{t('Food search needs a self-hosted server. Scan a barcode or add your own food.')}</div>}
    <div className="row" style={{ gap: 8, margin: '10px 0' }}>
      {'BarcodeDetector' in window && <Button size="sm" variant="tinted" icon="barcode" onClick={() => { close(); barcodeSheet(iso, meal) }}>{t('Scan barcode')}</Button>}
      <Button size="sm" variant="tinted" icon="plus" onClick={() => { close(); customFoodSheet(f => foodAmountSheet(iso, meal, f)) }}>{t('New food')}</Button>
    </div>
    {res.busy && <div className="small muted">{t('Searching…')}</div>}
    {res.err && <div className="small" style={{ color: 'var(--red)' }}>{t('Search failed: {0}', res.err)}</div>}
    {!!mine.length && <><h4 className="sec">{t('My foods')}</h4><div className="sect-b">{mine.map(row)}</div></>}
    {!!recent.length && <><h4 className="sec">{t('Recent')}</h4><div className="sect-b">{recent.map(row)}</div></>}
    {!!res.foods.length && <><h4 className="sec">{t('Open Food Facts')}</h4><div className="sect-b">{res.foods.map(row)}</div></>}
    {!res.busy && res.q && !res.foods.length && !res.err && <div className="small muted">{t('No results for “{0}”.', res.q)}</div>}
  </>
}
```

`barcodeSheet` is defined in Task 8. Until then, add this temporary stub at the end of the file so the build passes. Task 8 replaces it.

```jsx
export const barcodeSheet = () => toast(t('Barcode scanning is coming soon'))
```

- [ ] **Step 4: Build.** Run `cd frontend && npx vitest run && npm run build`. Expected: everything passes and the build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/nutrition-sheets.jsx
git commit -m "feat(nutrition): food search, amount and custom-food sheets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Nutrition screen, route, Food tab and icons

**Files:**
- Create: `frontend/src/views/Nutrition.jsx`
- Modify: `frontend/src/App.jsx` (import plus one `<Route>`)
- Modify: `frontend/src/components/TabBar.jsx` (one `<Tab>`)
- Modify: `frontend/src/components/Icon.jsx` (`apple` and `barcode` entries in `P`)

**Interfaces:**
- Consumes: `targets`, `dayTotals`, `entryTotals`, `MEALS` (Tasks 1 and 2); `nutritionProfileSheet`, `foodSearchSheet`, `foodAmountSheet`, `MEAL_LABEL` (Tasks 5 and 6); `todayISO`, `isoOf`, `fmtNum`, `fmtDate` from `lib/format.js`.
- Produces: route `/nutrition`.

- [ ] **Step 1: Add the icons.** In `Icon.jsx`, inside `const P = {`, add these after `heart:`. They follow the conventions at the top of the file: 24-unit grid, strokes only.

```jsx
  apple: <><path d="M12 7.6c-1.6-1.2-4.6-1.4-6.1.8-1.6 2.4-.9 6.6 1.4 9.6 1.3 1.7 2.6 2.4 3.6 1.9.6-.3.9-.3 1.1-.3s.5 0 1.1.3c1 .5 2.3-.2 3.6-1.9 2.3-3 3-7.2 1.4-9.6-1.5-2.2-4.5-2-6.1-.8Z" /><path d="M12 7.6c0-1.8.8-3.2 2.4-4" /></>,
  barcode: <path d="M4.5 6.5v11M7.5 6.5v11M10 6.5v11M13.5 6.5v11M16 6.5v11M19.5 6.5v11" />,
```

- [ ] **Step 2: Create** `frontend/src/views/Nutrition.jsx`

```jsx
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { targets, dayTotals, entryTotals, MEALS } from '../lib/nutrition.js'
import { todayISO, isoOf, fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { nutritionProfileSheet, foodSearchSheet, foodAmountSheet, MEAL_LABEL } from '../nutrition-sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const shift = (iso, days) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return isoOf(d) }

function Bar({ label, val, goal, unit }) {
  const pct = goal ? Math.min(100, (val / goal) * 100) : 0
  const over = goal && val > goal
  return <div style={{ flex: 1, minWidth: 0 }}>
    <div className="small muted">{label}</div>
    <div style={{ fontWeight: 600 }}>{fmtNum(val)}{goal ? <span className="dim"> / {goal}</span> : null} {unit}</div>
    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: over ? 'var(--orange)' : 'var(--acc)' }} />
    </div>
  </div>
}

export default function Nutrition() {
  const S = useStore(s => s.S)
  const [iso, setIso] = useState(todayISO())
  const entries = S.nutrition.days[iso] || []
  const tot = dayTotals(entries)
  const goal = targets(S)
  const isToday = iso === todayISO()

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Food')}</h1><div className="sub">{isToday ? t('Today') : fmtDate(iso, true)}</div></div>
      <button className="iconbtn" onClick={nutritionProfileSheet} aria-label={t('Targets')}><Icon name="target" /></button>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setIso(shift(iso, -1))} aria-label={t('Previous day')}><Icon name="chevronLeft" /></button>
        <div className="small muted" style={{ fontWeight: 500 }}>{fmtDate(iso, true)}</div>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setIso(shift(iso, 1))} disabled={isToday} aria-label={t('Next day')}><Icon name="chevronRight" /></button>
      </div>
      <Bar label={t('Calories')} val={tot.kcal} goal={goal?.kcal} unit="kcal" />
      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <Bar label={t('Protein')} val={tot.p} goal={goal?.protein} unit="g" />
        <Bar label={t('Carbs')} val={tot.c} goal={goal?.carbs} unit="g" />
        <Bar label={t('Fat')} val={tot.f} goal={goal?.fat} unit="g" />
      </div>
      {!goal && <Button size="sm" variant="tinted" icon="target" style={{ marginTop: 12 }} onClick={nutritionProfileSheet}>{t('Set your targets')}</Button>}
    </div>

    {MEALS.map(m => {
      const list = entries.filter(e => e.meal === m)
      const kcal = dayTotals(list).kcal
      return <section className="sect" key={m}>
        <h2 className="sect-t row between"><span>{t(MEAL_LABEL[m])}</span>{kcal > 0 && <span className="dim">{fmtNum(kcal)} kcal</span>}</h2>
        <div className="sect-b">
          {list.map(e => <button key={e.id} className="lrow tap" onClick={() => foodAmountSheet(iso, m, e.food, e)}>
            <span className="lrow-m"><span className="lrow-t">{e.food.name}</span><span className="lrow-s">{e.g} g</span></span>
            <span className="lrow-v">{fmtNum(entryTotals(e).kcal)} kcal</span>
          </button>)}
          <button className="lrow tap" onClick={() => foodSearchSheet(iso, m)}>
            <span className="lrow-i"><Icon name="plus" /></span>
            <span className="lrow-m"><span className="lrow-t">{t('Add food')}</span></span>
          </button>
        </div>
      </section>
    })}
    <div className="small dim" style={{ textAlign: 'center', margin: '16px 0 90px' }}>{t('Food data © Open Food Facts contributors, ODbL')}</div>
  </div>
}
```

- [ ] **Step 3: Add the route.** In `App.jsx`, add `import Nutrition from './views/Nutrition.jsx'` after the `Library` import. Add `<Route path="/nutrition" element={<Nutrition />} />` after the `/library` route.

- [ ] **Step 4: Add the tab.** In `TabBar.jsx`, add this between the `stats` tab and the `library` tab:

```jsx
      <Tab k="nutrition" icon="apple" to="/nutrition" label={t('Food')} />
```

The tab bar goes from 5 slots to 6. Check it at 360 px width (Step 5) to make sure the labels don't wrap. If they do, **stop and ask the user** whether to shorten the "Exercises" label or move Food somewhere else. Don't rearrange the tab bar on your own (user rule: preserve approved layouts).

- [ ] **Step 5: Run the build, then check it by hand.**

```bash
cd frontend && npx vitest run && npm run build
cd .. && docker compose up -d --build web api
```

Open `http://localhost:8080`, sign in, and set DevTools device mode to 360×780. Then check:
1. The Food tab appears and is highlighted when active. The tab labels don't wrap.
2. "Set your targets" opens the sheet. Fill it in and save. The bars show goals.
3. Tap "Add food" under Breakfast. Search "greek yogurt". Results appear in under 3 s. Pick one, change the grams, then Add. The entry appears with its kcal.
4. Tap the entry, change the meal to Snacks, and save. It moves. Open it again and Remove it. It's gone.
5. "New food" saves a custom food, which then shows under "My foods".
6. Use the previous-day arrow. The diary is empty, and next-day is disabled on today.
7. Reload the page. Everything persists. Sign in on a second browser. The entries sync (within the 1.5 s push debounce).
8. Settings → export JSON. The file contains `nutrition.days`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/Nutrition.jsx frontend/src/App.jsx frontend/src/components/TabBar.jsx frontend/src/components/Icon.jsx
git commit -m "feat(nutrition): Food tab with daily diary and macro progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Barcode scanning

**Files:**
- Modify: `frontend/src/nutrition-sheets.jsx` (replace the `barcodeSheet` stub)

**Interfaces:**
- Consumes: `lookupBarcode` (Task 4) and `foodAmountSheet` (Task 6).
- Produces: `barcodeSheet(iso, meal)`.
- Platform note: `BarcodeDetector` exists in Chrome and Edge on Android, ChromeOS and macOS. It does **not** exist in Safari or Firefox. The search sheet only shows the button when `'BarcodeDetector' in window`, and this sheet always offers manual code entry. Adding a zxing fallback for iOS is a follow-up, and it would need a new dependency.

- [ ] **Step 1: Replace the stub** with:

```jsx
/* ============================ barcode ============================ */
export const barcodeSheet = (iso, meal) => ui().openSheet(close => <Barcode iso={iso} meal={meal} close={close} />)

function Barcode({ iso, meal, close }) {
  const video = useRef(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const busy = useRef(false)

  const find = async c => {
    if (busy.current) return
    busy.current = true; setMsg(t('Looking up {0}…', c))
    try {
      const food = await lookupBarcode(c)
      if (food) { close(); foodAmountSheet(iso, meal, food); return }
      setMsg(t('{0} isn’t in Open Food Facts. Add it as your own food instead.', c))
    } catch { setMsg(t('Lookup failed — check your connection.')) }
    busy.current = false
  }

  useEffect(() => {
    if (!('BarcodeDetector' in window)) return
    let stream, raf, stop = false
    const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
      if (stop) { s.getTracks().forEach(tr => tr.stop()); return }
      stream = s; video.current.srcObject = s; video.current.play()
      const tick = async () => {
        if (stop) return
        try { const [hit] = await det.detect(video.current); if (hit) find(hit.rawValue) } catch { /* frame not ready */ }
        raf = setTimeout(tick, 250)
      }
      tick()
    }).catch(() => setMsg(t('Camera unavailable — type the code instead.')))
    return () => { stop = true; clearTimeout(raf); stream && stream.getTracks().forEach(tr => tr.stop()) }
  }, [])

  return <>
    <h3>{t('Scan barcode')}</h3>
    {'BarcodeDetector' in window && <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '4/3', objectFit: 'cover' }} />}
    <div className="row" style={{ gap: 8, marginTop: 10 }}>
      <TextField inputMode="numeric" placeholder={t('Or type the code')} value={code} onChange={e => setCode(e.target.value)} style={{ flex: 1 }} />
      <Button size="sm" variant="tinted" onClick={() => find(code)}>{t('Look up')}</Button>
    </div>
    {msg && <div className="small muted" style={{ marginTop: 8 }}>{msg}</div>}
  </>
}
```

The camera only works on a **secure origin**: HTTPS or `localhost`. Plain-HTTP LAN addresses fall back to typing the code.

- [ ] **Step 2: Check it.** Run `npm run build`. Then, on Chrome for Android connected through HTTPS (or desktop Chrome on localhost with a webcam), scan any EAN. The amount sheet should open with the product. Typing `3017624010701` and pressing Look up should give Nutella at 539 kcal. Typing `00000000` should show the "isn't in Open Food Facts" message. Closing the sheet should turn the camera light off.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/nutrition-sheets.jsx
git commit -m "feat(nutrition): barcode scan via native BarcodeDetector with manual fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Attribution, docs and the project log

**Files:**
- Modify: `NOTICE.md`, `README.md` (Features list), `CHANGELOG.md`
- Create: `/home/rupaldas/Documents/Calude Vault/openfit.md` (user's standing rule). The folder name really is "Calude"; don't "fix" it.

- [ ] **Step 1: Add this section to `NOTICE.md`** after "## Exercise data & media":

```markdown
## Nutrition formulas & food data

The calorie target (IOM 2005 equations, activity categories, goal adjustment) is ported from
[**OpenNutriTracker**](https://github.com/simonoppowa/OpenNutriTracker) by Simon Oppowa and
contributors, GPL-3.0 — `lib/core/utils/calc/`. Food data comes from
[**Open Food Facts**](https://world.openfoodfacts.org), © Open Food Facts contributors,
available under the Open Database License (ODbL).
```

- [ ] **Step 2: Add a feature bullet to `README.md`** after the "🏃 **Cardio**" bullet:

```markdown
- 🍎 **Food diary** — search Open Food Facts or scan a barcode, log meals in grams, and see calories and protein/carbs/fat against targets worked out from your logged body weight (formulas from OpenNutriTracker). Your own foods, recent foods, synced like everything else
```

- [ ] **Step 3: Add a `CHANGELOG.md` entry** at the top, following the file's existing heading style (read its first 20 lines first). Summarise Tasks 1 to 8 in 3 to 5 bullets.

- [ ] **Step 4: Write the Obsidian note** covering what was built, why, the decisions (proxy instead of CORS; 1.6 g/kg protein; snapshot entries; no new dependencies) and the follow-ups listed in §Design "Out of scope".

- [ ] **Step 5: Commit, and ask before pushing.**

```bash
git add NOTICE.md README.md CHANGELOG.md
git commit -m "docs(nutrition): attribution, README feature, changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Final verification gate

- [ ] `cd frontend && npx vitest run`: all pass. Paste the summary line.
- [ ] `npm run build`: succeeds with no new warnings beyond the existing chunk-size notice.
- [ ] `VITE_DEMO=1 npm run build`: succeeds. In the demo build the search sheet shows the "needs a self-hosted server" message and New food still works.
- [ ] `docker compose up -d --build` followed by the 8-point manual check in Task 7, Step 5.
- [ ] An anonymous `GET /api/food/search` returns 401 (Task 4, Step 3).
- [ ] `git status` is clean, and `git ls-files data .env` prints nothing.
- [ ] Report the results honestly. Anything skipped (for example, no Android device for the barcode check) is listed as skipped, not as passed.

---

## Self-review (done while writing)

- **Spec coverage:** targets → T1; diary and state sync → T2; OFF data → T3; search → T4 and T6; amount and custom foods → T6; screen and tab → T7; barcode → T8; license attribution → T9; secrets and the new repo → T0. Out-of-scope items are listed explicitly.
- **Placeholders:** none. The only stub (`barcodeSheet` in T6) is explicitly replaced in T8.
- **Name consistency:**
  - `targets`, `bodyKg`, `entryTotals`, `dayTotals`, `addEntry`, `updateEntry`, `removeEntry`, `recentFoods`, `MEALS` and `PAL` are defined in T1 and T2 and used with the same names in T5 to T7.
  - `normalizeOFF` and `OFF_FIELDS` (T3) are used in T4.
  - `SEARCH_OK`, `searchFoods` and `lookupBarcode` (T4) are used in T6 and T8.
  - `MEAL_LABEL` (T5) is used in T6 and T7.
  - The Food fields `per100.{kcal,p,c,f}` are the same everywhere.
- **Expected test numbers** were computed with Node before writing them in.

---

## Agentic handoff

### Dependency graph

```
T0 (user-gated) ─► T1 ─► T2 ─┐
                   T3 ───────┼─► T4 ─► T5 ─► T6 ─► T7 ─► T8 ─► T9 ─► T10
```

- T1 and T3 are independent pure modules, so **they can run in parallel** with two subagents. Each touches only its own new files.
- Everything from T4 onward is **sequential**: T5 to T8 all edit `nutrition-sheets.jsx`, and parallel edits to it would conflict.
- T0 is **never delegated**. It needs the user's explicit OK for rotating the keys (Step 3) and for pushing to the public repo (Step 5).

### Per-task dispatch template (for superpowers:subagent-driven-development)

```
You are implementing Task <N> of /home/rupaldas/openGym/docs/superpowers/plans/2026-10-15-nutrition-tracking.md.
Read: the plan's header, "Global Constraints", "Design", and Task <N> in full. Do not read or do other tasks.
Repo: /home/rupaldas/openGym (React frontend in frontend/, Node API in api/server.js).
Rules: follow the steps in order; TDD steps must show the failing run before the passing run;
match surrounding code style (no semicolons in frontend, semicolons in api/server.js, 2-space indent);
no new dependencies; do not touch files not listed under the task's "Files:"; do not push.
If anything in the plan contradicts the code you find (a signature differs, a file moved), STOP and report
the exact mismatch instead of improvising.
Finish with: files changed, test command output (last 5 lines), commit hash, anything skipped and why.
```

### Review gate between tasks (controller)

After each task, before dispatching the next:
1. Run `git show --stat HEAD`. Only the files the task lists should have changed.
2. Run `cd frontend && npx vitest run && npm run build`. Both must be green.
3. Spec check: does the change meet the task's **Interfaces → Produces** exactly (names, argument order, return shape)?
4. For UI tasks (T5 to T8), run the manual checks the task lists, or mark them **skipped** if they can't be run.
5. If a check fails, send the same subagent the failure output and have it fix the problem. Don't move on.

### Context packet for a fresh session

- The project is openGym (AGPL-3.0, React, Node), being republished as `github.com/rupal2k/openfit` (public and empty as of 2026-10-15).
- OpenNutriTracker is Flutter/Dart, so it can't be merged as code. Only its formulas and OFF field conventions are ported.
- `search.openfoodfacts.org` sends no CORS headers, so searches go through `/api/food/search`. `world.openfoodfacts.org/api/v2/product/<code>` sends `ACAO: *`.
- The state sync is last-writer-wins on `S._ts`, with a whole-state `PUT /api/data` and a 5 MB body limit. At roughly 200 bytes per entry, that leaves years of headroom.
- User rules:
  - Ask before building features.
  - Preserve approved layouts.
  - Write an Obsidian note after significant work.
  - Get confirmation before any push or other outward-facing action.
