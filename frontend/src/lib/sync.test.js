import { describe, it, expect } from 'vitest'
import { mergeState } from './sync.js'

describe('mergeState', () => {
  const local = {
    unit: 'lb', week: { 1: 'r1' },
    workouts: [{ id: 'w1', d: '2026-10-01' }, { id: 'w3', d: '2026-10-03', note: 'local' }],
    routines: [{ id: 'r1', name: 'mine' }],
    customEx: [],
    bodyweight: [{ d: '2026-10-01', w: 80, t: 5 }],
    nutrition: { profile: null, days: { '2026-10-01': [{ id: 'f1' }] }, foods: [] }
  }
  const remote = {
    unit: 'kg', week: { 1: 'rX' },
    workouts: [{ id: 'w2', d: '2026-10-02' }, { id: 'w3', d: '2026-10-03', note: 'remote' }],
    routines: [{ id: 'r1', name: 'theirs' }, { id: 'r2', name: 'new' }],
    customEx: [{ id: 'c1' }],
    bodyweight: [{ d: '2026-10-01', w: 81, t: 9 }, { d: '2026-10-02', w: 79, t: 1 }],
    nutrition: { profile: { kcal: 2000 }, days: { '2026-10-01': [{ id: 'f2' }], '2026-10-02': [{ id: 'f3' }] }, foods: [{ id: 'food1' }] }
  }
  const m = mergeState(local, remote)

  it('keeps workouts from both devices, sorted by date, local wins on the same id', () => {
    expect(m.workouts.map(w => w.id)).toEqual(['w1', 'w2', 'w3'])
    expect(m.workouts[2].note).toBe('local')
  })
  it('unions routines, custom exercises and saved foods', () => {
    expect(m.routines.map(r => r.name)).toEqual(['mine', 'new'])
    expect(m.customEx).toEqual([{ id: 'c1' }])
    expect(m.nutrition.foods).toEqual([{ id: 'food1' }])
  })
  it('keeps the latest weigh-in per day', () => {
    expect(m.bodyweight).toEqual([{ d: '2026-10-01', w: 81, t: 9 }, { d: '2026-10-02', w: 79, t: 1 }])
  })
  it('unions food diary entries per day', () => {
    expect(m.nutrition.days['2026-10-01'].map(e => e.id)).toEqual(['f1', 'f2'])
    expect(m.nutrition.days['2026-10-02'].map(e => e.id)).toEqual(['f3'])
    expect(m.nutrition.profile).toEqual({ kcal: 2000 })
  })
  it('takes settings and the weekly plan from this device', () => {
    expect(m.unit).toBe('lb')
    expect(m.week).toEqual({ 1: 'r1' })
  })
  it('does not mutate its inputs', () => {
    expect(local.workouts).toHaveLength(2)
    expect(remote.workouts).toHaveLength(2)
  })
})
