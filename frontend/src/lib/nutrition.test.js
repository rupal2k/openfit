import { describe, it, expect } from 'vitest'
import { tdee, targets, ageFrom, bodyKg } from './nutrition.js'

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
