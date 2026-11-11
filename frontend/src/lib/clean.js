// Routines from outside the app — a shared plan file, a backup, state written by an older or
// hand-edited build — are cleaned here before they are stored. An offline app has no server
// to repair data, so one bad value that crashes a screen on render would crash it on every
// open (a routine name that is an object took the Plan screen down for good).
import { EXIDX } from './exercises.js'
import { cleanConfig, cleanRest } from './workout.js'
import { cleanFormat, cleanCap } from './history.js'
import { POLICIES } from './progression.js'
import { uid } from './format.js'

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k)
// a built-in id ("0662") or one of the given custom ids — never "constructor" or "__proto__"
export const isKnownEx = (id, customIds = new Set()) => typeof id === 'string' && (has(EXIDX, id) || customIds.has(id))
export const cleanProg = p => (POLICIES.includes(p) ? p : '')
const MODES = ['reps', 'time', 'cardio']

// One planned exercise. strict: only the keys a plan entry can have (files from elsewhere);
// otherwise every key is kept and only the ones a screen reads are made safe (stored state).
export function cleanEntry(e, unit, strict) {
  if (!e || typeof e !== 'object' || typeof e.id !== 'string') return null
  let o = { ...e }
  if (strict) {
    o = { id: e.id }
    for (const k of ['sets', 'reps', 'repsMin', 'repsMax', 'sec', 'min', 'speed', 'weight']) if (has(e, k)) o[k] = e[k]
    if (e.side === true) o.side = true
    if (typeof e.bodyweight === 'boolean') o.bodyweight = e.bodyweight
    if (Number.isFinite(+e.inc) && +e.inc > 0) o.inc = Math.min(100, +e.inc)
  }
  if (has(o, 'mode') || has(e, 'mode')) { if (MODES.includes(e.mode)) o.mode = e.mode; else delete o.mode }
  if (has(o, 'prog') || has(e, 'prog')) { if (cleanProg(e.prog)) o.prog = e.prog; else delete o.prog }
  if (typeof e.sg === 'string' && e.sg) o.sg = e.sg.slice(0, 40); else delete o.sg
  return cleanConfig(o, unit)
}

// One routine. mapId: turns a file's exercise id into ours (custom exercises get new ids).
export function cleanRoutine(r, { unit = 'kg', strict = false, mapId = id => id, keepId = true } = {}) {
  if (!r || typeof r !== 'object') return null
  const out = strict ? {} : { ...r }
  out.id = keepId && typeof r.id === 'string' && r.id ? r.id : uid()
  out.name = str(r.name, 80).trim() || (strict ? '' : 'Routine')
  if (str(r.emoji, 32)) out.emoji = r.emoji.slice(0, 32); else delete out.emoji
  if (cleanProg(r.prog)) out.prog = r.prog; else delete out.prog
  const rest = cleanRest(r.rest), format = cleanFormat(r.format), cap = format === 'amrap' ? cleanCap(r.cap) : 0
  if (rest) out.rest = rest; else delete out.rest
  if (format) out.format = format; else delete out.format
  if (cap) out.cap = cap; else delete out.cap
  out.ex = (Array.isArray(r.ex) ? r.ex : [])
    .map(e => cleanEntry(e && typeof e === 'object' ? { ...e, id: mapId(e.id) } : e, unit, strict))
    .filter(Boolean)
  return out
}

// A weekly schedule: weekday 0–6 → a routine id that exists.
export function cleanWeek(week, idOk = () => true) {
  const out = {}
  if (!week || typeof week !== 'object') return out
  for (const d of ['0', '1', '2', '3', '4', '5', '6']) if (typeof week[d] === 'string' && idOk(week[d])) out[d] = week[d]
  return out
}
