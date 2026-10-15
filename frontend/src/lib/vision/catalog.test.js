import { describe, it, expect } from 'vitest'
import { MODELS, DEFAULT_MODEL, pickDevice, deviceFiles, downloadBytes, fileUrl, ineligibility } from './catalog.js'
import { VisionError, MESSAGES } from './errors.js'

const m256 = MODELS['smolvlm-256m']

describe('vision catalog', () => {
  it('pins every model to a full commit and every file to a sha256', () => {
    expect(MODELS[DEFAULT_MODEL]).toBeDefined()
    for (const m of Object.values(MODELS)) {
      expect(m.revision).toMatch(/^[0-9a-f]{40}$/)
      for (const f of Object.values(m.files)) {
        expect(f.sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(f.bytes).toBeGreaterThan(1e6)
      }
    }
  })
  it('selects the per-device ONNX files transformers.js will fetch', () => {
    expect(deviceFiles(m256, 'wasm').map(f => f.path)).toEqual([
      'onnx/embed_tokens_int8.onnx', 'onnx/vision_encoder_int8.onnx', 'onnx/decoder_model_merged_q4.onnx'])
    expect(deviceFiles(m256, 'webgpu').map(f => f.path)).toEqual([
      'onnx/embed_tokens_fp16.onnx', 'onnx/vision_encoder_q4.onnx', 'onnx/decoder_model_merged_q4.onnx'])
  })
  it('totals the download including tokenizer/config overhead', () => {
    expect(downloadBytes(m256, 'wasm')).toBe(28385824 + 94247927 + 86562901 + 4_400_000)
  })
  it('builds the exact resolve URL transformers.js caches under', () => {
    expect(fileUrl(m256, 'onnx/x.onnx')).toBe(
      'https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct/resolve/7e3e67edbbed1bf9888184d9df282b700a323964/onnx/x.onnx')
  })
  it('prefers WebGPU only when an adapter exists', () => {
    expect(pickDevice(true)).toBe('webgpu')
    expect(pickDevice(false)).toBe('wasm')
  })
  it('flags devices that cannot hold or run the model (fud-ai LocalModelEligibility)', () => {
    const big = 1e12
    expect(ineligibility(m256, { deviceMemoryGb: 4, freeBytes: big })).toBe(null)
    expect(ineligibility(MODELS['smolvlm-500m'], { deviceMemoryGb: 2, freeBytes: big })).toBe('LOW_MEMORY')
    expect(ineligibility(m256, { deviceMemoryGb: undefined, freeBytes: big })).toBe(null)       // Safari: unknown → allow
    expect(ineligibility(m256, { deviceMemoryGb: 8, freeBytes: 300e6 })).toBe('NO_STORAGE')     // 213 MB + 256 MB reserve
    expect(ineligibility(m256, { deviceMemoryGb: 8, freeBytes: null })).toBe(null)
  })
  it('wraps failures in typed errors with user-facing messages', () => {
    const e = new VisionError('VERIFY', 'sha256 onnx/x.onnx')
    expect(e).toBeInstanceOf(Error)
    expect(e.kind).toBe('VERIFY')
    expect(e.message).toBe(MESSAGES.VERIFY)
    expect(e.detail).toBe('sha256 onnx/x.onnx')
  })
})
