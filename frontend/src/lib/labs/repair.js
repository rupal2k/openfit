import { MARKERS } from './catalog.js'
import { toCanonical, sameUnit } from './units.js'

// OCR drops small decimal points ("33.3" → "333", "4 – 5.8" → "4-58") and sometimes a unit.
// Values a human body can't produce give that away. For each marker, a wide band of values that
// are physically possible (canonical units). A value outside it that lands inside once a decimal
// point is put back gets fixed and flagged, so the review screen asks the person to check it.
// These bands are deliberately wide: they catch a misplaced decimal, not an abnormal result.
export const POSSIBLE = {
  'hematology.wbc': [0.5, 150], 'hematology.rbc': [1, 9], 'hematology.hemoglobin': [30, 250], 'hematology.hematocrit': [10, 75],
  'hematology.mcv': [50, 140], 'hematology.mch': [10, 50], 'hematology.mchc': [200, 450], 'hematology.rdwcv': [8, 35],
  'hematology.platelets': [5, 2000], 'hematology.mpv': [5, 20], 'hematology.pdw': [5, 30], 'hematology.pct': [0.02, 1.5],
  'differential.neutrophils': [0, 50], 'differential.lymphocytes': [0, 50], 'differential.monocytes': [0, 10],
  'differential.eosinophils': [0, 10], 'differential.basophils': [0, 5],
  'differential.neutrophilsPct': [0, 100], 'differential.lymphocytesPct': [0, 100], 'differential.monocytesPct': [0, 100],
  'differential.eosinophilsPct': [0, 100], 'differential.basophilsPct': [0, 100],
  'biochemistry.glucose': [1, 40], 'biochemistry.urea': [0.5, 60], 'biochemistry.creatinine': [10, 2000], 'biochemistry.egfr': [2, 200],
  'biochemistry.uricAcid': [50, 1200], 'biochemistry.bilirubinTotal': [1, 700], 'biochemistry.ast': [3, 5000], 'biochemistry.alt': [3, 5000],
  'biochemistry.alp': [10, 3000], 'biochemistry.ggt': [3, 3000], 'biochemistry.ldh': [50, 5000], 'biochemistry.homocysteine': [1, 200],
  'electrolytes.sodium': [100, 180], 'electrolytes.potassium': [1.5, 9], 'electrolytes.chloride': [60, 140],
  'electrolytes.calciumTotal': [1, 4.5], 'electrolytes.phosphorus': [0.2, 4], 'electrolytes.magnesium': [0.2, 3],
  'proteins.totalProtein': [30, 120], 'proteins.albumin': [10, 65], 'proteins.hsCRP': [0.01, 300], 'proteins.crp': [0.01, 500],
  'lipids.cholesterol': [1, 20], 'lipids.triglycerides': [0.1, 60], 'lipids.hdl': [0.1, 5], 'lipids.ldl': [0.1, 15],
  'lipids.nonHdl': [0.1, 18], 'lipids.apoAI': [0.3, 3], 'lipids.apoB': [0.1, 3], 'lipids.lpA': [0, 1000],
  'iron.iron': [1, 80], 'iron.ferritin': [1, 10000], 'iron.transferrin': [0.5, 6], 'iron.tibc': [10, 150], 'iron.transferrinSat': [1, 100],
  'thyroid.tsh': [0.001, 200], 'thyroid.ft4': [1, 100], 'thyroid.ft3': [0.5, 40], 'thyroid.tpoAb': [0, 10000], 'thyroid.tgAb': [0, 10000],
  'vitamins.vitaminD': [5, 500], 'vitamins.vitaminB12': [30, 3000], 'vitamins.folate': [1, 100],
  'diabetes.hba1c': [3, 20], 'diabetes.insulin': [0.5, 300], 'diabetes.cPeptide': [0.1, 15], 'diabetes.fructosamine': [100, 1000],
  'diabetes.homaIR': [0.1, 50],
  'hormones.testosterone': [0.05, 60], 'hormones.shbg': [2, 300], 'hormones.estradiol': [10, 20000],
  'fattyAcids.omega3Index': [1, 20],
}

const possible = (key, value, unit, basis) => {
  const b = POSSIBLE[key], c = toCanonical(key, value, unit, basis)
  return !b || !c.ok ? null : c.v >= b[0] && c.v <= b[1]
}

// The value, or the same digits with a decimal point put back, that is physically possible.
function placeDecimal(key, value, unit, basis) {
  if (value == null || possible(key, value, unit, basis) !== false) return { value, fixed: false }
  if (!Number.isInteger(value)) return { value, fixed: false }   // has a decimal already: leave it
  for (const d of [10, 100, 1000]) {
    if (possible(key, value / d, unit, basis)) return { value: +(value / d).toFixed(6), fixed: true }
  }
  return { value, fixed: false }
}

// A unit any marker uses ("mg/dL", "nmol/L"): printed by the lab, so never swapped for another.
const KNOWN_UNITS = Object.values(MARKERS).flatMap(d => [d.unit, ...d.alt.map(a => a.unit)]).filter(Boolean)
const isRealUnit = u => KNOWN_UNITS.some(k => sameUnit(k, u))

// A row with no usable unit: the one known unit in which the value is possible, if exactly one fits.
function guessUnit(key, value, basis) {
  const d = MARKERS[key]
  const fits = [d.unit, ...d.alt.map(a => a.unit)].filter(u => u && possible(key, value, u, basis))
  // units that give the same value (sodium mmol/L and mEq/L) count as one
  const values = new Set(fits.map(u => toCanonical(key, value, u, basis).v.toPrecision(9)))
  return values.size === 1 ? fits[0] : null
}

// ocr: the text came from OCR. Only then are decimal points put back and garbled units replaced:
// a digital PDF prints exactly what the lab measured, so glucose 900 stays 900. Every change is
// flagged (fixed, unitGuessed) and such rows are never saved without the person ticking them.
export function repairRow(r, { ocr = false } = {}) {
  if (!r.key) return r
  let { unit } = r, unitGuessed = false
  const missing = !unit, garbled = !!unit && ocr && !isRealUnit(unit)
  if (MARKERS[r.key].unit && (missing || garbled) && !toCanonical(r.key, r.value, unit, r.basis).ok) {
    const g = guessUnit(r.key, r.value, r.basis) || (ocr ? guessUnit(r.key, r.value / 10, r.basis) : null)
    if (g) { unit = g; unitGuessed = true }
  }
  if (!ocr) return unitGuessed ? { ...r, unit, unitGuessed } : r
  const v = placeDecimal(r.key, r.value, unit, r.basis)
  const lo = placeDecimal(r.key, r.lo, unit, r.basis), hi = placeDecimal(r.key, r.hi, unit, r.basis)
  const fixed = v.fixed || lo.fixed || hi.fixed
  if (!fixed && !unitGuessed) return r
  return { ...r, value: v.value, lo: lo.value, hi: hi.value, unit, fixed, unitGuessed }
}
