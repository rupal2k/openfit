import { describe, it, expect } from 'vitest'
import { tdee, targets, ageFrom, bodyKg, entryTotals, dayTotals, addEntry, updateEntry, removeEntry, recentFoods } from './nutrition.js'

const NOW = new Date('2026-06-01T12:00:00')
const S = (over = {}) => ({
  unit: 'kg',
  bodyweight: [{ d: '2026-05-30', w: 80 }],
  nutrition: { profile: { sex: 'male', birthYear: 1996, heightCm: 180, pal: 'active', goal: 'maintain', kcal: null }, days: {}, foods: [] },
  ...over
})

describe('tdee (IOM 2005, ported from OpenNutriTracker)', () => {
  it('matches hand-computed values', () => {
    expect(tdee({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, pal: 'active' })).toBeCloseTo(3164.978, 2)
    expect(tdee({ sex: 'female', age: 30, heightCm: 165, weightKg: 60, pal: 'low' })).toBeCloseTo(2156.037, 2)
    expect(tdee({ sex: 'male', age: 40, heightCm: 175, weightKg: 70, pal: 'sedentary' })).toBeCloseTo(2349.45, 2)
  })
  it('averages both equations for sex "other"', () => {
    expect(tdee({ sex: 'other', age: 30, heightCm: 180, weightKg: 80, pal: 'active' })).toBeCloseTo(2975.239, 2)
  })
})

describe('ageFrom / bodyKg', () => {
  it('derives age from birth year', () => { expect(ageFrom(1996, NOW)).toBe(30) })
  it('reads the latest weigh-in and converts lb', () => {
    expect(bodyKg(S())).toBe(80)
    expect(bodyKg(S({ unit: 'lb', bodyweight: [{ d: 'x', w: 176.37 }] }))).toBeCloseTo(80, 3)
    expect(bodyKg(S({ bodyweight: [] }))).toBeNull()
  })
})

describe('targets', () => {
  it('maintain: TDEE, 1.6 g/kg protein, 25 % fat, carbs remainder', () => {
    expect(targets(S(), NOW)).toEqual({ kcal: 3165, protein: 128, carbs: 465, fat: 88 })
  })
  it('lose subtracts 500 kcal', () => {
    const s = S(); s.nutrition.profile.goal = 'lose'
    expect(targets(s, NOW)).toEqual({ kcal: 2665, protein: 128, carbs: 372, fat: 74 })
  })
  it('manual kcal override skips the formula', () => {
    const s = S(); s.nutrition.profile.kcal = 2000
    expect(targets(s, NOW)).toEqual({ kcal: 2000, protein: 128, carbs: 246, fat: 56 })
  })
  it('override without any weigh-in falls back to 25 % protein', () => {
    const s = S({ bodyweight: [] }); s.nutrition.profile.kcal = 2000
    expect(targets(s, NOW)).toEqual({ kcal: 2000, protein: 125, carbs: 249, fat: 56 })
  })
  it('returns null when it cannot compute honestly', () => {
    expect(targets(S({ nutrition: { profile: null, days: {}, foods: [] } }), NOW)).toBeNull()
    expect(targets(S({ bodyweight: [] }), NOW)).toBeNull()
    const s = S(); s.nutrition.profile.heightCm = null
    expect(targets(s, NOW)).toBeNull()
  })
})

const YOG = { src: 'off', code: '0894700010137', name: 'Nonfat Greek Yogurt', brand: 'Chobani', serving: 170, per100: { kcal: 52.9, p: 9.41, c: 3.53, f: 0 } }
const OAT = { src: 'custom', id: 'c1', code: '', name: 'Oats', brand: '', serving: null, per100: { kcal: 379, p: 13.2, c: 67.7, f: 6.5 } }
const blank = () => ({ nutrition: { profile: null, days: {}, foods: [] } })

describe('entry/day totals', () => {
  it('scales per-100 g values by grams', () => {
    expect(entryTotals({ g: 170, food: YOG })).toEqual({ kcal: 89.9, p: 16, c: 6, f: 0 })
  })
  it('sums a day, empty day is zero', () => {
    expect(dayTotals([{ g: 170, food: YOG }, { g: 50, food: OAT }])).toEqual({ kcal: 279.4, p: 22.6, c: 39.9, f: 3.3 })
    expect(dayTotals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
    expect(dayTotals(undefined)).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
  })
})

describe('diary mutators', () => {
  it('adds, updates and removes entries; empty days disappear', () => {
    const S = blank()
    const e = addEntry(S, '2026-06-01', { meal: 'breakfast', g: 170, food: YOG })
    expect(e.id).toBeTruthy()
    expect(typeof e.t).toBe('number')
    expect(S.nutrition.days['2026-06-01']).toHaveLength(1)
    updateEntry(S, '2026-06-01', e.id, { g: 200, meal: 'snack' })
    expect(S.nutrition.days['2026-06-01'][0]).toMatchObject({ g: 200, meal: 'snack' })
    removeEntry(S, '2026-06-01', e.id)
    expect(S.nutrition.days['2026-06-01']).toBeUndefined()
  })
  it('snapshots the food so later edits to the source do not rewrite history', () => {
    const S = blank()
    const src = structuredClone(OAT)
    addEntry(S, '2026-06-01', { meal: 'lunch', g: 50, food: src })
    src.per100.kcal = 1
    expect(S.nutrition.days['2026-06-01'][0].food.per100.kcal).toBe(379)
  })
  it('recentFoods: newest first, de-duplicated', () => {
    const S = blank()
    S.nutrition.days = {
      '2026-05-30': [{ id: 'a', meal: 'lunch', g: 50, t: 1, food: OAT }],
      '2026-06-01': [{ id: 'b', meal: 'breakfast', g: 170, t: 3, food: YOG }, { id: 'c', meal: 'snack', g: 40, t: 2, food: OAT }]
    }
    expect(recentFoods(S).map(f => f.name)).toEqual(['Nonfat Greek Yogurt', 'Oats'])
    expect(recentFoods(S, 1)).toHaveLength(1)
  })
})
