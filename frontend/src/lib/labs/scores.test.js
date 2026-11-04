import { describe, it, expect } from 'vitest'
import { labScores, phenoAge } from './scores.js'
import { toCanonical } from './units.js'

// The getbased reference report's values (US units), as canonical SI. Expected numbers below were
// worked out by hand from the published formulas, not by running this code.
const us = {
  'diabetes.insulin': [9.8, 'uIU/mL'], 'biochemistry.glucose': [102, 'mg/dL'],
  'lipids.triglycerides': [121, 'mg/dL'], 'lipids.hdl': [52, 'mg/dL'], 'lipids.cholesterol': [196, 'mg/dL'],
  'lipids.apoB': [104, 'mg/dL'], 'lipids.apoAI': [142, 'mg/dL'],
  'biochemistry.ast': [31, 'U/L'], 'biochemistry.alt': [28, 'U/L'], 'hematology.platelets': [149, 'K/uL'],
  'proteins.albumin': [4.7, 'g/dL'], 'biochemistry.creatinine': [0.94, 'mg/dL'], 'proteins.hsCRP': [3.8, 'mg/L'],
  'differential.lymphocytesPct': [25, '%'], 'hematology.mcv': [92.8, 'fL'], 'hematology.rdwcv': [13.7, '%'],
  'biochemistry.alp': [72, 'U/L'], 'hematology.wbc': [11.4, 'K/uL']
}
const V = Object.fromEntries(Object.entries(us).map(([k, [v, u]]) => {
  const c = toCanonical(k, v, u)
  if (!c.ok) throw new Error(`unit for ${k}`)
  return [k, c.v]
}))
const byId = (vals, ctx) => Object.fromEntries(labScores(vals, ctx).map(s => [s.id, s]))

describe('clinical scores', () => {
  const s = byId(V, { age: 36, sex: 'male' })
  it('HOMA-IR matches the value the report prints (2.47)', () => expect(s.homaIR.value).toBeCloseTo(2.466, 2))
  it('TG/HDL in mg/dL', () => expect(s.tgHdl.value).toBeCloseTo(121 / 52, 2))
  it('ApoB/ApoA1 with the male cut-off', () => {
    expect(s.apoRatio.value).toBeCloseTo(104 / 142, 2)
    expect(s.apoRatio.band.level).toBe('good')
  })
  it('FIB-4 = age × AST ÷ (platelets × √ALT)', () => expect(s.fib4.value).toBeCloseTo(36 * 31 / (149 * Math.sqrt(28)), 2))
  it('Non-HDL in mmol/L (144 mg/dL)', () => expect(s.nonHdl.value * 38.67).toBeCloseTo(144, 1))
  it('PhenoAge ≈ 39.3 for this 36-year-old', () => expect(s.phenoAge.value).toBeCloseTo(39.25, 1))
  it('same HOMA-IR from mmol/L input', () => {
    expect(labScores({ 'diabetes.insulin': 9.8, 'biochemistry.glucose': 5.661 }).find(x => x.id === 'homaIR').value).toBeCloseTo(2.466, 2)
  })
})

describe('scores need their inputs', () => {
  it('leaves a score out when an input is missing', () => {
    const { 'lipids.apoB': _drop, ...rest } = V
    expect(byId(rest, { age: 36 }).apoRatio).toBeUndefined()
  })
  it('skips age-based scores without an age', () => {
    const s = byId(V, {})
    expect(s.fib4).toBeUndefined()
    expect(s.phenoAge).toBeUndefined()
  })
  it('never returns NaN: HDL 0, CRP 0', () => {
    expect(byId({ 'lipids.triglycerides': 1, 'lipids.hdl': 0 }).tgHdl).toBeUndefined()
    expect(phenoAge({ ...V, 'proteins.hsCRP': 0 }, 36)).toBe(null)
  })
  it('uses plain CRP when hs-CRP is missing', () => {
    const { 'proteins.hsCRP': crp, ...rest } = V
    expect(phenoAge({ ...rest, 'proteins.crp': crp }, 36)).toBeCloseTo(39.25, 1)
  })
  it('women get the 0.8 ApoB/ApoA1 cut-off', () => {
    expect(byId({ 'lipids.apoB': 0.85, 'lipids.apoAI': 1 }, { sex: 'female' }).apoRatio.band.level).toBe('high')
    expect(byId({ 'lipids.apoB': 0.85, 'lipids.apoAI': 1 }, { sex: 'male' }).apoRatio.band.level).toBe('good')
  })
})
