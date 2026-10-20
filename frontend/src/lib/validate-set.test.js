import { describe, it, expect } from 'vitest'
import { validateSet, invalidDoneSets, doubtfulDoneSets } from './workout.js'

// Real catalogue ids, so modeOf / isBw / isCardio resolve the way they do in the app.
const BENCH = '0025'        // barbell bench press — barbell
const DEADLIFT = '0032'     // barbell deadlift — barbell
const PUSHUP = '0662'       // push-up — body weight
const PULLUP = '0652'       // pull-up — body weight
const ASSISTED = '0017'     // assisted pull-up — leverage machine (counterweight)
const PLANK = '3665'        // power point plank — body weight
const BIKE = '2138'         // stationary bike — cardio, not body weight
const BURPEE = '1160'       // burpee — cardio AND body weight in the catalogue

const KG = { unit: 'kg', best: 0 }
const LB = { unit: 'lb', best: 0 }
const run = (cfg, set, ctx = KG) => validateSet(cfg, set, ctx)
const ok = (cfg, set, ctx) => run(cfg, set, ctx).errors.length === 0
const errs = (cfg, set, ctx) => run(cfg, set, ctx).errors.length
const warns = (cfg, set, ctx) => run(cfg, set, ctx).warns.length
const msg = (cfg, set, ctx) => JSON.stringify(run(cfg, set, ctx).errors)

const bench = { id: BENCH, mode: 'reps', sets: 3, reps: 8, weight: 60 }
const pushup = { id: PUSHUP, mode: 'reps', sets: 3, reps: 15, weight: 0, bodyweight: true }
const plank = { id: PLANK, mode: 'time', sets: 3, sec: 45, weight: 0, bodyweight: true }
const bike = { id: BIKE, mode: 'cardio', sets: 1, min: 20, speed: 8 }

describe('validateSet — return shape', () => {
  it('returns errors and warns arrays of i18n arg arrays', () => {
    const r = run(bench, { w: 60, r: 8 })
    expect(Array.isArray(r.errors)).toBe(true)
    expect(Array.isArray(r.warns)).toBe(true)
    const bad = run(bench, { w: 60, r: 0 })
    expect(bad.errors.length).toBeGreaterThan(0)
    bad.errors.forEach(a => { expect(Array.isArray(a)).toBe(true); expect(typeof a[0]).toBe('string') })
  })

  it('works without a ctx (defaults to kg, no history)', () => {
    expect(validateSet(bench, { w: 60, r: 8 }).errors).toEqual([])
  })

  it('does not mutate the set it checks', () => {
    const s = { w: 60, r: 0, done: false }
    run(bench, s)
    expect(s).toEqual({ w: 60, r: 0, done: false })
  })
})

describe('validateSet — reps on a loaded lift', () => {
  it('accepts a full set', () => expect(ok(bench, { w: 60, r: 8 })).toBe(true))

  it('accepts a partial set — 3 of a planned 8 is real training, no warning', () => {
    expect(ok(bench, { w: 60, r: 3 })).toBe(true)
    expect(warns(bench, { w: 60, r: 3 })).toBe(0)
  })

  it('accepts more reps than planned', () => expect(ok(bench, { w: 60, r: 12 })).toBe(true))
  it('accepts a single', () => expect(ok(bench, { w: 60, r: 1 })).toBe(true))
  it('accepts 100 reps (top of the range)', () => expect(ok(bench, { w: 20, r: 100 })).toBe(true))

  it.each([
    ['0', 0], ['negative', -5], ['null', null], ['undefined', undefined], ['NaN', NaN],
    ['Infinity', Infinity], ['a numeric string', '8'], ['an empty string', ''],
    ['half a rep', 0.5], ['a fractional count', 8.5], ['1001', 1001]
  ])('blocks %s reps', (_, r) => {
    expect(errs(bench, { w: 60, r })).toBeGreaterThan(0)
  })

  it('allows 101–1000 reps but asks (high-rep calves, abs)', () => {
    const r = run(bench, { w: 20, r: 150 })
    expect(r.errors.length).toBe(0)
    expect(r.warns.length).toBe(1)
    expect(warns(bench, { w: 20, r: 100 })).toBe(0)
  })

  it('blocks a set with no reps key at all', () => expect(errs(bench, { w: 60 })).toBeGreaterThan(0))

  it('names reps in the message when reps are the problem', () => {
    expect(msg(bench, { w: 60, r: 0 }).toLowerCase()).toContain('rep')
  })
})

describe('validateSet — load on a loaded lift', () => {
  it('blocks 0 kg on a barbell', () => expect(errs(bench, { w: 0, r: 8 })).toBeGreaterThan(0))

  it.each([
    ['undefined', undefined], ['null', null], ['NaN', NaN], ['negative', -20],
    ['a numeric string', '60'], ['Infinity', Infinity]
  ])('blocks a %s weight', (_, w) => {
    expect(errs(bench, { w, r: 8 })).toBeGreaterThan(0)
  })

  it('blocks a set with no weight key at all', () => expect(errs(bench, { r: 8 })).toBeGreaterThan(0))

  it('names the weight in the message when weight is the problem', () => {
    expect(msg(bench, { w: 0, r: 8 }).toLowerCase()).toContain('weight')
  })

  it('accepts fractional plates (2.5, 1.25, 0.5 kg)', () => {
    expect(ok(bench, { w: 2.5, r: 8 })).toBe(true)
    expect(ok(bench, { w: 61.25, r: 8 })).toBe(true)
    expect(ok(bench, { w: 0.5, r: 8 })).toBe(true)
  })

  it('reports both problems when weight and reps are both empty', () => {
    expect(errs(bench, { w: 0, r: 0 })).toBeGreaterThanOrEqual(2)
  })

  it('accepts a 600 kg leg-press sled and blocks over 1000 kg', () => {
    const dl = { id: DEADLIFT, mode: 'reps' }
    expect(ok(dl, { w: 600, r: 8 })).toBe(true)
    expect(ok(dl, { w: 1000, r: 1 })).toBe(true)
    expect(errs(dl, { w: 1000.5, r: 1 })).toBeGreaterThan(0)
  })

  it('caps in the profile unit: 1500 lb is fine, 1500 kg is a typo', () => {
    const dl = { id: DEADLIFT, mode: 'reps' }
    expect(ok(dl, { w: 1500, r: 1 }, LB)).toBe(true)
    expect(errs(dl, { w: 1500, r: 1 }, KG)).toBeGreaterThan(0)
  })

  it('accepts 2200 lb and blocks 2201 lb', () => {
    const dl = { id: DEADLIFT, mode: 'reps' }
    expect(ok(dl, { w: 2200, r: 1 }, LB)).toBe(true)
    expect(errs(dl, { w: 2201, r: 1 }, LB)).toBeGreaterThan(0)
  })

  it('blocks a 9999 kg typo outright', () => expect(errs(bench, { w: 9999, r: 5 })).toBeGreaterThan(0))

  it('treats an assisted machine (leverage machine) as loaded: the counterweight is required', () => {
    const asst = { id: ASSISTED, mode: 'reps' }
    expect(ok(asst, { w: 30, r: 8 })).toBe(true)
    expect(errs(asst, { w: 0, r: 8 })).toBeGreaterThan(0)
  })
})

describe('validateSet — bodyweight', () => {
  it('accepts push-ups with no weight key', () => expect(ok(pushup, { r: 15 })).toBe(true))
  it('accepts push-ups with w = 0', () => expect(ok(pushup, { w: 0, r: 15 })).toBe(true))
  it('accepts a partial set of push-ups', () => expect(ok(pushup, { w: 0, r: 4 })).toBe(true))

  it('still blocks 0 reps on a bodyweight lift', () => {
    expect(errs(pushup, { w: 0, r: 0 })).toBeGreaterThan(0)
    expect(errs(pushup, {})).toBeGreaterThan(0)
  })

  it('blocks negative added weight', () => expect(errs(pushup, { w: -10, r: 10 })).toBeGreaterThan(0))
  it('blocks NaN added weight', () => expect(errs(pushup, { w: NaN, r: 10 })).toBeGreaterThan(0))

  it('accepts a weighted pull-up (+20 kg belt)', () => {
    expect(ok({ id: PULLUP, mode: 'reps' }, { w: 20, r: 5 })).toBe(true)
  })

  it('caps added weight like any other load', () => {
    expect(errs({ id: PULLUP, mode: 'reps' }, { w: 1001, r: 5 })).toBeGreaterThan(0)
  })

  it('falls back to the catalogue when the config has no bodyweight flag', () => {
    expect(ok({ id: PUSHUP }, { r: 15 })).toBe(true)
    expect(errs({ id: BENCH }, { r: 15 })).toBeGreaterThan(0)
  })

  it('lets the config flag override the catalogue both ways', () => {
    // a dip done with a belt turned the flag off: now the weight is required
    expect(errs({ id: PUSHUP, bodyweight: false }, { w: 0, r: 10 })).toBeGreaterThan(0)
    // a custom "bodyweight" flag on a barbell id: no weight needed
    expect(ok({ id: BENCH, bodyweight: true }, { w: 0, r: 10 })).toBe(true)
  })
})

describe('validateSet — per side', () => {
  const lunge = { id: BENCH, mode: 'reps', side: true, reps: 16 }
  it('accepts an odd total (sides were uneven)', () => expect(ok(lunge, { w: 20, r: 15 })).toBe(true))
  it('accepts a single rep total', () => expect(ok(lunge, { w: 20, r: 1 })).toBe(true))
  it('does not warn on an odd total', () => expect(warns(lunge, { w: 20, r: 15 })).toBe(0))
})

describe('validateSet — typo warning against previous best', () => {
  const ctx = (best, unit = 'kg') => ({ unit, best })

  it('blocks 1001 kg vs a best of 100 (over the kg cap — error, not just a warn)', () => {
    expect(errs(bench, { w: 1001, r: 5 }, ctx(100))).toBeGreaterThan(0)
  })

  it('warns (not blocks) on 1000 kg vs a best of 100 — the 1000-for-100 slip', () => {
    const r = run(bench, { w: 1000, r: 5 }, ctx(100))
    expect(r.errors.length).toBe(0)
    expect(r.warns.length).toBe(1)
  })

  it('warns on 1000 lb vs a best of 220 lb (under the lb cap)', () => {
    const r = run(bench, { w: 1000, r: 5 }, ctx(220, 'lb'))
    expect(r.errors.length).toBe(0)
    expect(r.warns.length).toBeGreaterThan(0)
  })

  it('warns on 400 kg vs a best of 100 — but the set is still valid', () => {
    const r = run(bench, { w: 400, r: 5 }, ctx(100))
    expect(r.errors.length).toBe(0)
    expect(r.warns.length).toBeGreaterThan(0)
  })

  it('does not warn on 140 vs 100 (under 1.5x)', () => expect(warns(bench, { w: 140, r: 5 }, ctx(100))).toBe(0))
  it('does not warn at exactly 1.5x (150 vs 100)', () => expect(warns(bench, { w: 150, r: 5 }, ctx(100))).toBe(0))
  it('warns just past 1.5x when the jump is over 20 kg (151 vs 100)', () => expect(warns(bench, { w: 151, r: 5 }, ctx(100))).toBe(1))

  it('does not warn on a big ratio with a small absolute jump (16 vs 10 kg dumbbells)', () => {
    expect(warns(bench, { w: 16, r: 10 }, ctx(10))).toBe(0)
    expect(warns(bench, { w: 30, r: 10 }, ctx(10))).toBe(0)   // +20 is not > 20
  })

  it('warns when both ratio and jump are exceeded on a light lift (31 vs 10 kg)', () => {
    expect(warns(bench, { w: 31, r: 10 }, ctx(10))).toBe(1)
  })

  it('uses the lb jump threshold (45 lb) in lb', () => {
    expect(warns(bench, { w: 140, r: 5 }, ctx(90, 'lb'))).toBe(1)   // >135, +50
    expect(warns(bench, { w: 160, r: 5 }, ctx(120, 'lb'))).toBe(0)  // <180
    expect(warns(bench, { w: 75, r: 5 }, ctx(40, 'lb'))).toBe(0)    // >60 but only +35
  })

  it('never warns on a first-ever session (best = 0)', () => {
    expect(warns(bench, { w: 200, r: 5 }, ctx(0))).toBe(0)
    expect(warns({ id: DEADLIFT, mode: 'reps' }, { w: 400, r: 1 }, ctx(0))).toBe(0)
  })

  it('never warns on a lighter-than-usual set (deload, back-off)', () => {
    expect(warns(bench, { w: 40, r: 10 }, ctx(100))).toBe(0)
  })

  it('warns on added bodyweight load the same way (+40 vs best +10)', () => {
    expect(warns({ id: PULLUP, mode: 'reps' }, { w: 40, r: 5 }, ctx(10))).toBe(1)
  })

  it('does not warn on reps-only bodyweight sets', () => {
    expect(warns(pushup, { r: 50 }, ctx(10))).toBe(0)
  })
})

describe('validateSet — timed holds', () => {
  it('accepts a 45 s plank with no weight and no reps', () => expect(ok(plank, { sec: 45 })).toBe(true))
  it('accepts 1 s and 3600 s', () => {
    expect(ok(plank, { sec: 1, w: 0 })).toBe(true)
    expect(ok(plank, { sec: 3600, w: 0 })).toBe(true)
  })

  it.each([
    ['0 s', 0], ['3601 s', 3601], ['negative', -30], ['null', null], ['undefined', undefined],
    ['NaN', NaN], ['Infinity', Infinity], ['a numeric string', '45']
  ])('blocks a %s hold', (_, sec) => {
    expect(errs(plank, { sec, w: 0 })).toBeGreaterThan(0)
  })

  it('does not require reps on a timed set', () => expect(ok(plank, { sec: 45, w: 0, r: 0 })).toBe(true))

  it('treats weight as optional even on a barbell id in time mode (isometric hold)', () => {
    const hold = { id: DEADLIFT, mode: 'time', sec: 30 }
    expect(ok(hold, { sec: 30, w: 0 })).toBe(true)
    expect(ok(hold, { sec: 30 })).toBe(true)
    expect(ok(hold, { sec: 30, w: 140 })).toBe(true)
  })

  it('blocks negative, NaN or over-cap weight on a timed set', () => {
    expect(errs(plank, { sec: 45, w: -5 })).toBeGreaterThan(0)
    expect(errs(plank, { sec: 45, w: NaN })).toBeGreaterThan(0)
    expect(errs(plank, { sec: 45, w: 1001 })).toBeGreaterThan(0)
    expect(ok(plank, { sec: 45, w: 1001 }, LB)).toBe(true)
  })

  it('accepts a partial hold (38 s of a planned 45)', () => expect(ok(plank, { sec: 38, w: 0 })).toBe(true))
})

describe('validateSet — cardio', () => {
  it('accepts 20 min at 8 km/h', () => expect(ok(bike, { min: 20, speed: 8 })).toBe(true))
  it('accepts the edges: 600 min, 60 km/h, 0.5 km/h', () => {
    expect(ok(bike, { min: 600, speed: 60 })).toBe(true)
    expect(ok(bike, { min: 1, speed: 0.5 })).toBe(true)
  })

  it('does not require weight or reps', () => expect(ok(bike, { min: 20, speed: 8, w: 0, r: 0 })).toBe(true))

  it.each([
    ['0', 0], ['601', 601], ['negative', -5], ['null', null], ['undefined', undefined], ['NaN', NaN], ['a string', '20']
  ])('blocks a %s duration', (_, min) => {
    expect(errs(bike, { min, speed: 8 })).toBeGreaterThan(0)
  })

  it.each([
    ['61', 61], ['negative', -3], ['NaN', NaN], ['Infinity', Infinity], ['a string', '8']
  ])('blocks a %s speed', (_, speed) => {
    expect(errs(bike, { min: 20, speed })).toBeGreaterThan(0)
  })

  // Speed is optional: rowers, jump rope, burpees have none.
  it.each([['0', 0], ['null', null], ['undefined', undefined]])('accepts a %s speed', (_, speed) => {
    expect(ok(bike, { min: 20, speed })).toBe(true)
  })

  it('reports both when duration is empty and speed is bad', () => {
    expect(errs(bike, { min: 0, speed: -1 })).toBeGreaterThanOrEqual(2)
  })

  it('reads a legacy config (no mode) on a catalogue cardio id as cardio', () => {
    expect(ok({ id: BIKE }, { min: 20, speed: 8 })).toBe(true)
    // a reps-shaped set on a cardio id is missing duration and speed
    expect(errs({ id: BIKE }, { w: 0, r: 0 })).toBeGreaterThan(0)
  })

  it('treats a cardio id that is also body weight (burpee) as cardio, not bodyweight reps', () => {
    expect(ok({ id: BURPEE }, { min: 10, speed: 5 })).toBe(true)
    expect(errs({ id: BURPEE }, { r: 20 })).toBeGreaterThan(0)
  })

  it('lets an explicit mode win over the catalogue (bike logged as a timed set)', () => {
    expect(ok({ id: BIKE, mode: 'time' }, { sec: 600 })).toBe(true)
  })

  it('never warns on cardio, whatever the best', () => {
    expect(warns(bike, { min: 300, speed: 30 }, { unit: 'kg', best: 10 })).toBe(0)
  })
})

describe('validateSet — legacy configs', () => {
  it('reads a config without mode on a barbell id as reps and requires the weight', () => {
    const legacy = { id: BENCH, sets: 3, reps: 5, weight: 60 }
    expect(ok(legacy, { w: 60, r: 5 })).toBe(true)
    expect(errs(legacy, { w: 0, r: 5 })).toBeGreaterThan(0)
  })

  it('treats an unknown id (deleted custom exercise) as a loaded reps lift', () => {
    expect(ok({ id: 'gone-123' }, { w: 40, r: 10 })).toBe(true)
    expect(errs({ id: 'gone-123' }, { w: 0, r: 10 })).toBeGreaterThan(0)
  })

  it('ignores a bogus mode string and falls back to the catalogue', () => {
    expect(ok({ id: PUSHUP, mode: 'reeps' }, { r: 10 })).toBe(true)
  })
})

describe('validateSet — effort (RIR / RPE)', () => {
  it('is optional: no effort key, or a null one, is fine', () => {
    expect(ok(bench, { w: 60, r: 8 })).toBe(true)
    expect(ok(bench, { w: 60, r: 8, rir: null })).toBe(true)
  })

  it('accepts RIR 0 (to failure), 2.5 and 10', () => {
    expect(ok(bench, { w: 60, r: 8, rir: 0 })).toBe(true)
    expect(ok(bench, { w: 60, r: 8, rir: 2.5 })).toBe(true)
    expect(ok(bench, { w: 60, r: 8, rir: 10 })).toBe(true)
  })

  it.each([['-1', -1], ['10.5', 10.5], ['NaN', NaN], ['a string', '2']])('blocks RIR %s', (_, rir) => {
    expect(errs(bench, { w: 60, r: 8, rir })).toBeGreaterThan(0)
  })

  it('accepts RPE 6, 8.5 and 10', () => {
    expect(ok(bench, { w: 60, r: 8, rpe: 6 })).toBe(true)
    expect(ok(bench, { w: 60, r: 8, rpe: 8.5 })).toBe(true)
    expect(ok(bench, { w: 60, r: 8, rpe: 10 })).toBe(true)
  })

  it.each([['5.5', 5.5], ['0', 0], ['11', 11], ['Infinity', Infinity]])('blocks RPE %s', (_, rpe) => {
    expect(errs(bench, { w: 60, r: 8, rpe })).toBeGreaterThan(0)
  })

  it('checks effort on bodyweight sets too', () => {
    expect(ok(pushup, { r: 10, rir: 1 })).toBe(true)
    expect(errs(pushup, { r: 10, rpe: 3 })).toBeGreaterThan(0)
  })
})

describe('invalidDoneSets', () => {
  const S = (extra = {}) => ({ unit: 'kg', workouts: [], exWeights: {}, ...extra })
  const A = entries => ({ id: 'a1', d: '2026-10-21', start: 0, entries })
  const entry = (id, sets, target) => ({ id, sets, ...(target ? { target } : {}) })

  it('returns [] for a session with no entries', () => {
    expect(invalidDoneSets(A([]), S())).toEqual([])
  })

  it('returns [] when every done set is valid — partial sets included', () => {
    const a = A([entry(BENCH, [{ w: 60, r: 8, done: true }, { w: 60, r: 3, done: true }], bench)])
    expect(invalidDoneSets(a, S())).toEqual([])
  })

  it('ignores sets that are not ticked, however empty', () => {
    const a = A([entry(BENCH, [{ w: 0, r: 0, done: false }, { done: false }], bench)])
    expect(invalidDoneSets(a, S())).toEqual([])
  })

  it('flags a set edited to 0 reps after it was ticked, with its position', () => {
    const a = A([
      entry(PUSHUP, [{ r: 10, done: true }], pushup),
      entry(BENCH, [{ w: 60, r: 8, done: true }, { w: 60, r: 0, done: true }, { w: 0, r: 0, done: false }], bench)
    ])
    const bad = invalidDoneSets(a, S())
    expect(bad).toHaveLength(1)
    expect(bad[0]).toMatchObject({ entryIdx: 1, setIdx: 1 })
    expect(bad[0].errors.length).toBeGreaterThan(0)
  })

  it('flags every bad done set across entries', () => {
    const a = A([
      entry(BENCH, [{ w: 0, r: 8, done: true }], bench),
      entry(PLANK, [{ sec: 0, done: true }], plank),
      entry(BIKE, [{ min: 0, speed: 8, done: true }], bike)
    ])
    expect(invalidDoneSets(a, S()).map(b => [b.entryIdx, b.setIdx])).toEqual([[0, 0], [1, 0], [2, 0]])
  })

  it('reads each entry by its target mode (a timed set has no reps and is fine)', () => {
    const a = A([entry(PLANK, [{ sec: 30, w: 0, done: true }], plank)])
    expect(invalidDoneSets(a, S())).toEqual([])
  })

  it('falls back to the catalogue for an entry with no target', () => {
    const a = A([entry(PUSHUP, [{ r: 10, done: true }]), entry(BENCH, [{ r: 5, done: true }])])
    const bad = invalidDoneSets(a, S())
    expect(bad.map(b => b.entryIdx)).toEqual([1])
  })

  it('uses the profile unit for the cap', () => {
    const a = A([entry(DEADLIFT, [{ w: 1500, r: 1, done: true }], { mode: 'reps' })])
    expect(invalidDoneSets(a, S({ unit: 'lb' }))).toEqual([])
    expect(invalidDoneSets(a, S({ unit: 'kg' }))).toHaveLength(1)
  })

  it('does not block Finish on a warn-only set (likely typo the user already confirmed)', () => {
    const hist = [{ id: 'w1', d: '2026-10-01', entries: [{ id: BENCH, sets: [{ w: 100, r: 5, done: true }] }] }]
    const a = A([entry(BENCH, [{ w: 400, r: 5, done: true }], bench)])
    expect(invalidDoneSets(a, S({ workouts: hist }))).toEqual([])
  })

  it('lists that warn-only set in doubtfulDoneSets, so Finish asks once more', () => {
    const hist = [{ id: 'w1', d: '2026-10-01', entries: [{ id: BENCH, sets: [{ w: 100, r: 5, done: true }] }] }]
    const a = A([entry(BENCH, [{ w: 100, r: 5, done: true }, { w: 400, r: 5, done: true }, { w: 0, r: 5, done: true }], bench)])
    expect(doubtfulDoneSets(a, S({ workouts: hist })).map(b => b.setIdx)).toEqual([1])
  })

  it('does not mutate the session', () => {
    const a = A([entry(BENCH, [{ w: 0, r: 0, done: true }], bench)])
    const before = JSON.stringify(a)
    invalidDoneSets(a, S())
    expect(JSON.stringify(a)).toBe(before)
  })
})
