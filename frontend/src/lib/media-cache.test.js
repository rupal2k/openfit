import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./exercises.js', () => ({
  EXIDX: { a: { id: 'a', img: 'a.jpg', gif: 'a.gif' }, b: { id: 'b', img: 'b.jpg', gif: 'b.gif' }, c: { id: 'c' } },
  imgSrc: e => 'https://cdn.example/i/' + e.img, gifSrc: e => 'https://cdn.example/g/' + e.gif,
}))
import { saveMedia, routineExIds } from './media-cache.js'

const store = new Map()
beforeEach(() => {
  store.clear()
  globalThis.caches = { open: async () => ({ match: async u => store.get(u), put: async (u, r) => { store.set(u, r) } }) }
})

describe('offline exercise pictures', () => {
  it('saves picture + animation of planned exercises once, skips ones without media', async () => {
    const fetchFn = vi.fn(async () => new Response('x'))
    expect(await saveMedia(['a', 'b', 'a', 'c', 'nope'], fetchFn)).toBe(4)
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(await saveMedia(['a', 'b'], fetchFn)).toBe(0)       // already saved: no new downloads
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })
  it('offline or a failed download is retried next time, not an error', async () => {
    expect(await saveMedia(['a'], async () => { throw new TypeError('offline') })).toBe(0)
    expect(await saveMedia(['a'], async () => new Response('', { status: 404 }))).toBe(0)
    expect(store.size).toBe(0)
  })
  it('collects every routine exercise id', () => {
    expect(routineExIds({ routines: [{ ex: [{ id: 'a' }, { id: 'b' }] }, { ex: [{ id: 'a' }] }] })).toEqual(['a', 'b', 'a'])
  })
})
