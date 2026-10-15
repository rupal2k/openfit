import { describe, it, expect } from 'vitest'
import { sumProgress, markerKey } from './client.js'

describe('vision client helpers', () => {
  it('adds bytes across files so one bar covers the whole download', () => {
    expect(sumProgress({ a: { loaded: 10, total: 100 }, b: { loaded: 5, total: 50 } })).toEqual({ loaded: 15, total: 150 })
    expect(sumProgress({})).toEqual({ loaded: 0, total: 0 })
  })
  it('keys the verification marker by model and device (fud-ai marker file)', () => {
    expect(markerKey('food101', 'wasm')).toBe('openfit.vision.verified.food101.wasm')
  })
})
