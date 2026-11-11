// kg <-> lb for every logged weight, when the person switches units and asks to convert.
// Without it a week of kg logs read as lb after the switch (Settings used to warn that numbers
// are not converted). Call inside store.update on the draft. Rounded to 0.1, like the inputs.
import { workoutVolume } from './history.js'

export const LB_PER_KG = 2.2046226218
const r1 = x => Math.round(x * 10) / 10

export function convertWeights(s, from, to) {
  if (from === to || !['kg', 'lb'].includes(from) || !['kg', 'lb'].includes(to)) return s
  const f = to === 'lb' ? LB_PER_KG : 1 / LB_PER_KG
  const c = x => (typeof x === 'number' && Number.isFinite(x) && x !== 0 ? r1(x * f) : x)
  const sets = list => (Array.isArray(list) ? list : []).forEach(st => { if (st && typeof st === 'object') st.w = c(st.w) })
  const target = t => { if (t && typeof t === 'object') { t.weight = c(t.weight); t.inc = c(t.inc) } }
  const entries = list => (Array.isArray(list) ? list : []).forEach(e => {
    if (!e || typeof e !== 'object') return
    sets(e.sets); e.topW = c(e.topW); target(e.target)
    if (e.plan && typeof e.plan === 'object') e.plan.weight = c(e.plan.weight)
  })
  ;(s.workouts || []).forEach(w => { w.bw = c(w.bw); entries(w.entries); w.vol = workoutVolume(w) })
  ;(s.bodyweight || []).forEach(b => { b.w = c(b.w) })
  Object.values(s.exWeights || {}).forEach(x => { if (x && typeof x === 'object') x.w = c(x.w) })
  ;(s.routines || []).forEach(r => (r.ex || []).forEach(e => { e.weight = c(e.weight); e.inc = c(e.inc) }))
  s.targetW = c(s.targetW)
  if (s.active && typeof s.active === 'object') { s.active.bw = c(s.active.bw); entries(s.active.entries) }
  s.unit = to
  return s
}

// Is there anything to convert? (an empty profile just switches the label)
export const hasWeights = s => (s.workouts || []).length > 0 || (s.bodyweight || []).length > 0 ||
  Object.keys(s.exWeights || {}).length > 0 || !!s.targetW ||
  (s.routines || []).some(r => (r.ex || []).some(e => e.weight > 0))
