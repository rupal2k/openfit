import { describe, it, expect, vi } from 'vitest'
vi.mock('./i18n.js', () => ({ t: s => s }))
import { parsePlan, mergePlan } from './plan-share.js'
import { cleanRoutine, cleanWeek, isKnownEx } from './clean.js'

const bundle = extra => JSON.stringify({ opengym_plan: 1, week: {}, customEx: [], routines: [], ...extra })
const merge = raw => { const s = { unit: 'kg', week: {}, customEx: [], routines: [] }; mergePlan(s, parsePlan(raw), { schedule: true }); return s }

describe('a hostile plan file cannot store data that breaks a screen', () => {
  it('names, icons and rules must be plain strings from the known lists', () => {
    const s = merge(bundle({ routines: [{ id: 'r', name: { evil: 1 }, emoji: ['a'], prog: { x: 1 }, format: 'x', rest: 'abc', ex: [{ id: '0662', sets: 3, reps: 10, sg: { a: 1 }, prog: 'nope', mode: 'evil' }] }] }))
    const r = s.routines[0]
    expect(r.name).toBe('Shared routine')
    expect(r.emoji).toBeUndefined()
    expect(r.prog).toBeUndefined()
    expect(r.format).toBeUndefined()
    expect(r.rest).toBeUndefined()
    expect(r.ex[0]).toEqual({ id: '0662', sets: 3, reps: 10 })
  })
  it('object-prototype names are not exercise ids', () => {
    for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) expect(isKnownEx(id)).toBe(false)
    const s = merge(bundle({ routines: [{ id: 'r', name: 'x', ex: [{ id: 'constructor' }, { id: '__proto__' }, { id: 'toString' }, { id: '0662', sets: 1, reps: 5 }] }] }))
    expect(s.routines[0].ex.map(e => e.id)).toEqual(['0662'])
  })
  it('a custom exercise named "constructor" maps to a fresh id, not Object', () => {
    const s = merge(bundle({ customEx: [{ id: 'constructor', n: 'My move', bp: 'chest' }], routines: [{ id: 'r', name: 'x', ex: [{ id: 'constructor', sets: 1, reps: 5 }] }] }))
    expect(typeof s.routines[0].ex[0].id).toBe('string')
    expect(s.routines[0].ex[0].id).not.toBe('constructor')
    expect(s.customEx[0].n).toBe('My move')
  })
  it('week keys are weekdays 0-6 only', () => {
    const s = merge(bundle({ week: { x: 'r', 9: 'r', 1: 'r', __proto__: 'r' }, routines: [{ id: 'r', name: 'x', ex: [] }] }))
    expect(Object.keys(s.week)).toEqual(['1'])
  })
  it('customs without a usable name are dropped; long text is cut', () => {
    const p = parsePlan(bundle({ customEx: [{ id: 'a', n: { x: 1 } }, { id: 'b', n: 'y'.repeat(500), bp: 7 }] }))
    expect(p.customEx).toHaveLength(1)
    expect(p.customEx[0].n).toHaveLength(80)
    expect(p.customEx[0].bp).toBe('')
  })
})

describe('stored state is repaired, not emptied', () => {
  it('keeps unknown fields but fixes the ones screens read', () => {
    const r = cleanRoutine({ id: 'r1', name: 7, extra: 'kept', rest: 'abc', cap: 5, format: 'amrap', ex: [{ id: '9999', sets: 1e9, note: 'kept', sg: 3 }, 'junk', null] })
    expect(r).toMatchObject({ id: 'r1', name: 'Routine', extra: 'kept', format: 'amrap', cap: 60 })
    expect(r.rest).toBeUndefined()
    expect(r.ex).toEqual([{ id: '9999', sets: 30, note: 'kept' }])   // unknown ids stay: the screen shows a placeholder
  })
  it('a week entry must point at a routine that exists', () => {
    expect(cleanWeek({ 1: 'a', 2: 'gone', 3: 5, 8: 'a' }, id => id === 'a')).toEqual({ 1: 'a' })
  })
})
