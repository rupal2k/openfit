// English steps live in a lazy pack now (performance audit 1.6.2); every exercise keeps them.
import { describe, it, expect } from 'vitest'
import { EXDB } from './exercises-data.js'
import en from '../instr/en.js'

describe('instruction packs', () => {
  it('the dataset no longer carries the steps inline', () => expect(EXDB.some(e => 'st' in e)).toBe(false))
  it('every exercise has English steps in instr/en.js', () => {
    const missing = EXDB.filter(e => !Array.isArray(en[e.id]) || !en[e.id].length).map(e => e.id)
    expect(missing).toEqual([])
  })
})
