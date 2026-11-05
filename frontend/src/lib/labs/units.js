import { MARKERS } from './catalog.js'

// Spelling variants of one unit compare equal: "K/uL" = "x10^3/µL" = "10^9/L". mEq/L is not here: it
// equals mmol/L only for a single charge, so each marker lists it with its own factor.
const SAME = [
  // OCR misreadings of the same units sit alongside the real spellings
  ['10^9/l', 'k/ul', 'kul', 'k/ui', 'kiul', 'kl', 'k/l', '10^3/ul', 'x10^3/ul', 'x10e3/ul', '10e3/ul', 'thou/ul', 'thou/mm3', 'thou/cumm', 'thou/cu.mm', 'x10^3/cumm', '10^3/cumm', '10^3/mm3', 'x10^9/l', '10e9/l', 'g/l (cells)'],
  ['10^12/l', 'm/ul', 'mul', 'm/ui', 'miul', '10^6/ul', 'x10^6/ul', 'x10e6/ul', '10e6/ul', 'mill/ul', 'mil/ul', 'x10^12/l', '10e12/l', 'million/ul', 'mill/cumm', 'million/cumm', 'millions/cumm', 'mill/cu.mm', 'mill/mm3'],
  // counts per µL as Indian labs print them (/cumm = per mm³ = per µL)
  ['/ul', '/cumm', 'cells/cumm', '/cu.mm', 'cells/cu.mm', '/mm3', 'cells/mm3', 'cells/ul', '/cmm', '/c.mm'],
  ['lakhs/ul', 'lakhs/cumm', 'lakh/cumm', 'lakhs/cu.mm', 'lakhs/mm3', 'lakh/ul'],
  ['g/dl', 'gm/dl', 'gms/dl', 'gm%', 'g%'],
  ['mg/dl', 'mg%'],
  ['u/l', 'iu/l'],
  ['miu/l', 'uiu/ml', 'mu/l', 'uu/ml', 'microiu/ml', 'ulu/ml', 'uiu/mi', 'piu/ml', 'liu/ml', 'ulu/mi'],
  ['ku/l', 'iu/ml', 'u/ml'],
  ['ug/l', 'ng/ml', 'ng/mi'],
  ['ml/min/1.73m2', 'ml/min/1.73m^2', 'ml/min/1.73 m2', 'ml/min'],
  ['%', 'percent'],
]
const canonUnit = u => {
  const s = String(u || '').toLowerCase().replace(/µ|μ|mc(?=g)/g, 'u').replace(/²/g, '2').replace(/³/g, '^3').replace(/\s+/g, '')
    .replace(/\*/g, '^').replace(/×/g, 'x')
  for (const group of SAME) if (group.some(g => g.replace(/\s+/g, '') === s)) return group[0]
  return s
}
export const sameUnit = (a, b) => canonUnit(a) === canonUnit(b)

// A reported value in the marker's canonical unit. ok: false when the unit isn't one we know for it.
// basis: for a marker whose unit means different things by name (urea vs BUN in mg/dL), from the parser.
export function toCanonical(key, value, unit, basis = null) {
  const d = MARKERS[key]
  if (!d || !Number.isFinite(value)) return { v: value, ok: false }
  if (!d.unit) return { v: value, ok: true }
  if (!unit) return { v: value, ok: false }   // glucose "5.4" could be mmol/L or a typo for mg/dL: ask
  if (sameUnit(unit, d.unit)) return { v: value, ok: true }
  const alt = d.alt.find(a => sameUnit(a.unit, unit) && (!a.basis || !basis || a.basis === basis))
  if (!alt) return { v: value, ok: false }
  return { v: (value - (alt.o || 0)) / alt.f, ok: true }
}

// A canonical value shown in SI (canonical) or in the unit US labs print (alt marked us: 1).
export function fromCanonical(key, v, system = 'si') {
  const d = MARKERS[key]
  if (!d) return { v, unit: '' }
  const alt = system === 'us' ? d.alt.find(a => a.us) : null
  return alt ? { v: v * alt.f + (alt.o || 0), unit: alt.unit } : { v, unit: d.unit }
}
