// Finishing a workout: the one place that decides what a session leaves behind — the stored
// record, the PRs it set, and the working weight each lift starts from next time. Kept out of
// the UI so these rules are tested (see docs/adr/0001-use-cases.md).
import { bestWeightFor, workoutVolume, modeOf, isBw, EFFORT } from './history.js'
import { is1RMRecord } from './onerm.js'

// What a set must hold before it can be checked off. A partial set (3 of 8 reps) is real
// training and passes; an empty field or an impossible number never does — once recorded it
// feeds PRs, volume and next session's prefill. Errors block the tick; warns ask first.
// Hard limits sit above every real load (a leg-press sled passes 500 kg), so only the
// impossible is refused; the unusual-but-possible gets a "typo?" instead.
const W_MAX = { kg: 1000, lb: 2200 }
const W_JUMP = { kg: 20, lb: 45 }
const num = v => typeof v === 'number' && isFinite(v)
const inRange = (v, lo, hi) => num(v) && v >= lo && v <= hi

export function validateSet(cfg, s, { unit = 'kg', best = 0 } = {}) {
  const errors = [], warns = []
  const wMax = W_MAX[unit] || W_MAX.kg
  const mode = modeOf(cfg)
  const load = (required) => {
    const w = s.w
    if (w == null && !required) return
    if (!num(w) || w < 0 || (required && w <= 0)) errors.push(['Enter the weight ({0})', unit])
    else if (w > wMax) errors.push(['{0} {1} is over the limit — check the weight', w, unit])
  }
  if (mode === 'cardio') {
    if (!(num(s.min) && s.min > 0 && s.min <= 600)) errors.push(['Enter a duration (up to 600 min)'])
    // Speed is optional: a rower, jump rope or a round of burpees has none to give.
    if (s.speed != null && !inRange(s.speed, 0, 60)) errors.push(['Speed must be 0–60 km/h'])
  } else if (mode === 'time') {
    if (!inRange(s.sec, 1, 3600)) errors.push(['Enter a hold between 1 s and 60 min'])
    load(false)
  } else {
    if (!(Number.isInteger(s.r) && s.r >= 1 && s.r <= 1000)) errors.push(['Enter reps (a whole number, at least 1)'])
    else if (s.r > 100) warns.push(['{0} reps in one set. Typo?', s.r])
    load(!isBw(cfg))
    if (!errors.length && best > 0 && s.w > best * 1.5 && s.w - best > (W_JUMP[unit] || W_JUMP.kg))
      warns.push(['{0} {1} is far above your best of {2} {1}. Typo?', s.w, unit, best])
  }
  for (const k of Object.keys(EFFORT)) {
    const e = EFFORT[k]
    if (s[k] != null && !inRange(s[k], e.min, e.max)) errors.push(['{0} must be {1}–{2}', e.hd, e.min, e.max])
  }
  return { errors, warns }
}

// Every checked-off set, re-checked — the last guard before a workout is filed. A set edited
// after its tick is only looked at here, not per keystroke (typing "10" passes through "1").
function checkDone(A, S) {
  const out = []
  A.entries.forEach((e, entryIdx) => {
    const cfg = { ...(e.target || {}), id: e.id }
    const ctx = { unit: S.unit, best: Math.max(bestWeightFor(S, e.id), (S.exWeights?.[e.id] || {}).w || 0) }
    e.sets.forEach((s, setIdx) => {
      if (s.done) out.push({ entryIdx, setIdx, ...validateSet(cfg, s, ctx) })
    })
  })
  return out
}
// Sets that must be fixed before Finish.
export const invalidDoneSets = (A, S) => checkDone(A, S).filter(x => x.errors.length)
// Valid but likely typos — asked about once more at Finish.
export const doubtfulDoneSets = (A, S) => checkDone(A, S).filter(x => !x.errors.length && x.warns.length)

const doneWeights = e => e.sets.filter(s => s.done).map(s => s.w || 0)

// Heaviest load an entry moved this session: its checked-off sets and the confirmed top weight.
export const topWeightOf = e => Math.max(0, ...doneWeights(e), e.topW || 0)

// Build the record for an active session against the history in S. Pure — S and A are untouched.
export function finishSession(S, A, end = Date.now()) {
  const prs = []
  const e1prs = []
  A.entries.forEach(e => {
    const mx = Math.max(0, ...doneWeights(e))
    if (mx > 0 && mx > bestWeightFor(S, e.id)) prs.push(e.id)
    // A heavier estimate without a heavier top set is its own kind of progress —
    // same weight for more reps. Reported separately so it can't be read as a load PR.
    const rec = is1RMRecord(S, e.id, e)
    if (rec && !prs.includes(e.id)) e1prs.push({ id: e.id, ...rec })
  })
  const w = {
    id: A.id, d: A.d, start: A.start, end, routineId: A.routineId, name: A.name, bw: A.bw,
    // `target` (what the session prescribed) is kept alongside the sets: without it a
    // finished workout cannot say whether it hit its reps, and a timed session reads back
    // as "0 reps". It is what the progression engine works from.
    entries: A.entries.map(e => ({ id: e.id, sets: e.sets, topW: e.topW || null, target: e.target || null })).filter(e => e.sets.some(s => s.done)),
    prs
  }
  w.vol = workoutVolume(w)
  return { w, prs, e1prs }
}

// Store reducer: file the workout, raise each lift's working weight, close the session.
// This is the only in-app writer of exWeights, so a discarded session never changes them.
export function recordSession(s, w) {
  w.entries.forEach(e => {
    const mx = topWeightOf(e)
    if (mx > 0) { const cur = s.exWeights[e.id]; if (!cur || mx > cur.w) s.exWeights[e.id] = { w: mx, d: w.d } }
  })
  s.workouts.push(w)
  s.active = null
}
