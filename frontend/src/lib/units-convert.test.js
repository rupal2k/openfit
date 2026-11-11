import { describe, it, expect } from 'vitest'
import { convertWeights, hasWeights } from './units-convert.js'

const state = () => ({
  unit: 'kg', targetW: 70,
  bodyweight: [{ d: '2026-01-01', w: 80 }],
  exWeights: { a: { w: 100, d: '2026-01-01' } },
  routines: [{ id: 'r', ex: [{ id: 'a', sets: 3, reps: 5, weight: 60, inc: 2.5 }, { id: 'b', sets: 3, reps: 10, weight: 0 }] }],
  workouts: [{ d: '2026-01-01', bw: 80, entries: [{ id: 'a', topW: 100, target: { sets: 3, reps: 5, weight: 100 }, sets: [{ w: 100, r: 5, done: true }, { w: 100, r: 5, done: true }] }] }],
  active: { bw: 80, entries: [{ id: 'a', plan: { weight: 102.5 }, sets: [{ w: 102.5, r: 5, done: false }] }] }
})

describe('convertWeights', () => {
  it('converts every logged weight kg -> lb and recomputes volume', () => {
    const s = convertWeights(state(), 'kg', 'lb')
    expect(s.unit).toBe('lb')
    expect(s.bodyweight[0].w).toBe(176.4)
    expect(s.exWeights.a.w).toBe(220.5)
    expect(s.routines[0].ex[0]).toMatchObject({ weight: 132.3, inc: 5.5 })
    expect(s.routines[0].ex[1].weight).toBe(0)                 // bodyweight stays 0
    expect(s.workouts[0].entries[0].sets[0].w).toBe(220.5)
    expect(s.workouts[0].entries[0].target.weight).toBe(220.5)
    expect(s.workouts[0].vol).toBe(220.5 * 10)
    expect(s.targetW).toBe(154.3)
    expect(s.active.entries[0].sets[0].w).toBe(226)
    expect(s.active.bw).toBe(176.4)
  })
  it('a round trip lands within rounding of the original', () => {
    const s = convertWeights(convertWeights(state(), 'kg', 'lb'), 'lb', 'kg')
    expect(s.bodyweight[0].w).toBeCloseTo(80, 0)
    expect(s.exWeights.a.w).toBeCloseTo(100, 0)
  })
  it('same unit or unknown unit is a no-op', () => {
    expect(convertWeights(state(), 'kg', 'kg').bodyweight[0].w).toBe(80)
    expect(convertWeights(state(), 'kg', 'stone').unit).toBe('kg')
  })
  it('knows when there is nothing to convert', () => {
    expect(hasWeights({ workouts: [], bodyweight: [], exWeights: {}, routines: [] })).toBe(false)
    expect(hasWeights(state())).toBe(true)
  })
})
