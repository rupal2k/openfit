import { describe, it, expect } from 'vitest'
import { topK } from './topk.js'

describe('topK', () => {
  it('softmaxes logits and returns the k best labels, best first', () => {
    const r = topK([1, 3, 2, 0], { 0: 'a', 1: 'b', 2: 'c', 3: 'd' }, 3)
    expect(r.map(x => x.label)).toEqual(['b', 'c', 'a'])
    expect(r[0].score).toBeCloseTo(Math.exp(3) / (Math.exp(0) + Math.exp(1) + Math.exp(2) + Math.exp(3)), 6)
  })
  it('is numerically stable for large logits', () => {
    const r = topK(new Float32Array([1000, 999]), { 0: 'x', 1: 'y' }, 2)
    expect(r[0].score + r[1].score).toBeCloseTo(1, 6)
    expect(Number.isFinite(r[0].score)).toBe(true)
  })
})
