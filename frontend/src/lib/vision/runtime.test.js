import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { verifiedFile, runtimeUrl } from './runtime.js'

const spec = data => ({ path: 'x.wasm', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') })
const digest = async (_alg, buf) => createHash('sha256').update(Buffer.from(buf)).digest()
const ok = data => async () => new Response(data)

describe('pinned ONNX runtime', () => {
  const good = Buffer.from('real runtime bytes')
  it('the build pinned a version and both files', () => {
    /* global __ORT_RUNTIME__ */
    expect(__ORT_RUNTIME__.version).toMatch(/^\d+\.\d+/)
    expect(__ORT_RUNTIME__.files.wasm.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(runtimeUrl(__ORT_RUNTIME__.files.mjs)).toContain('cdn.jsdelivr.net/npm/onnxruntime-web@' + __ORT_RUNTIME__.version + '/dist/')
  })
  it('accepts the exact file', async () => {
    const buf = await verifiedFile(spec(good), { fetchFn: ok(good), digest })
    expect(Buffer.from(buf).toString()).toBe('real runtime bytes')
  })
  it('refuses a tampered file of the same size, and a wrong size', async () => {
    const evil = Buffer.from('evil runtime bytes')
    await expect(verifiedFile(spec(good), { fetchFn: ok(evil), digest })).rejects.toMatchObject({ kind: 'VERIFY' })
    await expect(verifiedFile(spec(good), { fetchFn: ok(Buffer.from('short')), digest })).rejects.toMatchObject({ kind: 'VERIFY' })
  })
  it('network trouble is a download error, not a crash', async () => {
    await expect(verifiedFile(spec(good), { fetchFn: async () => { throw new TypeError('Failed to fetch') }, digest })).rejects.toMatchObject({ kind: 'DOWNLOAD' })
    await expect(verifiedFile(spec(good), { fetchFn: async () => new Response('', { status: 404 }), digest })).rejects.toMatchObject({ kind: 'DOWNLOAD' })
  })
})
