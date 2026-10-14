import { describe, it, expect } from 'vitest'
import { normalizeOFF } from './off.js'

describe('normalizeOFF', () => {
  it('maps a search hit (brands as array)', () => {
    const hit = { code: '0894700010137', product_name: 'Nonfat Greek Yogurt ', brands: ['Chobani', 'X'], serving_quantity: '170',
      nutriments: { 'energy-kcal_100g': 52.9, proteins_100g: 9.41, carbohydrates_100g: 3.53, fat_100g: 0 } }
    expect(normalizeOFF(hit)).toEqual({ src: 'off', code: '0894700010137', name: 'Nonfat Greek Yogurt', brand: 'Chobani',
      serving: 170, per100: { kcal: 52.9, p: 9.41, c: 3.53, f: 0 } })
  })
  it('maps a v2 product (brands as comma string), missing macros → 0, no serving → null', () => {
    const p = { code: '3017624010701', product_name: 'Nutella', brands: 'Ferrero, Nutella', nutriments: { 'energy-kcal_100g': 539 } }
    expect(normalizeOFF(p)).toMatchObject({ brand: 'Ferrero', serving: null, per100: { kcal: 539, p: 0, c: 0, f: 0 } })
  })
  it('falls back to kJ when kcal is missing', () => {
    expect(normalizeOFF({ code: '1', product_name: 'A', nutriments: { energy_100g: 2255 } }).per100.kcal).toBe(539)
  })
  it('uses product_name_en when product_name is empty', () => {
    expect(normalizeOFF({ code: '1', product_name: '', product_name_en: 'Oats', nutriments: { 'energy-kcal_100g': 379 } }).name).toBe('Oats')
  })
  it('rejects products without a name or energy', () => {
    expect(normalizeOFF({ code: '1', product_name: 'A', nutriments: {} })).toBeNull()
    expect(normalizeOFF({ code: '1', nutriments: { 'energy-kcal_100g': 10 } })).toBeNull()
    expect(normalizeOFF(null)).toBeNull()
  })
  it('rejects implausible energy (>900 kcal/100g or negative) and negative macros', () => {
    expect(normalizeOFF({ code: '1', product_name: 'Super Fat', nutriments: { 'energy-kcal_100g': 901 } })).toBeNull()
    expect(normalizeOFF({ code: '1', product_name: 'Bad Kcal', nutriments: { 'energy-kcal_100g': -5 } })).toBeNull()
    expect(normalizeOFF({ code: '1', product_name: 'Negative Protein', nutriments: { 'energy-kcal_100g': 100, proteins_100g: -2 } })).toBeNull()
    expect(normalizeOFF({ code: '1', product_name: 'Negative Carb', nutriments: { 'energy-kcal_100g': 100, carbohydrates_100g: -1 } })).toBeNull()
    expect(normalizeOFF({ code: '1', product_name: 'Negative Fat', nutriments: { 'energy-kcal_100g': 100, fat_100g: -0.5 } })).toBeNull()
  })
})
