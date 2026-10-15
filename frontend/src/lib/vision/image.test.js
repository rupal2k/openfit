import { describe, it, expect } from 'vitest'
import { fitWithin } from './image.js'

describe('fitWithin', () => {
  it('scales the long edge to max and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 512)).toEqual({ w: 512, h: 384 })
    expect(fitWithin(3000, 4000, 512)).toEqual({ w: 384, h: 512 })
  })
  it('never upscales', () => {
    expect(fitWithin(300, 200, 512)).toEqual({ w: 300, h: 200 })
  })
})
