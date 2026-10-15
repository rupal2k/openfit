// Fallback candidate from the plan: Food-101 classifier (dish label only, no grams).
import { pipeline } from '@huggingface/transformers'
const REPO = 'onnx-community/swin-finetuned-food101-ONNX', REV = 'e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8'
const o = document.getElementById('o'), log = s => (o.textContent += '\n' + s)
const gpu = !!(navigator.gpu && (await navigator.gpu.requestAdapter().catch(() => null)))
o.textContent = `webgpu: ${gpu}`
document.getElementById('f').onchange = async e => {
  const device = gpu && !document.getElementById('cpu').checked ? 'webgpu' : 'wasm'
  let t0 = performance.now()
  const clf = await pipeline('image-classification', REPO, { revision: REV, device, dtype: device === 'webgpu' ? 'q4f16' : 'int8' })
  log(`loaded on ${device} in ${((performance.now() - t0) / 1000).toFixed(1)} s`)
  for (const file of e.target.files) {
    t0 = performance.now()
    const top = await clf(URL.createObjectURL(file), { top_k: 3 })
    log(`--- ${file.name} · ${((performance.now() - t0) / 1000).toFixed(2)} s · ` + top.map(x => `${x.label} ${(x.score * 100).toFixed(0)}%`).join(', '))
  }
  log('DONE')
}
