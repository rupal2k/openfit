// The on-device runtime — OPENFIT's LocalGemmaRuntime. One worker = one loaded model.
// Model files are fetched HERE: in the APK, CapacitorHttp patches window.fetch and would push the
// download through the native bridge as base64; a worker's fetch is untouched, and Hugging Face
// allows CORS. Like fud-ai, a GPU init failure is reported so the client can fall back to CPU.
import { AutoImageProcessor, AutoModelForImageClassification, RawImage, env } from '@huggingface/transformers'
import { MODELS, deviceFiles, fileUrl } from './catalog.js'
import { verifyBuffer } from './verify.js'
import { topK } from './topk.js'

env.allowLocalModels = false
// Offline, transformers.js still probes optional files it never cached (online they 404 and are
// skipped). Report a network failure as that same 404 so an installed model loads from the
// cache with no connection; a missing *required* file still fails, as a download error.
env.fetch = async (url, init) => {
  try { return await fetch(url, init) } catch { return new Response(null, { status: 404, statusText: 'offline' }) }
}
let cur = null

const fail = (kind, message) => Object.assign(new Error(message), { kind })
const NETWORK = /fetch|network|HTTP|404|Failed to load|Could not locate/i

async function load(id, device, rid) {
  if (cur && cur.id === id && cur.device === device) return cur
  const m = MODELS[id]
  const progress_callback = p => {
    if (p.status === 'progress') postMessage({ rid, type: 'progress', file: p.file, loaded: p.loaded, total: p.total })
  }
  // Not pipeline(): it discovers a model's files by asking the network about the `main` branch,
  // ignoring `revision`, so offline it concludes there is no preprocessor. Loading the two pieces
  // directly keeps every request on the pinned commit — and in the cache.
  let run
  try {
    const opts = { revision: m.revision, progress_callback }
    const processor = await AutoImageProcessor.from_pretrained(m.repo, opts)
    const model = await AutoModelForImageClassification.from_pretrained(m.repo, { ...opts, device, dtype: m.dtype[device].model })
    run = async img => topK((await model(await processor(img))).logits.data, model.config.id2label, 3)
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
  return run(img)
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
