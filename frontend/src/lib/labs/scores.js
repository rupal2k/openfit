// Published clinical scores from one report's values. Every value is canonical (SI, lib/labs/catalog.js).
// A score appears only when all of its inputs are in the report. These are wellness information,
// not a diagnosis; the bands are reference points from the cited work and vary by population.

const MGDL_CHOL = 38.67, MGDL_TG = 88.57

const band = (label, level) => ({ label, level })   // level: 'good' | 'mid' | 'high' (text always shown)

export const SCORES = [
  {
    id: 'homaIR', name: 'HOMA-IR', what: 'Insulin resistance',
    needs: ['diabetes.insulin', 'biochemistry.glucose'],
    calc: v => v['diabetes.insulin'] * v['biochemistry.glucose'] / 22.5,
    digits: 2, unit: '',
    band: x => x < 1 ? band('Very insulin-sensitive', 'good') : x < 2.5 ? band('In the usual range', 'good') : band('Often read as insulin resistance', 'high'),
    formula: 'Fasting insulin (µIU/mL) × fasting glucose (mmol/L) ÷ 22.5',
    source: 'Matthews DR et al., Diabetologia, 1985. The 2.5 cut-off is common but varies by population.'
  },
  {
    id: 'tgHdl', name: 'TG/HDL ratio', what: 'Triglycerides to HDL',
    needs: ['lipids.triglycerides', 'lipids.hdl'],
    calc: v => (v['lipids.triglycerides'] * MGDL_TG) / (v['lipids.hdl'] * MGDL_CHOL),
    digits: 2, unit: '',
    band: x => x < 2 ? band('Low', 'good') : x < 3.5 ? band('Borderline', 'mid') : band('High', 'high'),
    formula: 'Triglycerides ÷ HDL cholesterol, both in mg/dL',
    source: 'Ratio in mg/dL (in mmol/L it is about 2.3 times smaller). Reference points vary between studies.'
  },
  {
    id: 'apoRatio', name: 'ApoB/ApoA1', what: 'Atherogenic to protective particles',
    needs: ['lipids.apoB', 'lipids.apoAI'],
    calc: v => v['lipids.apoB'] / v['lipids.apoAI'],
    digits: 2, unit: '',
    band: (x, { sex }) => {
      const cut = sex === 'female' ? 0.8 : 0.9
      return x < cut ? band(`Below ${cut}`, 'good') : band(`${cut} or above: higher risk`, 'high')
    },
    formula: 'Apolipoprotein B ÷ apolipoprotein A-I',
    source: 'INTERHEART, Yusuf S et al., Lancet, 2004; cut-offs 0.9 (men) and 0.8 (women) from Walldius G & Jungner I, 2004.'
  },
  {
    id: 'fib4', name: 'FIB-4', what: 'Liver scarring risk',
    needs: ['biochemistry.ast', 'biochemistry.alt', 'hematology.platelets'], age: true,
    calc: (v, { age }) => age * v['biochemistry.ast'] / (v['hematology.platelets'] * Math.sqrt(v['biochemistry.alt'])),
    digits: 2, unit: '',
    band: x => x < 1.3 ? band('Low risk of advanced scarring', 'good') : x <= 2.67 ? band('Indeterminate', 'mid') : band('High risk: worth a follow-up', 'high'),
    note: ({ age }) => age < 35 ? 'Less reliable under 35.' : age > 65 ? 'Over 65 a lower cut-off of 2.0 is often used.' : '',
    formula: '(Age × AST) ÷ (platelets × √ALT)',
    source: 'Sterling RK et al., Hepatology, 2006; cut-offs 1.30 and 2.67 from Shah AG et al., 2009.'
  },
  {
    id: 'nonHdl', name: 'Non-HDL cholesterol', what: 'All atherogenic cholesterol',
    needs: ['lipids.cholesterol', 'lipids.hdl'],
    calc: v => v['lipids.cholesterol'] - v['lipids.hdl'],
    digits: 2, unit: 'mmol/L', us: { unit: 'mg/dL', f: MGDL_CHOL, digits: 0 },
    band: x => x * MGDL_CHOL < 130 ? band('Under 130 mg/dL', 'good') : x * MGDL_CHOL < 160 ? band('130–159 mg/dL', 'mid') : band('160 mg/dL or more', 'high'),
    note: () => 'Your own target depends on your overall heart risk.',
    formula: 'Total cholesterol − HDL cholesterol',
    source: 'NCEP ATP III, 2001: the non-HDL goal is the LDL goal plus 30 mg/dL.'
  },
  {
    id: 'homocysteine', name: 'Homocysteine', what: 'Methylation and vascular marker',
    needs: ['biochemistry.homocysteine'],
    calc: v => v['biochemistry.homocysteine'],
    digits: 1, unit: 'µmol/L',
    band: x => x <= 15 ? band('15 µmol/L or under', 'good') : band('Above 15: raised', 'high'),
    formula: 'Measured directly',
    source: 'Above 15 µmol/L is the usual definition of raised homocysteine (Refsum H et al., Annu Rev Med, 1998).'
  },
  {
    id: 'omega3', name: 'Omega-3 Index', what: 'EPA + DHA in red cell membranes',
    needs: ['fattyAcids.omega3Index'],
    calc: v => v['fattyAcids.omega3Index'],
    digits: 1, unit: '%',
    band: x => x > 8 ? band('Above 8%: desirable', 'good') : x >= 4 ? band('4–8%: intermediate', 'mid') : band('Under 4%: low', 'high'),
    formula: 'EPA + DHA as a percentage of red blood cell fatty acids (a separate test)',
    source: 'Harris WS & von Schacky C, Preventive Medicine, 2004.'
  }
]

// PhenoAge, Levine ME et al., Aging, 2018: a biological age from nine blood markers and age.
// The published coefficients use mixed units: albumin g/L, creatinine µmol/L, glucose mmol/L,
// CRP mg/dL (log), lymphocytes %, MCV fL, RDW %, ALP U/L, WBC 10^9/L.
export const PHENO_NEEDS = ['proteins.albumin', 'biochemistry.creatinine', 'biochemistry.glucose', 'hematology.mcv',
  'hematology.rdwcv', 'biochemistry.alp', 'hematology.wbc', 'differential.lymphocytesPct']

export function phenoAge(v, age) {
  const crp = v['proteins.hsCRP'] ?? v['proteins.crp']
  if (!Number.isFinite(age) || !(crp > 0) || PHENO_NEEDS.some(k => !Number.isFinite(v[k]))) return null
  const xb = -19.907 - 0.0336 * v['proteins.albumin'] + 0.0095 * v['biochemistry.creatinine']
    + 0.1953 * v['biochemistry.glucose'] + 0.0954 * Math.log(crp / 10) - 0.0120 * v['differential.lymphocytesPct']
    + 0.0268 * v['hematology.mcv'] + 0.3306 * v['hematology.rdwcv'] + 0.00188 * v['biochemistry.alp']
    + 0.0554 * v['hematology.wbc'] + 0.0804 * age
  const g = 0.0076927
  const mortality = 1 - Math.exp(-Math.exp(xb) * (Math.exp(120 * g) - 1) / g)
  if (!(mortality > 0 && mortality < 1)) return null
  return 141.50225 + Math.log(-0.00553 * Math.log(1 - mortality)) / 0.090165
}

// values: { [key]: canonical number } from one report; ctx: { age, sex }.
export function labScores(values, ctx = {}) {
  const out = []
  for (const s of SCORES) {
    if (s.needs.some(k => !Number.isFinite(values[k]))) continue
    if (s.age && !Number.isFinite(ctx.age)) continue
    const x = s.calc(values, ctx)
    if (!Number.isFinite(x)) continue   // e.g. HDL 0
    out.push({ id: s.id, name: s.name, what: s.what, value: x, digits: s.digits, unit: s.unit, us: s.us,
      band: s.band(x, ctx), note: s.note?.(ctx) || '', formula: s.formula, source: s.source })
  }
  const pa = phenoAge(values, ctx.age)
  if (pa != null) {
    const d = pa - ctx.age
    out.push({ id: 'phenoAge', name: 'Biological age (PhenoAge)', what: 'Age the blood markers look like', value: pa, digits: 1, unit: 'years',
      band: Math.abs(d) < 1 ? band('About your age', 'good') : d < 0 ? band(`${(-d).toFixed(1)} years younger`, 'good') : band(`${d.toFixed(1)} years older`, 'mid'),
      note: 'An estimate from nine routine markers. Most useful as a trend over time.',
      formula: 'Levine PhenoAge: albumin, creatinine, glucose, CRP, lymphocytes %, MCV, RDW, ALP, WBC and age',
      source: 'Levine ME et al., Aging (Albany NY), 2018.' })
  }
  return out
}
