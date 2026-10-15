// Finishing a workout: the one place that decides what a session leaves behind — the stored
// record, the PRs it set, and the working weight each lift starts from next time. Kept out of
// the UI so these rules are tested (see docs/adr/0001-use-cases.md).
import { bestWeightFor, workoutVolume } from './history.js'
import { is1RMRecord } from './onerm.js'

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
