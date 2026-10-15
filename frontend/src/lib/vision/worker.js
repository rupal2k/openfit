// The on-device runtime — OPENFIT's LocalGemmaRuntime. One worker = one loaded model.
// Model files are fetched HERE: in the APK, CapacitorHttp patches window.fetch and would push the
// download through the native bridge as base64; a worker's fetch is untouched, and Hugging Face
// allows CORS. Like fud-ai, a GPU init failure is reported so the client can fall back to CPU.
import { pipeline, RawImage, env } from '@huggingface/transformers'
import { MODELS, deviceFiles, fileUrl } from './catalog.js'
import { verifyBuffer } from './verify.js'

env.allowLocalModels = false
let cur = null

const fail = (kind, message) => Object.assign(new Error(message), { kind })
const NETWORK = /fetch|network|HTTP|404|Failed to load|Could not locate/i

async function load(id, device, rid) {
  if (cur && cur.id === id && cur.device === device) return cur
  const m = MODELS[id]
  const progress_callback = p => {
    if (p.status === 'progress') postMessage({ rid, type: 'progress', file: p.file, loaded: p.loaded, total: p.total })
  }
  let run
  try {
    run = await pipeline(m.task, m.repo, { revision: m.revision, device, dtype: m.dtype[device].model, progress_callback })
  } catch (e) {
    const msg = String(e?.message || e)
    throw fail(device === 'webgpu' && !NETWORK.test(msg) ? 'GPU_INIT' : 'DOWNLOAD', msg)
  }
  cur = { id, device, run }
  return cur
}

async function verify(id, device) {
  const m = MODELS[id]
  const c = await caches.open('transformers-cache')
  for (const f of deviceFiles(m, device)) {
    const r = await c.match(fileUrl(m, f.path))
    if (!r) throw fail('VERIFY', 'missing ' + f.path)
    try { await verifyBuffer(await r.arrayBuffer(), f) } catch (e) { throw fail('VERIFY', e.detail || e.message) }
  }
}

async function classify(id, device, image, rid) {
  const { run } = await load(id, device, rid)
  let img
  try { img = await RawImage.fromBlob(image) } catch (e) { throw fail('IMAGE', String(e?.message || e)) }
  return (await run(img, { top_k: 3 })).map(x => ({ label: x.label, score: x.score }))
}

self.onmessage = async ({ data }) => {
  const { rid, type, id, device } = data
  try {
    if (type === 'load') await load(id, device, rid)
    if (type === 'verify') await verify(id, device)
    const top = type === 'classify' ? await classify(id, device, data.image, rid) : undefined
    postMessage({ rid, type: 'ok', top })
  } catch (e) {
    postMessage({ rid, type: 'error', kind: e.kind || 'DOWNLOAD', message: String(e?.message || e) })
  }
}
