import { describe, it, expect, vi } from 'vitest'
vi.mock('./i18n.js', () => ({ t: s => s }))
import { PLAN_TEMPLATES, PLAN_WHERE, instantiatePlan } from './starter.js'
import { EXIDX } from './exercises.js'
import { cleanRest } from './workout.js'
import { buildPlanBundle, parsePlan, mergePlan } from './plan-share.js'

const HOMEGYM = ['body weight', 'dumbbell', 'kettlebell', 'band', 'resistance band']
const KIT = { home: ['body weight'], homegym: HOMEGYM, intervals: HOMEGYM }

describe('plan templates', () => {
  it('every exercise id exists and every plan has a known place', () => {
    const places = PLAN_WHERE.map(([w]) => w)
    for (const p of PLAN_TEMPLATES) {
      expect(places).toContain(p.where)
      for (const r of p.routines) for (const [id] of r.ex) expect(EXIDX[id], `${p.id} ${id}`).toBeTruthy()
    }
  })
  it('home plans need only the kit they promise', () => {
    for (const p of PLAN_TEMPLATES.filter(p => KIT[p.where]))
      for (const r of p.routines) for (const [id] of r.ex) expect(KIT[p.where], `${p.id} ${EXIDX[id].n}`).toContain(EXIDX[id].eq)
  })
  it('timed holds, circuits and routine rest survive loading', () => {
    const hiit = instantiatePlan(PLAN_TEMPLATES.find(p => p.id === 'home-hiit-3'))
    const a = hiit.routines[0]
    expect(a.rest).toBe(60)
    expect(a.ex.every(e => e.mode === 'time' && e.sec === 40 && e.sets === 4)).toBe(true)
    expect(new Set(a.ex.map(e => e.sg)).size).toBe(1)
    expect(a.ex[0].sg).not.toBe(hiit.routines[1].ex[0].sg)
    const bw = instantiatePlan(PLAN_TEMPLATES.find(p => p.id === 'home-bw-3')).routines[0]
    expect(bw.ex[0]).toEqual({ id: '1685', sets: 3, reps: 15, weight: 0 })
    expect(bw.ex.some(e => e.sg)).toBe(false)
  })
  it('an add-on plan has no days, so it leaves the week alone', () => {
    const m = PLAN_TEMPLATES.find(p => p.id === 'home-mobility')
    expect(m.scheduleMap || m.scheduleDays).toBeFalsy()
    expect(instantiatePlan(m).week).toEqual({})
  })
})

describe('routine rest', () => {
  it('is bounded and 0 means the Settings value', () => {
    expect([cleanRest(15), cleanRest(1), cleanRest(9999), cleanRest('x'), cleanRest(0), cleanRest(-5)]).toEqual([15, 5, 600, 0, 0, 0])
  })
  it('travels in a shared plan and is cleaned on import', () => {
    const S = { unit: 'kg', week: {}, customEx: [], routines: [{ id: 'r1', name: 'M', emoji: 'stretch', rest: 15, ex: [{ id: '1604', sets: 2, mode: 'time', sec: 45 }] }] }
    const bundle = buildPlanBundle(S, 'x')
    expect(bundle.routines[0].rest).toBe(15)
    bundle.routines[0].rest = 100000
    const s = { unit: 'kg', week: {}, customEx: [], routines: [] }
    mergePlan(s, parsePlan(JSON.stringify(bundle)))
    expect(s.routines[0].rest).toBe(600)
  })
})

describe('one-side moves', () => {
  it('load as per-side rep work, reps counting both sides', () => {
    const b = instantiatePlan(PLAN_TEMPLATES.find(p => p.id === 'home-bw-3')).routines[0]
    expect(b.ex.find(e => e.id === '1460')).toMatchObject({ reps: 24, side: true })
  })
})

describe('interval formats', () => {
  const load = id => instantiatePlan(PLAN_TEMPLATES.find(p => p.id === id)).routines[0]
  it('Tabata: 4 blocks of two alternating 20 s moves, 10 s rest', () => {
    const r = load('tabata-express')
    expect(r).toMatchObject({ format: 'tabata', rest: 10 })
    const groups = [...new Set(r.ex.map(e => e.sg))]
    expect(groups).toHaveLength(4)
    expect(r.ex.every(e => e.mode === 'time' && e.sec === 20 && e.sets === 4)).toBe(true)
  })
  it('EMOM: one block of 60 s minutes, each with its rep target', () => {
    const r = load('emom-20')
    expect(r.format).toBe('emom')
    expect(new Set(r.ex.map(e => e.sg)).size).toBe(1)
    expect(r.ex[0]).toMatchObject({ mode: 'time', sec: 60, reps: 10, sets: 5 })
    expect(r.ex.reduce((n, e) => n + e.sets, 0)).toBe(20)
  })
  it('AMRAP: rep sets with a 15 min cap', () => {
    const r = load('amrap-15')
    expect(r).toMatchObject({ format: 'amrap', cap: 900 })
    expect(r.ex.every(e => !e.mode && e.reps > 0)).toBe(true)
  })
  it('interval plans leave the week alone', () => {
    for (const p of PLAN_TEMPLATES.filter(p => p.where === 'intervals')) expect(instantiatePlan(p).week).toEqual({})
  })
  it('format, cap and EMOM reps travel in a shared plan; junk is dropped on import', () => {
    const r = load('emom-20'), a = load('amrap-15')
    const bundle = buildPlanBundle({ week: {}, customEx: [], routines: [r, a] }, 'x')
    expect(bundle.routines[0].format).toBe('emom')
    expect(bundle.routines[0].ex[0].reps).toBe(10)
    bundle.routines[0].format = 'crossfit<script>'
    bundle.routines[1].cap = 99999
    const s = { unit: 'kg', week: {}, customEx: [], routines: [] }
    mergePlan(s, parsePlan(JSON.stringify(bundle)))
    expect(s.routines[0].format).toBeUndefined()
    expect(s.routines[1]).toMatchObject({ format: 'amrap', cap: 3600 })
  })
})
