import { describe, it, expect } from 'vitest'
import { nextInRound } from './history.js'

const E = (...counts) => counts.map(n => ({ sets: Array.from({ length: n }, () => ({ done: false })) }))

describe('nextInRound: a circuit goes set 1 of each, then set 2 of each', () => {
  it('moves to the next exercise, then wraps to the next round', () => {
    const en = E(2, 2, 2), u = [0, 1, 2]
    expect(nextInRound(en, u, 0, 0)).toEqual({ idx: 1, i: 0 })
    expect(nextInRound(en, u, 2, 0)).toEqual({ idx: 0, i: 1 })
    expect(nextInRound(en, u, 2, 1)).toBe(null)
  })
  it('skips sets already done and exercises with fewer sets', () => {
    const en = E(3, 1, 3), u = [0, 1, 2]
    en[2].sets[0].done = true
    expect(nextInRound(en, u, 1, 0)).toEqual({ idx: 0, i: 1 })
    expect(nextInRound(en, u, 0, 1)).toEqual({ idx: 2, i: 1 })
  })
  it('a single exercise (Tabata) just goes to its next set', () => {
    const en = E(8)
    expect(nextInRound(en, [0], 0, 3)).toEqual({ idx: 0, i: 4 })
    expect(nextInRound(en, [0], 0, 7)).toBe(null)
  })
  it('only looks inside its own unit', () => {
    const en = E(1, 1, 1)
    expect(nextInRound(en, [1], 1, 0)).toBe(null)
  })
})

import { restAfter, chains, cleanCap, cleanFormat } from './history.js'
describe('format rules', () => {
  it('rest: standard after the round, Tabata after every interval, EMOM and AMRAP never', () => {
    expect([restAfter('', false, false), restAfter('', true, false), restAfter('', true, true)]).toEqual([false, true, false])
    expect([restAfter('tabata', false, false), restAfter('tabata', true, true)]).toEqual([true, false])
    expect([restAfter('emom', true, false), restAfter('amrap', true, false)]).toEqual([false, false])
  })
  it('chaining: circuits, and Tabata/EMOM even for one exercise; never a lone standard hold', () => {
    expect([chains('', 1), chains('', 2), chains('tabata', 1), chains('emom', 1)]).toEqual([false, true, true, true])
  })
  it('cleans format and cap', () => {
    expect([cleanFormat('emom'), cleanFormat('x'), cleanFormat(undefined)]).toEqual(['emom', '', ''])
    expect([cleanCap(900), cleanCap(5), cleanCap(1e9), cleanCap('x')]).toEqual([900, 60, 3600, 0])
  })
})

import { buildSets } from './history.js'
describe('a hold stopped early does not become the next target', () => {
  const S = w => ({ exWeights: {}, workouts: [w], unit: 'kg' })
  const cfg = { id: '3665', sets: 2, mode: 'time', sec: 40 }
  it('early: back to the plan; full holds still carry over', () => {
    const early = S({ d: '2026-11-10', entries: [{ id: '3665', sets: [{ sec: 4, early: true, done: true }, { sec: 45, done: true }] }] })
    expect(buildSets(early, cfg).map(s => s.sec)).toEqual([40, 45])
  })
})
