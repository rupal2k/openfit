import { describe, it, expect } from 'vitest'
import { matchFoods } from './match.js'

const FOODS = [
  { id: 'rice-white-cooked', name: 'Rice, white, cooked', aka: ['rice', 'chawal', 'steamed rice'], per100: { kcal: 130, p: 2.7, c: 28.2, f: 0.3 } },
  { id: 'egg-boiled', name: 'Egg, hard-boiled', aka: ['egg', 'boiled egg'], per100: { kcal: 155, p: 12.6, c: 1.1, f: 10.6 } },
  { id: 'tomato-raw', name: 'Tomato, raw', aka: ['tomato'], per100: { kcal: 18, p: 0.9, c: 3.9, f: 0.2 } },
  { id: 'chicken-curry', name: 'Chicken curry', aka: ['butter chicken', 'chicken masala'], per100: { kcal: 150, p: 14, c: 5, f: 8 } },
]

describe('matchFoods', () => {
  it('matches plurals and aliases to an entry-ready snapshot', () => {
    expect(matchFoods('2 boiled eggs', FOODS)[0]).toEqual({ src: 'generic', id: 'egg-boiled', code: '', name: 'Egg, hard-boiled',
      brand: '', serving: null, servingUnit: 'g', per100: { kcal: 155, p: 12.6, c: 1.1, f: 10.6 } })
    expect(matchFoods('tomatoes', FOODS)[0].id).toBe('tomato-raw')
    expect(matchFoods('chawal', FOODS)[0].id).toBe('rice-white-cooked')
  })
  it('ranks the closest food first and caps the list', () => {
    expect(matchFoods('chicken curry with rice', FOODS, 2).map(x => x.id)).toEqual(['chicken-curry', 'rice-white-cooked'])
  })
  it('returns [] when nothing is close', () => {
    expect(matchFoods('mystery', FOODS)).toEqual([])
    expect(matchFoods('', FOODS)).toEqual([])
  })
  it('copies per100 so edits never leak into the table', () => {
    matchFoods('egg', FOODS)[0].per100.kcal = 0
    expect(FOODS[1].per100.kcal).toBe(155)
  })
})

import REAL from '../../data/generic-foods.json'
it('the generated table resolves common Indian and Western dishes', () => {
  for (const q of ['rice', 'dal', 'roti', 'boiled egg', 'banana', 'chicken curry', 'pizza', 'chai'])
    expect(matchFoods(q, REAL).length, q).toBeGreaterThan(0)
})
