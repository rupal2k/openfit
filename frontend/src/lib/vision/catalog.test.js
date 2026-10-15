import { describe, it, expect } from 'vitest'
import { MODELS, DEFAULT_MODEL, pickDevice, deviceFiles, downloadBytes, fileUrl, ineligibility } from './catalog.js'
import { VisionError, MESSAGES } from './errors.js'

const clf = MODELS['food101']

describe('vision catalog', () => {
  it('defaults to the Food-101 classifier chosen by the Task 1 spike', () => {
    expect(DEFAULT_MODEL).toBe('food101')
    expect(clf.task).toBe('image-classification')
  })
  it('pins every model to a full commit and every file to a sha256', () => {
    for (const m of Object.values(MODELS)) {
      expect(m.revision).toMatch(/^[0-9a-f]{40}$/)
      for (const f of Object.values(m.files)) {
        expect(f.sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(f.bytes).toBeGreaterThan(1e6)
      }
    }
  })
  it('selects the per-device ONNX file transformers.js will fetch', () => {
    expect(deviceFiles(clf, 'wasm').map(f => f.path)).toEqual(['onnx/model_int8.onnx'])
    expect(deviceFiles(clf, 'webgpu').map(f => f.path)).toEqual(['onnx/model_q4f16.onnx'])
  })
  it('totals the download including config overhead', () => {
    expect(downloadBytes(clf, 'wasm')).toBe(93297500 + clf.overhead)
    expect(downloadBytes(clf, 'webgpu')).toBe(52685075 + clf.overhead)
  })
  it('builds the exact resolve URL transformers.js caches under (confirmed in the spike)', () => {
    expect(fileUrl(clf, 'onnx/model_int8.onnx')).toBe(
      'https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX/resolve/e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8/onnx/model_int8.onnx')
  })
  it('prefers WebGPU only when an adapter exists', () => {
    expect(pickDevice(true)).toBe('webgpu')
    expect(pickDevice(false)).toBe('wasm')
  })
  it('flags devices that cannot hold or run the model (fud-ai LocalModelEligibility)', () => {
    const big = 1e12
    expect(ineligibility(clf, { deviceMemoryGb: 1, freeBytes: big })).toBe(null)
    expect(ineligibility(clf, { deviceMemoryGb: 0.5, freeBytes: big })).toBe('LOW_MEMORY')
    expect(ineligibility(clf, { deviceMemoryGb: undefined, freeBytes: big })).toBe(null)       // Safari: unknown → allow
    expect(ineligibility(clf, { deviceMemoryGb: 8, freeBytes: 300e6 })).toBe('NO_STORAGE')     // 93 MB + 256 MB reserve
    expect(ineligibility(clf, { deviceMemoryGb: 8, freeBytes: null })).toBe(null)
  })
  it('wraps failures in typed errors with user-facing messages', () => {
    const e = new VisionError('VERIFY', 'sha256 onnx/x.onnx')
    expect(e).toBeInstanceOf(Error)
    expect(e.kind).toBe('VERIFY')
    expect(e.message).toBe(MESSAGES.VERIFY)
    expect(e.detail).toBe('sha256 onnx/x.onnx')
  })
})
