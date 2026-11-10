import { describe, it, expect, vi } from 'vitest'
vi.mock('./i18n.js', () => ({ t: s => s }))
import { PLAN_TEMPLATES, PLAN_WHERE, instantiatePlan } from './starter.js'
import { EXIDX } from './exercises.js'
import { cleanRest } from './workout.js'
import { buildPlanBundle, parsePlan, mergePlan } from './plan-share.js'

const KIT = { home: ['body weight'], homegym: ['body weight', 'dumbbell', 'kettlebell', 'band', 'resistance band'] }

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
