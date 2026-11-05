import { describe, it, expect } from 'vitest'
import { parseLabText } from './parse.js'
import { reviewRows, buildReport, status, markerSeries, latestByMarker, ageAt, guessUnits, reportValues } from './reports.js'

const text = [
  'Fasting Glucose\t102\tmg/dL\t74 – 100', 'HIGH',
  'HDL Cholesterol\t52\tmg/dL\t39 – 81',
  'Glucose\t99\tmg/dL\t74 – 100',          // a second glucose row in the same report
  'Mystery\t4\tzz/L\t1 - 5',
  'Ferritin\t74\tfurlongs\t30 - 400'       // unit not known for ferritin
].join('\n')

describe('reviewing and saving a report', () => {
  const rows = reviewRows(parseLabText(text).rows)
  it('includes matched rows with known units, once per marker', () => {
    expect(rows.map(r => [r.name, r.include])).toEqual([
      ['Fasting Glucose', true], ['HDL Cholesterol', true], ['Glucose', false], ['Mystery', false], ['Ferritin', false]])
    expect(rows[2].dup).toBe(true)
    expect(rows[4].unitOk).toBe(false)
  })
  it('stores SI values and the range, and keeps what the report printed', () => {
    const rep = buildReport(rows, { date: '2026-07-14', src: 'report.pdf' })
    expect(rep.markers).toHaveLength(2)
    const g = rep.markers[0]
    expect(g).toMatchObject({ key: 'biochemistry.glucose', rv: 102, ru: 'mg/dL', raw: 'Fasting Glucose' })
    expect(g.v).toBeCloseTo(5.661, 2)
    expect(g.hi).toBeCloseTo(100 / 18.018, 3)
    expect(status(g)).toBe('high')
    expect(reportValues(rep)['lipids.hdl']).toBeCloseTo(52 / 38.67, 3)
  })
  it('guesses US units for a mg/dL report', () => expect(guessUnits(rows)).toBe('us'))
})

describe('history', () => {
  const r = (id, d, v) => ({ id, d, t: 0, markers: [{ key: 'lipids.ldl', v, lo: 1.2, hi: 3 }] })
  const reports = [r('b', '2026-07-01', 3.4), r('a', '2025-07-01', 2.9)]
  it('orders a marker oldest first', () => expect(markerSeries(reports, 'lipids.ldl').map(p => p.m.v)).toEqual([2.9, 3.4]))
  it('shows the latest reading', () => expect(latestByMarker(reports)[0].m.v).toBe(3.4))
  it('status needs a range', () => expect(status({ v: 1 })).toBe(null))
})

describe('age for scores', () => {
  it('prefers the profile birth year', () => expect(ageAt({ nutrition: { profile: { birthYear: 1990 } } }, { d: '2026-07-14' })).toBe(36))
  it('falls back to the date of birth on the report', () => {
    expect(ageAt({}, { d: '2026-07-14', dob: '1990-08-01' })).toBe(35)
    expect(ageAt({}, { d: '2026-07-14', dob: '1990-01-01' })).toBe(36)
  })
  it('is null when neither exists', () => expect(ageAt({}, { d: '2026-07-14' })).toBe(null))
})

describe('privacy and recent values', () => {
  it('keeps only the birth year from a printed date of birth', () => {
    const rep = buildReport([], { date: '2026-07-14', dob: '1990-08-01' })
    expect(rep.birthYear).toBe(1990)
    expect(rep.dob).toBeUndefined()
    expect(ageAt({}, rep)).toBe(36)
  })
  it('scores survive a later report that re-tests only a few markers', async () => {
    const { recentValues } = await import('./reports.js')
    const m = (key, v) => ({ key, v })
    const reports = [
      { id: 'a', d: '2026-06-01', t: 0, markers: [m('lipids.hdl', 1.3), m('lipids.triglycerides', 1.1)] },
      { id: 'b', d: '2026-07-01', t: 0, markers: [m('lipids.hdl', 1.4)] },
      { id: 'c', d: '2024-01-01', t: 0, markers: [m('lipids.apoB', 0.9)] }]
    expect(recentValues(reports, 120)).toEqual({ 'lipids.hdl': 1.4, 'lipids.triglycerides': 1.1 })
  })
})

describe('cleanReports', () => {
  it('drops malformed reports and markers instead of breaking the screen', async () => {
    const { cleanReports } = await import('./reports.js')
    const out = cleanReports([null, { id: 'a' }, { id: 'b', d: '2026-07-14', markers: [null, { key: 'lipids.hdl', v: 1.2 }, { key: 'x', v: 'NaN' }] }])
    expect(out).toHaveLength(1)
    expect(out[0].markers).toEqual([{ key: 'lipids.hdl', v: 1.2 }])
    expect(cleanReports('nope')).toEqual([])
  })
})

describe('age limits for adult scores', () => {
  it('gives no age for a child or an impossible birth year', () => {
    expect(ageAt({ nutrition: { profile: { birthYear: 2015 } } }, { d: '2026-07-14' })).toBe(null)
    expect(ageAt({ nutrition: { profile: { birthYear: 1890 } } }, { d: '2026-07-14' })).toBe(null)
    expect(ageAt({}, { d: '2026-07-14', birthYear: 1990 })).toBe(36)
  })
})
