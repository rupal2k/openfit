// A backup is untrusted input (security audit 1.6.2): shapes that break a screen are dropped,
// good data is kept as it is.
import { describe, it, expect, vi } from 'vitest'
// the store adds a visibilitychange listener when it is created; no DOM library is installed
vi.hoisted(() => { globalThis.document ??= { addEventListener() {}, visibilityState: 'visible' } })
import { normalizeState } from './useStore.js'

describe('normalizeState repairs a hostile backup', () => {
  const bad = {
    customEx: [{ id: '__proto__', n: 'x' }, { id: 'c1', n: { evil: 1 } }, { id: 'c2', n: 'Wall sit', bp: 7, desc: ['x'] }, null],
    workouts: [null, { d: '2026-01-01' }, { d: '2026-01-02', entries: [] }],
    bodyweight: [{ d: '2026-01-01', w: 'heavy' }, { d: '2026-01-02', w: 71.5 }, 'x'],
    nutrition: { profile: ['x'], days: ['x'], foods: [null, { name: 'Apple' }] },
    exWeights: 'nope'
  }
  const s = normalizeState(bad)
  it('keeps only usable custom exercises, never a prototype id', () => {
    expect(s.customEx.map(c => c.id)).toEqual(['c2'])
    expect(s.customEx[0].bp).toBe('')
    expect(s.customEx[0].desc).toBeUndefined()
  })
  it('keeps workouts and weigh-ins that a screen can render', () => {
    expect(s.workouts).toHaveLength(1)
    expect(s.bodyweight).toEqual([{ d: '2026-01-02', w: 71.5 }])
  })
  it('coerces nutrition and working weights to the shapes the app expects', () => {
    expect(s.nutrition.profile).toBeNull()
    expect(s.nutrition.days).toEqual({})
    expect(s.nutrition.foods).toEqual([{ name: 'Apple' }])
    expect(s.exWeights).toEqual({})
  })
  it('leaves a normal state alone', () => {
    const ok = normalizeState({ customEx: [{ id: 'c9', n: 'Plank', bp: 'waist', tg: '', eq: 'custom', custom: true }], bodyweight: [{ d: '2026-01-02', w: 70 }] })
    expect(ok.customEx[0]).toMatchObject({ id: 'c9', n: 'Plank', bp: 'waist', eq: 'custom', custom: true })
    expect(ok.bodyweight).toEqual([{ d: '2026-01-02', w: 70 }])
  })
})
