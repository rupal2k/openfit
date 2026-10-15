// On-device food recognition models — the OPENFIT counterpart of fud-ai's LocalModelCatalog
// (MIT): pinned commit, exact byte size and sha256 per file, license, memory floor.
// The Task 1 spike (docs/superpowers/notes/2026-10-15-photo-spike.md) rejected SmolVLM 256M/500M
// (3–5/10 dishes, no usable grams, 20–40 s); the Food-101 classifier won (6–7/10, ~2.5 s, 53–93 MB).
const RESERVE_MIN = 256e6            // fud-ai: max(256 MB, 10%) headroom over the download
// ONNX Runtime's wasm (ort-wasm-simd-threaded.asyncify.wasm), fetched once from jsDelivr by
// transformers.js and cached alongside the model — shown in the download size, not bundled.
export const RUNTIME_BYTES = 26_861_777

export const MODELS = {
  food101: {
    id: 'food101', label: 'Food-101 dish recognizer', task: 'image-classification',
    repo: 'onnx-community/swin-finetuned-food101-ONNX', revision: 'e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8',
    license: 'Apache-2.0', minMemoryGb: 1, overhead: 10_000,   // config.json + preprocessor_config.json
    dtype: { webgpu: { model: 'q4f16' }, wasm: { model: 'int8' } },
    files: {
      'onnx/model_q4f16.onnx': { bytes: 52685075, sha256: '10e79986b7a2c42ce421c9003ceaff966c1b9a0899abbb789952421d9a40c476' },
      'onnx/model_int8.onnx': { bytes: 93297500, sha256: 'e4ee9f777bd3c25c73e4822cd5a3f0442bf6f74bb7da2a301b4d0056208704e4' },
    },
  },
}
export const DEFAULT_MODEL = 'food101'

export const pickDevice = hasGpu => (hasGpu ? 'webgpu' : 'wasm')
const suffix = q => (q === 'fp32' ? '' : '_' + q)
export const deviceFiles = (m, device) => Object.entries(m.dtype[device])
  .map(([part, q]) => {
    const path = `onnx/${part}${suffix(q)}.onnx`
    return { path, ...m.files[path] }
  })
export const downloadBytes = (m, device) => deviceFiles(m, device).reduce((s, f) => s + f.bytes, 0) + m.overhead
export const fileUrl = (m, path) => `https://huggingface.co/${m.repo}/resolve/${m.revision}/${path}`

// navigator.deviceMemory is rounded down to a power of two and capped at 8 (6 GB phones report 4)
// undefined (Safari/Firefox) means "unknown" and is allowed, like a null memory floor in fud-ai.
export function ineligibility(m, { deviceMemoryGb, freeBytes }) {
  if (deviceMemoryGb != null && deviceMemoryGb < m.minMemoryGb) return 'LOW_MEMORY'
  const need = Math.max(downloadBytes(m, 'webgpu'), downloadBytes(m, 'wasm'))
  if (freeBytes != null && freeBytes < need + Math.max(RESERVE_MIN, need / 10)) return 'NO_STORAGE'
  return null
}
