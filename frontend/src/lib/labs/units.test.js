import { describe, it, expect } from 'vitest'
import { toCanonical, fromCanonical } from './units.js'
import { findMarker } from './catalog.js'

describe('lab units', () => {
  it('converts US units to SI', () => {
    expect(toCanonical('biochemistry.glucose', 102, 'mg/dL').v).toBeCloseTo(5.661, 2)
    expect(toCanonical('lipids.cholesterol', 196, 'mg/dL').v).toBeCloseTo(5.069, 2)
    expect(toCanonical('hematology.hemoglobin', 14.6, 'g/dL').v).toBeCloseTo(146, 6)
    expect(toCanonical('diabetes.insulin', 60, 'pmol/L').v).toBeCloseTo(10, 6)
  })
  it('treats spelling variants of one unit as the same', () => {
    expect(toCanonical('hematology.wbc', 11.4, 'K/uL')).toEqual({ v: 11.4, ok: true })
    expect(toCanonical('electrolytes.sodium', 139, 'mEq/L')).toEqual({ v: 139, ok: true })
    expect(toCanonical('thyroid.tsh', 2.14, 'uIU/mL')).toEqual({ v: 2.14, ok: true })
    expect(toCanonical('iron.ferritin', 74, 'ng/mL')).toEqual({ v: 74, ok: true })
  })
  it('handles HbA1c in mmol/mol', () => {
    expect(toCanonical('diabetes.hba1c', 39, 'mmol/mol').v).toBeCloseTo(5.72, 1)
  })
  it('flags a unit it does not know instead of guessing', () => {
    expect(toCanonical('biochemistry.glucose', 5, 'furlongs').ok).toBe(false)
    expect(toCanonical('lipids.lpA', 30, 'mg/dL').ok).toBe(false)   // Lp(a) mg/dL ↔ nmol/L is not a fixed factor
  })
  it('round-trips US → SI → US', () => {
    for (const [key, v, u] of [['biochemistry.creatinine', 0.94, 'mg/dL'], ['lipids.triglycerides', 121, 'mg/dL'], ['vitamins.vitaminD', 42.6, 'ng/mL']]) {
      const back = fromCanonical(key, toCanonical(key, v, u).v, 'us')
      expect(back.unit).toBe(u)
      expect(back.v).toBeCloseTo(v, 6)
    }
  })
  it('shows SI by default', () => {
    expect(fromCanonical('biochemistry.glucose', 5.5)).toEqual({ v: 5.5, unit: 'mmol/L' })
  })
})

describe('marker names', () => {
  it('matches the longest name first', () => {
    expect(findMarker('Hemoglobin A1c').key).toBe('diabetes.hba1c')
    expect(findMarker('Hemoglobin').key).toBe('hematology.hemoglobin')
    expect(findMarker('Transferrin Saturation').key).toBe('iron.transferrinSat')
    expect(findMarker('Non-HDL Cholesterol').key).toBe('lipids.nonHdl')
    expect(findMarker('Bilirubin, Total').key).toBe('biochemistry.bilirubinTotal')
    expect(findMarker('AST (SGOT)').key).toBe('biochemistry.ast')
  })
  it('does not match a name that only starts with an alias', () => {
    expect(findMarker('Kidney function')).toBe(null)   // not "k" (potassium)
    expect(findMarker('Nature of specimen')).toBe(null)   // not "na"
  })
})
