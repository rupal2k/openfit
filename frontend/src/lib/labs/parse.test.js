import { describe, it, expect } from 'vitest'
import { parseLabText, findDate } from './parse.js'

const row = (text, opts) => parseLabText(text, opts).rows[0]

describe('parseLabText rows', () => {
  it('reads a tab-separated table row', () => {
    expect(row('Fasting Glucose\t102\tmg/dL\t74 – 100')).toMatchObject({ key: 'biochemistry.glucose', value: 102, unit: 'mg/dL', lo: 74, hi: 100, flag: null })
  })
  it('keeps an H or L flag, inline or on the next line', () => {
    expect(row('WBC\t11.4\tHIGH\tK/uL\t4 – 10')).toMatchObject({ value: 11.4, flag: 'HIGH', unit: 'K/uL' })
    expect(row('Hemoglobin  10.2 L  g/dL  13.5 - 17.5')).toMatchObject({ value: 10.2, flag: 'L', lo: 13.5, hi: 17.5 })
    expect(parseLabText('Platelets\t149\tK/uL\t150 – 400\nLOW').rows[0].flag).toBe('LOW')
  })
  it('reads one-sided ranges and < / > results', () => {
    expect(row('hs-CRP\t<0.5\tmg/L\t< 3.0')).toMatchObject({ key: 'proteins.hsCRP', value: 0.5, cmp: '<', hi: 3, lo: null })
    expect(row('eGFR\t>90\tmL/min/1.73m2\t> 60')).toMatchObject({ value: 90, cmp: '>', lo: 60, hi: null })
  })
  it('reads comma decimals and space-separated text', () => {
    expect(row('Kreatinin 0,94 mg/dL 0,7 - 1,2')).toMatchObject({ value: 0.94, lo: 0.7, hi: 1.2 })
    expect(row('Creatinine 0.94 mg/dL 0.7 - 1.2')).toMatchObject({ key: 'biochemistry.creatinine', value: 0.94, unit: 'mg/dL' })
  })
  it('splits counts from percentages', () => {
    expect(row('Neutrophils\t65\t%\t45 – 70').key).toBe('differential.neutrophilsPct')
    expect(row('Neutrophils (Absolute)\t7.4\tK/uL\t2 – 7').key).toBe('differential.neutrophils')
  })
  it('lists an unknown marker unmatched and skips text results', () => {
    expect(row('Quantum flux index\t4.2\tmg/dL\t1 - 5')).toMatchObject({ key: null, value: 4.2 })
    expect(parseLabText('HIV antibody\tNon-reactive\t\tNon-reactive').rows).toEqual([])
  })
  it('ignores header and footer lines', () => {
    expect(parseLabText('TEST\tRESULT\tFLAG\tUNITS\tREFERENCE INTERVAL\nPage 1 of 3').rows).toEqual([])
  })
})

describe('report dates', () => {
  it('takes the collection date from the row under a header, not the date of birth', () => {
    const text = 'PATIENT\tDATE OF BIRTH\tSPECIMEN\nSAMPLE\t01/01/1990\tSerum\nCOLLECTED\tRECEIVED\tREPORTED\n07/14/2026 08:15\t07/14/2026\t07/15/2026'
    expect(parseLabText(text)).toMatchObject({ date: '2026-07-14', dob: '1990-01-01' })
  })
  it('reads inline labels and month names', () => {
    expect(parseLabText('Sample collected: 03-Aug-2026 09:10').date).toBe('2026-08-03')
    expect(parseLabText('Collection Date: Aug 3, 2026').date).toBe('2026-08-03')
  })
  it('follows the locale only when the date is ambiguous', () => {
    expect(findDate('04/03/2026')).toBe('2026-03-04')
    expect(findDate('04/03/2026', true)).toBe('2026-04-03')
    expect(findDate('25/03/2026', true)).toBe('2026-03-25')
  })
})
