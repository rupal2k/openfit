import { describe, it, expect } from 'vitest'
import { finishSession, recordSession, topWeightOf } from './workout.js'

const set = (w, r, done = true) => ({ w, r, done })
const state = (workouts = [], exWeights = {}) => ({ unit: 'kg', workouts, exWeights, active: null })
const active = entries => ({ id: 'a1', d: '2026-10-16', start: 1000, routineId: 'r1', name: 'Push', bw: 70, entries })
const past = (d, id, sets, topW = null) => ({ id: 'w' + d, d, entries: [{ id, sets, topW }], prs: [] })

describe('topWeightOf', () => {
  it('takes the heavier of checked-off sets and the confirmed top weight', () => {
    expect(topWeightOf({ sets: [set(100, 5), set(110, 3, false)], topW: null })).toBe(100)
    expect(topWeightOf({ sets: [set(100, 5)], topW: 105 })).toBe(105)
    expect(topWeightOf({ sets: [set(undefined, 10)], topW: null })).toBe(0)
  })
})

describe('finishSession', () => {
  it('keeps only entries with logged sets, with their prescription', () => {
    const A = active([
      { id: 'bench', sets: [set(80, 5)], target: { sets: 1, reps: 5 } },
      { id: 'squat', sets: [set(100, 5, false)], target: { sets: 1, reps: 5 } }
    ])
    const { w } = finishSession(state(), A, 5000)
    expect(w.entries.map(e => e.id)).toEqual(['bench'])
    expect(w.entries[0].target).toEqual({ sets: 1, reps: 5 })
    expect(w).toMatchObject({ id: 'a1', d: '2026-10-16', start: 1000, end: 5000, routineId: 'r1', bw: 70 })
  })

  it('flags a load PR only when the top set beats history', () => {
    const S = state([past('2026-10-10', 'bench', [set(80, 5)])])
    expect(finishSession(S, active([{ id: 'bench', sets: [set(85, 5)] }])).prs).toEqual(['bench'])
    expect(finishSession(S, active([{ id: 'bench', sets: [set(80, 5)] }])).prs).toEqual([])
  })

  it('reports more reps at the same weight as a 1RM record, not a load PR', () => {
    const S = state([past('2026-10-10', 'bench', [set(80, 5)])])
    const r = finishSession(S, active([{ id: 'bench', sets: [set(80, 8)] }]))
    expect(r.prs).toEqual([])
    expect(r.e1prs.map(x => x.id)).toEqual(['bench'])
  })

  it('does not touch the state or the active session', () => {
    const S = state()
    const A = active([{ id: 'bench', sets: [set(80, 5)] }])
    const before = JSON.stringify({ S, A })
    finishSession(S, A)
    expect(JSON.stringify({ S, A })).toBe(before)
  })
})

describe('recordSession', () => {
  it('files the workout, closes the session and raises working weights from sets and top weight', () => {
    const s = state([], { bench: { w: 80, d: '2026-10-10' } })
    s.active = {}
    const { w } = finishSession(s, active([
      { id: 'bench', sets: [set(85, 5)] },
      { id: 'squat', sets: [set(100, 5)], topW: 110 }
    ]))
    recordSession(s, w)
    expect(s.workouts).toHaveLength(1)
    expect(s.active).toBeNull()
    expect(s.exWeights.bench).toEqual({ w: 85, d: '2026-10-16' })
    expect(s.exWeights.squat).toEqual({ w: 110, d: '2026-10-16' })
  })

  it('never lowers a working weight', () => {
    const s = state([], { bench: { w: 90, d: '2026-10-10' } })
    recordSession(s, finishSession(s, active([{ id: 'bench', sets: [set(80, 5)] }])).w)
    expect(s.exWeights.bench.w).toBe(90)
  })
})

describe('lowering a working weight on purpose (resetW)', () => {
  const st = () => ({ unit: 'kg', workouts: [], exWeights: { bench: { w: 900, d: '2026-10-01' } }, active: {} })
  it('only rises without the opt-in, even when a lower top weight is confirmed', () => {
    const s = st()
    const { w } = finishSession(s, active([{ id: 'bench', sets: [set(100, 5)], topW: 100 }]))
    recordSession(s, w)
    expect(s.exWeights.bench.w).toBe(900)
  })
  it('replaces a filed typo with the confirmed weight when opted in', () => {
    const s = st()
    const { w } = finishSession(s, active([{ id: 'bench', sets: [set(100, 5)], topW: 100, resetW: true }]))
    expect(w.entries[0].resetW).toBe(true)
    recordSession(s, w)
    expect(s.exWeights.bench).toEqual({ w: 100, d: '2026-10-16' })
  })
  it('does not store resetW on entries that did not ask for it', () => {
    const { w } = finishSession(st(), active([{ id: 'bench', sets: [set(100, 5)], topW: 100 }]))
    expect('resetW' in w.entries[0]).toBe(false)
  })
})
