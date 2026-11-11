// persist(): localStorage is written once per 300 ms burst, and at once when the app is hidden
// (performance audit 1.6.2: it used to stringify the whole state on every keystroke).
import { describe, it, expect, vi } from 'vitest'
const h = vi.hoisted(() => {
  const listeners = {}, mem = {}, writes = []
  globalThis.document = { addEventListener: (t, f) => { listeners[t] = f }, visibilityState: 'visible' }
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); if (k === 'gym_state_v1') writes.push(v) }, removeItem: k => { delete mem[k] } }
  return { listeners, mem, writes }
})
import { useStore } from './useStore.js'

describe('persist', () => {
  it('writes one burst of edits once, after 300 ms', async () => {
    vi.useFakeTimers()
    h.writes.length = 0
    for (let i = 0; i < 10; i++) useStore.getState().update(s => { s.restSec = 60 + i })
    expect(h.writes).toHaveLength(0)
    vi.advanceTimersByTime(300)
    expect(h.writes).toHaveLength(1)
    expect(JSON.parse(h.writes[0]).restSec).toBe(69)
    vi.useRealTimers()
  })
  it('writes at once when the app is hidden', () => {
    vi.useFakeTimers()
    h.writes.length = 0
    useStore.getState().update(s => { s.restSec = 120 })
    globalThis.document.visibilityState = 'hidden'
    h.listeners.visibilitychange()
    expect(h.writes).toHaveLength(1)
    expect(JSON.parse(h.writes[0]).restSec).toBe(120)
    globalThis.document.visibilityState = 'visible'
    vi.useRealTimers()
  })
})
