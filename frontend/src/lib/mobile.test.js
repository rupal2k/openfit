import { describe, it, expect } from 'vitest'
import { readOnce } from './mobile.js'

describe('readOnce', () => {
  it('reads the picked file exactly once and returns an in-memory copy with the same metadata', async () => {
    const src = new File([new Uint8Array([1, 2, 3, 4])], 'meal.jpg', { type: 'image/jpeg', lastModified: 42 })
    let reads = 0
    const picked = { name: src.name, type: src.type, lastModified: 42, size: 4, arrayBuffer: () => { reads++; return src.arrayBuffer() } }
    const copy = await readOnce(picked)
    expect(reads).toBe(1)
    expect([copy.name, copy.type, copy.lastModified, copy.size]).toEqual(['meal.jpg', 'image/jpeg', 42, 4])
    // the copy can be read again and again (the Android original can't)
    expect([...new Uint8Array(await copy.arrayBuffer())]).toEqual([1, 2, 3, 4])
    expect([...new Uint8Array(await copy.slice(1, 3).arrayBuffer())]).toEqual([2, 3])
  })
})
