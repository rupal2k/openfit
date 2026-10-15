import { describe, it, expect } from 'vitest'
import { dishFood } from './dishes.js'
import TABLE from '../../data/food101-foods.json'

describe('dishFood', () => {
  it('covers all 101 classifier labels with usable nutrition and a typical portion', () => {
    expect(Object.keys(TABLE)).toHaveLength(101)
    for (const [label, d] of Object.entries(TABLE)) {
      expect(d.per100.kcal, label).toBeGreaterThan(0)
      expect(d.portion, label).toBeGreaterThan(0)
    }
  })
  it('turns a label into an entry-ready food snapshot with the USDA source and portion', () => {
    expect(dishFood('samosa')).toEqual({
      src: 'food101', id: 'samosa', code: '', name: 'Samosa', brand: 'USDA: Samosa',
      serving: 75, servingUnit: 'g', approx: false, per100: { kcal: 310, p: 5.1, c: 33.2, f: 17.5 },
    })
  })
  it('marks approximate mappings so the review sheet can say so', () => {
    expect(dishFood('takoyaki').approx).toBe(true)
  })
  it('returns null for labels it does not know, and copies per100', () => {
    expect(dishFood('dal')).toBe(null)
    dishFood('pizza').per100.kcal = 0
    expect(TABLE.pizza.per100.kcal).toBeGreaterThan(0)
  })
})
