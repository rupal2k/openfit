import { describe, it, expect } from 'vitest'
import { analyzeDish, UNSURE } from './analyzer.js'

describe('analyzeDish', () => {
  it('maps the top-3 labels to foods, best first, and pre-fills the typical portion', async () => {
    let seen
    const classify = async img => { seen = img; return [{ label: 'samosa', score: 0.87 }, { label: 'gyoza', score: 0.12 }, { label: 'dumplings', score: 0.01 }] }
    const r = await analyzeDish({ image: 'IMG' }, { classify })
    expect(seen).toBe('IMG')
    expect(r.options.map(o => [o.food.id, o.score])).toEqual([['samosa', 0.87], ['gyoza', 0.12], ['dumplings', 0.01]])
    expect(r.pick).toBe(0)
    expect(r.g).toBe(75)              // FNDDS "quantity not specified" for samosa
    expect(r.unsure).toBe(false)
  })
  it('flags low-confidence results so the UI asks the user to check', async () => {
    const r = await analyzeDish({ image: 'IMG' }, { classify: async () => [{ label: 'chicken_curry', score: 0.23 }, { label: 'fried_rice', score: 0.21 }] })
    expect(r.unsure).toBe(true)
    expect(UNSURE).toBe(0.5)
  })
  it('drops labels without nutrition and returns no options when nothing is usable', async () => {
    const r = await analyzeDish({ image: 'IMG' }, { classify: async () => [{ label: 'not_a_dish', score: 0.9 }] })
    expect(r.options).toEqual([])
    expect(r.g).toBe(0)
  })
})
