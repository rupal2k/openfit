import { MARKERS } from './catalog.js'
import { toCanonical, sameUnit } from './units.js'
import { uid } from '../format.js'

// S.labs.reports[]: { id, d: 'YYYY-MM-DD', lab, src ('PDF' | 'Scan' | 'Photo'), t (saved at), birthYear?,
//   markers: [{ key, v, lo, hi, rv, ru, raw, cmp? }] }
// v, lo and hi are canonical (SI); rv/ru/raw are what the report printed, kept for the record.

// A report from an old backup, a hand edit or a bad synced copy must not break the screen that
// would let the person delete it: keep only well-formed reports and markers.
export function cleanReports(list) {
  const okMarker = m => m && MARKERS[m.key] && Number.isFinite(m.v)
  return (Array.isArray(list) ? list : [])
    .filter(r => r && typeof r.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.d) && Array.isArray(r.markers))
    .map(({ dob, ...r }) => ({
      ...r,
      ...(dob && !r.birthYear && +String(dob).slice(0, 4) ? { birthYear: +String(dob).slice(0, 4) } : {}),
      src: ['PDF', 'Scan', 'Photo'].includes(r.src) ? r.src : /\.pdf$/i.test(r.src || '') ? 'PDF' : r.src ? 'Photo' : '',
      markers: r.markers.filter(okMarker),
    }))
}

// Rows from parseLabText, each with whether it can be saved as-is.
// Rows repaired or given a guessed unit start unticked: the person has to look at them first.
export function reviewRows(rows) {
  const seen = new Set()
  return rows.map(r => {
    const ok = r.key ? toCanonical(r.key, r.value, r.unit, r.basis).ok : false
    const dup = ok && seen.has(r.key)      // only a row that could be saved knocks out a later one
    if (ok) seen.add(r.key)
    return { ...r, include: ok && !dup && !r.fixed && !r.unitGuessed && !r.unsure, unitOk: ok, dup: !!dup }
  })
}

// The reviewed rows → a report. Only included rows whose unit is known are stored.
export function buildReport(rows, { date, lab = '', src = '', dob = null } = {}) {
  const markers = []
  const seen = new Set()
  for (const r of rows) {
    if (!r.include || !r.key || seen.has(r.key)) continue
    const c = toCanonical(r.key, r.value, r.unit, r.basis)
    if (!c.ok) continue
    seen.add(r.key)
    const conv = x => (x == null ? null : toCanonical(r.key, x, r.unit, r.basis).v)
    markers.push({ key: r.key, v: c.v, lo: conv(r.lo), hi: conv(r.hi), rv: r.value, ru: r.unit, raw: r.name, ...(r.cmp ? { cmp: r.cmp } : {}) })
  }
  // only the birth year from a printed date of birth: enough for an age, and the server copy holds less
  const birthYear = dob ? +String(dob).slice(0, 4) || null : null
  return { id: uid(), d: date, lab, src, t: Date.now(), ...(birthYear ? { birthYear } : {}), markers }
}

export const reportValues = rep => Object.fromEntries(rep.markers.map(m => [m.key, m.v]))

// Each marker's latest value from reports within `days` of the newest one: scores then survive a
// later report that only re-tests a few markers, without mixing in results from years ago.
export function recentValues(reports, days = 120) {
  const sorted = byDate(reports)
  if (!sorted.length) return {}
  const newest = Date.parse(sorted[sorted.length - 1].d + 'T12:00:00')
  const out = {}
  for (const r of sorted) {
    if (newest - Date.parse(r.d + 'T12:00:00') > days * 864e5) continue
    for (const m of r.markers) out[m.key] = m.v
  }
  return out
}

// 'high' | 'low' | 'in' against the range printed on that report; null when it printed none.
export function status(m) {
  if (m.cmp === '<' && m.hi != null && m.v <= m.hi) return 'in'
  if (m.hi != null && m.v > m.hi) return 'high'
  if (m.lo != null && m.v < m.lo) return 'low'
  return m.lo != null || m.hi != null ? 'in' : null
}

export const byDate = reports => [...reports].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.t - b.t))

// One marker over time, oldest first.
export function markerSeries(reports, key) {
  return byDate(reports).flatMap(r => {
    const m = r.markers.find(x => x.key === key)
    return m ? [{ d: r.d, t: Date.parse(r.d + 'T12:00:00'), m, report: r }] : []
  })
}

// Latest reading of every marker, in catalogue order.
export function latestByMarker(reports) {
  const last = new Map()
  for (const r of byDate(reports)) for (const m of r.markers) last.set(m.key, { m, report: r })
  return Object.keys(MARKERS).filter(k => last.has(k)).map(k => ({ key: k, ...last.get(k) }))
}

// Age on the report date: from the profile's birth year, else the date of birth the report printed.
// The scores here are adult formulas: an age under 18 or over 120 (a typo, a child's report) gives none.
export function ageAt(S, report) {
  const a = rawAge(S, report)
  return a != null && a >= 18 && a <= 120 ? a : null
}

function rawAge(S, report) {
  const by = S.nutrition?.profile?.birthYear
  const y = +String(report.d).slice(0, 4)
  if (by && y) return y - by
  if (report.birthYear && y) return y - report.birthYear
  if (report.dob) {   // reports saved before birthYear replaced the full date
    const [a, b] = [new Date(report.dob + 'T00:00:00'), new Date(report.d + 'T00:00:00')]
    let age = b.getFullYear() - a.getFullYear()
    if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) age--
    return age
  }
  return null
}

export const sexOf = S => {
  const s = S.nutrition?.profile?.sex || S.body
  return s === 'female' || s === 'male' ? s : null
}

// 'us' when a report mostly prints the US unit of markers whose US and SI units differ.
export function guessUnits(rows) {
  let us = 0, si = 0
  for (const r of rows) {
    const d = r.key && MARKERS[r.key]
    const usAlt = d && d.alt.find(a => a.us)
    if (!usAlt || sameUnit(usAlt.unit, d.unit)) continue
    if (sameUnit(r.unit, usAlt.unit)) us++
    else if (sameUnit(r.unit, d.unit)) si++
  }
  return us > si ? 'us' : 'si'
}
