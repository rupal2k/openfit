import { describe, it, expect } from 'vitest'
import { verifyBuffer, toHex } from './verify.js'

const buf = new TextEncoder().encode('openfit').buffer
const SHA = '0b6b1e7c1b3c0bd5d9a1cbf0b5e0e5bb3f7c2f9d5a6a3d0a5c1f0e3a7b2d4c6e'

describe('verifyBuffer (fud-ai downloadVerified rule)', () => {
  it('passes when size and sha256 match', async () => {
    const real = toHex(await crypto.subtle.digest('SHA-256', buf))
    await expect(verifyBuffer(buf, { path: 'f', bytes: 7, sha256: real })).resolves.toBeUndefined()
  })
  it('rejects a size mismatch before hashing', async () => {
    let hashed = false
    const digest = async () => {
      hashed = true
      return new ArrayBuffer(32)
    }
    await expect(verifyBuffer(buf, { path: 'f', bytes: 8, sha256: SHA }, digest)).rejects.toMatchObject({ kind: 'VERIFY' })
    expect(hashed).toBe(false)
  })
  it('rejects a hash mismatch', async () => {
    await expect(verifyBuffer(buf, { path: 'f', bytes: 7, sha256: '0'.repeat(64) })).rejects.toMatchObject({ kind: 'VERIFY', detail: 'sha256 f' })
  })
})
