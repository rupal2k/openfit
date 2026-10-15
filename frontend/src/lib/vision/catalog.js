// On-device food recognition models — the OPENFIT counterpart of fud-ai's LocalModelCatalog
// (MIT): pinned commit, exact byte size and sha256 per file, license, memory floor.
const SMOL_DTYPE = {
  webgpu: { embed_tokens: 'fp16', vision_encoder: 'q4', decoder_model_merged: 'q4' },
  wasm: { embed_tokens: 'int8', vision_encoder: 'int8', decoder_model_merged: 'q4' },
}
const OVERHEAD = 4_400_000          // tokenizer.json, vocab.json, configs (same for both sizes)
const RESERVE_MIN = 256e6            // fud-ai: max(256 MB, 10%) headroom over the download

export const MODELS = {
  'smolvlm-256m': {
    id: 'smolvlm-256m', label: 'Fast · SmolVLM 256M', repo: 'HuggingFaceTB/SmolVLM-256M-Instruct',
    revision: '7e3e67edbbed1bf9888184d9df282b700a323964', license: 'Apache-2.0', minMemoryGb: 2, dtype: SMOL_DTYPE,
    files: {
      'onnx/decoder_model_merged_q4.onnx': { bytes: 86562901, sha256: 'e3fd81130e30715580cf148398e48e2925b6219bff75e17d2a77add35a363f65' },
      'onnx/embed_tokens_fp16.onnx': { bytes: 56770946, sha256: '019af59078b8e4775216dd278c66574c39bfefa36cab68573db64d7ac7a11691' },
      'onnx/embed_tokens_int8.onnx': { bytes: 28385824, sha256: '4b919b829fe2bf225e42431230c56891116f0149e5170e36c99bcc0cfae0d2ef' },
      'onnx/vision_encoder_int8.onnx': { bytes: 94247927, sha256: 'd534ab668d3563e6d1d809bbbf1ff18308ded48651178614dbcc4a1de13d16f7' },
      'onnx/vision_encoder_q4.onnx': { bytes: 63784987, sha256: '95814e6629ec465e7cf98a44edcee67abc06d41faa0d1acc410cf8a956cab488' },
    },
  },
  'smolvlm-500m': {
    id: 'smolvlm-500m', label: 'Better · SmolVLM 500M', repo: 'HuggingFaceTB/SmolVLM-500M-Instruct',
    revision: 'a7da5b986cb59b408707209984f360a5f4ad7e47', license: 'Apache-2.0', minMemoryGb: 4, dtype: SMOL_DTYPE,
    files: {
      'onnx/decoder_model_merged_q4.onnx': { bytes: 229119140, sha256: '6d64c0fdce1c3515c40a08ff8e398bfbc0b2e961ae46d1b84b91e6a7b269b9d1' },
      'onnx/embed_tokens_fp16.onnx': { bytes: 94617986, sha256: '6b5f8cb6f78f90182bb60a3df22e9c47c93dc771d8d8172cce1f653f8da8a746' },
      'onnx/embed_tokens_int8.onnx': { bytes: 47309344, sha256: 'f5f14887bf9b756d9fff2e412d474f0b5403e91f33b23460c9411f0ca54d945b' },
      'onnx/vision_encoder_int8.onnx': { bytes: 98966519, sha256: '50b814aa048a996bf5d5128a16c19046371a9a1aae24b930672f550af6c43646' },
      'onnx/vision_encoder_q4.onnx': { bytes: 66734107, sha256: '179812d5b1315edbe3e7164ea3d847c52723692e83ac9c770a5234962663fcad' },
    },
  },
}
export const DEFAULT_MODEL = 'smolvlm-256m'   // ← set from the Task 1 decision

export const pickDevice = hasGpu => (hasGpu ? 'webgpu' : 'wasm')
const suffix = q => (q === 'fp32' ? '' : '_' + q)
export const deviceFiles = (m, device) => Object.entries(m.dtype[device])
  .map(([part, q]) => {
    const path = `onnx/${part}${suffix(q)}.onnx`
    return { path, ...m.files[path] }
  })
export const downloadBytes = (m, device) => deviceFiles(m, device).reduce((s, f) => s + f.bytes, 0) + OVERHEAD
export const fileUrl = (m, path) => `https://huggingface.co/${m.repo}/resolve/${m.revision}/${path}`

// navigator.deviceMemory is rounded down to a power of two and capped at 8 (6 GB phones report 4)
// undefined (Safari/Firefox) means "unknown" and is allowed, like a null memory floor in fud-ai.
export function ineligibility(m, { deviceMemoryGb, freeBytes }) {
  if (deviceMemoryGb != null && deviceMemoryGb < m.minMemoryGb) return 'LOW_MEMORY'
  const need = downloadBytes(m, 'webgpu') > downloadBytes(m, 'wasm') ? downloadBytes(m, 'webgpu') : downloadBytes(m, 'wasm')
  if (freeBytes != null && freeBytes < need + Math.max(RESERVE_MIN, need / 10)) return 'NO_STORAGE'
  return null
}
