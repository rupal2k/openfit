import { describe, it, expect } from 'vitest'
import { repairRow } from './repair.js'

const row = o => ({ name: 'x', flag: null, cmp: null, ...o })

describe('repairing OCR rows', () => {
  it('puts back a dropped decimal point in a value and its range', () => {
    expect(repairRow(row({ key: 'hematology.mchc', value: 333, unit: 'g/dL', lo: 32, hi: 36 }), { ocr: true })).toMatchObject({ value: 33.3, lo: 32, hi: 36, fixed: true })
    expect(repairRow(row({ key: 'hematology.hemoglobin', value: 146, unit: 'g/dL', lo: 135, hi: 175 }), { ocr: true })).toMatchObject({ value: 14.6, lo: 13.5, hi: 17.5, fixed: true })
    expect(repairRow(row({ key: 'hematology.rbc', value: 4.72, unit: 'M/uL', lo: 4, hi: 58 }), { ocr: true })).toMatchObject({ value: 4.72, lo: 4, hi: 5.8, fixed: true })
    expect(repairRow(row({ key: 'electrolytes.magnesium', value: 21, unit: 'mg/dL', lo: 16, hi: 26 }), { ocr: true })).toMatchObject({ value: 2.1, lo: 1.6, hi: 2.6 })
  })
  it('leaves possible values alone, even when abnormal', () => {
    const r = row({ key: 'biochemistry.glucose', value: 302, unit: 'mg/dL', lo: 74, hi: 100 })
    expect(repairRow(r, { ocr: true })).toBe(r)
    const crp = row({ key: 'proteins.hsCRP', value: 38, unit: 'mg/L', lo: 0, hi: 3 })
    expect(repairRow(crp, { ocr: true })).toBe(crp)
  })
  it('does not touch a value that already has a decimal point', () => {
    expect(repairRow(row({ key: 'hematology.hemoglobin', value: 146.5, unit: 'g/dL' }), { ocr: true }).value).toBe(146.5)
  })
  it('fills a missing unit only when exactly one fits', () => {
    expect(repairRow(row({ key: 'electrolytes.sodium', value: 139, unit: '' }), { ocr: true })).toMatchObject({ unit: 'mmol/L', unitGuessed: true })
    const chol = row({ key: 'lipids.cholesterol', value: 5, unit: '' })   // 5 mmol/L is possible; 5 mg/dL is not
    expect(repairRow(chol, { ocr: true })).toMatchObject({ unit: 'mmol/L', unitGuessed: true })
    const ldh = row({ key: 'biochemistry.ldh', value: 184, unit: '' })   // U/L only possible unit
    expect(repairRow(ldh, { ocr: true }).unit).toBe('U/L')
  })
  it('leaves unmatched rows alone', () => {
    const r = row({ key: null, value: 999, unit: '' })
    expect(repairRow(r, { ocr: true })).toBe(r)
  })
})

describe('OCR number and unit slips', () => {
  it('reads a leading zero as a lost decimal point', async () => {
    const { parseLabText } = await import('./parse.js')
    expect(parseLabText('Lymphocytes (Absolute)\t2.8\tK/uL\t08-4', { ocr: true }).rows[0]).toMatchObject({ lo: 0.8, hi: 4 })
    expect(parseLabText('Monocytes (Absolute)\t09\tK/uL\t008-12', { ocr: true }).rows[0]).toMatchObject({ value: 0.9, lo: 0.08 })
  })
  it('replaces a garbled unit with the one that fits', () => {
    expect(repairRow(row({ key: 'hematology.mpv', value: 104, unit: 'n', lo: 78, hi: 128 }), { ocr: true })).toMatchObject({ value: 10.4, unit: 'fL', lo: 7.8, hi: 12.8, unitGuessed: true })
  })
})
