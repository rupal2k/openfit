import { MARKERS, findMarker } from './catalog.js'
import { repairRow } from './repair.js'

// Reads lab-report text into rows, with no AI model: a row is a marker name, a number, a unit and
// a reference range. Lines come from pdf.js (lib/labs/pdf.js), one per printed row, with a tab
// between table cells. Nothing here guesses silently: a row it can't place is returned unmatched
// so the review screen shows it.

const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`
// Labs never print "08" or "008": that is OCR losing the point in 0.8 / 0.08
const num = s => { const t = String(s).replace(',', '.'); return /^0\d+$/.test(t) ? parseFloat('0.' + t.slice(1)) : parseFloat(t) }
const FLAG = /^(h|l|hi|lo|high|low|a|abn|abnormal|\*|crit|critical|hh|ll)$/i
const RANGE = new RegExp(String.raw`(${NUM})\s*(?:-|–|—|to)\s*(${NUM})`)
const UPPER = new RegExp(String.raw`^(?:<|≤|<=|up to|upto|below)\s*(${NUM})`, 'i')
const LOWER = new RegExp(String.raw`^(?:>|≥|>=|above|over)\s*(${NUM})`, 'i')
const VALUE = new RegExp(String.raw`^([<>≤≥])?\s*(${NUM})(?:\s*(h|l|hh|ll|\*))?$`, 'i')
// a cell that is a unit: letters, µ, %, /, ^, digits after a letter or caret (10^9/L, mL/min/1.73m2)
const UNIT = /^(%|[a-zµμ]*\/?\s?[a-zµμ0-9^*.×\s/²-]*[a-zµμ%²0-9]|(?:x\s*)?10\s*[\^e*]\s*\d+\s*\/\s*[a-zµμ]+|[a-zµμ]+)$/i

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = n => String(n).padStart(2, '0')
const iso = (y, mo, d) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 1900 ? `${y}-${pad(mo)}-${pad(d)}` : null)

// First date in a string. mdy: read 03/04/2026 as March 4 (US); otherwise day first.
export function findDate(s, mdy = false) {
  let x = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (x) return iso(+x[1], +x[2], +x[3])
  x = s.match(/(\d{1,2})[-/. ]([a-z]{3})[a-z]*[-/. ,]+(\d{4})/i)
  if (x && MONTHS[x[2].toLowerCase()]) return iso(+x[3], MONTHS[x[2].toLowerCase()], +x[1])
  x = s.match(/([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/i)
  if (x && MONTHS[x[1].toLowerCase()]) return iso(+x[3], MONTHS[x[1].toLowerCase()], +x[2])
  x = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (x) {
    let [a, b, y] = [+x[1], +x[2], +x[3]]
    if (y < 100) y += 2000
    // the number over 12 can only be the day; otherwise follow the locale
    const monthFirst = a > 12 ? false : b > 12 ? true : mdy
    return monthFirst ? iso(y, a, b) : iso(y, b, a)
  }
  return null
}

const COLLECTED = /\b(collected|collection|collection date|date collected|sample date|sample collected|specimen collected|drawn|date of collection|sample drawn)\b/i
const BIRTH = /\b(date of birth|dob|birth date|d\.o\.b)\b/i

// The collection date, and the date of birth when the report prints one (for age-based scores).
function reportDates(lines, mdy) {
  let date = null, dob = null
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i], next = lines[i + 1] || ''
    if (!dob && BIRTH.test(L)) {
      // a header row ("PATIENT | DATE OF BIRTH | ...") puts the value in the same column one line down
      const cells = L.split('\t'), col = cells.findIndex(c => BIRTH.test(c))
      dob = findDate(L.replace(/.*?(date of birth|dob|birth date)[:\s]*/i, ''), mdy)
        || (col >= 0 ? findDate(next.split('\t')[col] || '', mdy) : null)
    }
    if (!date && COLLECTED.test(L)) {
      const cells = L.split('\t'), col = cells.findIndex(c => COLLECTED.test(c))
      date = findDate(L.replace(/.*?(collected|collection date|date collected|sample date|collection)[:\s]*/i, ''), mdy)
        || (col >= 0 ? findDate(next.split('\t')[col] || '', mdy) : null)
    }
  }
  return { date, dob }
}

// Split one printed row into cells: pdf.js gives tabs between table cells; plain text falls back
// to runs of 2+ spaces, then to single spaces around the first number.
function cellsOf(line) {
  if (line.includes('\t')) return line.split('\t').map(c => c.trim()).filter(Boolean)
  if (/ {2,}/.test(line)) return line.split(/ {2,}/).map(c => c.trim()).filter(Boolean)
  const m = line.match(new RegExp(String.raw`^(.*?[a-z)%\]])\s+([<>≤≥]?\s*${NUM}\b)(.*)$`, 'i'))
  return m ? [m[1], m[2], m[3].trim()].filter(Boolean) : [line]
}

// After the value, a cell may hold several things ("mg/dL 0,7 - 1,2"): take a range out first,
// then read what is left word by word.
function pieces(cell) {
  const r = cell.match(RANGE) || cell.match(/(?:<|≤|<=|>|≥|>=)\s*[-+]?\d+(?:[.,]\d+)?/)
  if (!r) return cell.includes(' ') && !UNIT.test(cell) ? cell.split(/\s+/) : [cell]
  const before = cell.slice(0, r.index).trim(), after = cell.slice(r.index + r[0].length).trim()
  return [...(before ? pieces(before) : []), r[0].trim(), ...(after ? pieces(after) : [])]
}

// One row → { name, value, unit, lo, hi, flag } or null when the row has no number result.
function readRow(line) {
  const cells = cellsOf(line)
  if (cells.length < 2) return null
  const name = cells[0]
  if (!/[a-z]/i.test(name) || name.length > 80 || /^(page|pg\.?|sheet)$/i.test(name)) return null
  let value = null, cmp = null, flag = null, unit = '', lo = null, hi = null
  const [first, ...more] = cells.slice(1)
  for (const c of [first, ...more.flatMap(pieces)]) {
    if (value == null) {
      const v = c.match(VALUE)
      if (v) { value = num(v[2]); cmp = v[1] || null; if (v[3]) flag = v[3].toUpperCase(); continue }
      if (/^\d/.test(c)) return null   // first data cell isn't a clean number (e.g. "1+", a date)
      if (!FLAG.test(c)) return null   // a text result ("Negative", "Non-reactive"): not a numeric row
      continue
    }
    if (FLAG.test(c)) { flag = c.toUpperCase(); continue }
    let r
    if ((r = c.match(RANGE)) && lo == null && hi == null) { lo = num(r[1]); hi = num(r[2]); continue }
    if ((r = c.match(UPPER)) && hi == null) { hi = num(r[1]); continue }
    if ((r = c.match(LOWER)) && lo == null) { lo = num(r[1]); continue }
    if (!unit && UNIT.test(c) && /[a-zµμ%]/i.test(c)) { unit = c.replace(/\s+/g, ''); continue }
  }
  if (value == null) return null
  return { name, value, cmp, unit, lo, hi, flag }
}

// Text of a whole report → { date, dob, rows }. Each row: raw line, name, key (null if unmatched),
// value, unit, lo, hi, flag. Flags printed on their own line under a result attach to that result.
export function parseLabText(text, { mdy = false } = {}) {
  const lines = String(text).split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim())
  const { date, dob } = reportDates(lines, mdy)
  const rows = []
  for (const line of lines) {
    if (FLAG.test(line.trim()) && rows.length) { rows[rows.length - 1].flag ||= line.trim().toUpperCase(); continue }
    const r = readRow(line)
    if (!r) continue
    const hit = findMarker(r.name)
    let key = hit && (hit.rest === '' || /^(serum|plasma|blood|calculated|calc|direct|absolute|abs|total|ckd epi|sgot|sgpt|fasting|25 hydroxy|%)\b/.test(hit.rest) || hit.rest.length < 12) ? hit.key : null
    // "Neutrophils" with a % unit or a "%" in the name is the percentage, not the count
    if (key && MARKERS[key].pct && (r.unit === '%' || /%|percent/i.test(r.name))) key = MARKERS[key].pct
    rows.push(repairRow({ raw: line.replace(/\t/g, '  '), ...r, key }))
  }
  return { date, dob, rows }
}
