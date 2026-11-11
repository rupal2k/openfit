// pushState runs one upload at a time (correctness audit 1.6.2): an overlapping save must wait
// and then go out on the new base, not race the first with the old base.
import { describe, it, expect, vi } from 'vitest'
vi.hoisted(() => {
  globalThis.document ??= { addEventListener() {}, visibilityState: 'visible' }
  const mem = {}
  globalThis.localStorage ??= { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } }
})
const calls = []
let release
vi.mock('../lib/api.js', () => ({
  api: vi.fn((path, opts) => {
    const body = JSON.parse(opts.body)
    calls.push(body.base)
    // the first PUT stays in flight until the test releases it
    if (calls.length === 1) return new Promise(res => { release = () => res({ ts: 111 }) })
    return Promise.resolve({ ts: 222 })
  }),
  webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false
}))
import { useStore } from './useStore.js'

describe('pushState', () => {
  it('queues a save requested while one is in flight and sends it on the new base', async () => {
    useStore.setState({ user: { id: 'u', name: 'x' } })
    localStorage.setItem('gym_base', '100')
    const a = useStore.getState().pushState()
    const b = useStore.getState().pushState()     // requested while the first is in flight
    expect(calls).toEqual([100])                  // the second did not start yet
    release()
    await a; await b
    expect(calls).toEqual([100, 111])             // then it went out on the base the first returned
    expect(localStorage.getItem('gym_base')).toBe('222')
  })
})
