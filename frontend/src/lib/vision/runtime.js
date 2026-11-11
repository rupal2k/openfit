// ONNX Runtime's code for the food model (a 50 KB JS loader + a 27 MB wasm) is too big to ship
// in the APK, so it comes from jsDelivr like transformers.js does — but pinned: the build
// records each file's size and SHA-256 from node_modules (vite.config.js → __ORT_RUNTIME__),
// and nothing runs until the download matches. Verified copies are cached and re-checked on
// every load, so a poisoned cache can't slip in later. A mismatch fails the load; there is no
// fallback to the unverified CDN copy.
import { verifyBuffer } from './verify.js'
import { VisionError } from './errors.js'

/* global __ORT_RUNTIME__ */
const R = __ORT_RUNTIME__
export const runtimeUrl = spec => `https://cdn.jsdelivr.net/npm/onnxruntime-web@${R.version}/dist/${spec.path}`
const CACHE = 'openfit-ort-' + R.version

async function openCache() {
  try { return typeof caches !== 'undefined' ? await caches.open(CACHE) : null } catch { return null }
}

export async function verifiedFile(spec, { fetchFn = fetch, digest } = {}) {
  const url = runtimeUrl(spec), cache = await openCache()
  const hit = cache && await cache.match(url).catch(() => null)
  if (hit) {
    const buf = await hit.arrayBuffer()
    try { await verifyBuffer(buf, spec, digest); return buf } catch { await cache.delete(url).catch(() => {}) }
  }
  let res
  try { res = await fetchFn(url) } catch (e) { throw new VisionError('DOWNLOAD', String(e?.message || e)) }
  if (!res.ok) throw new VisionError('DOWNLOAD', `${res.status} ${spec.path}`)
  const buf = await res.arrayBuffer()
  await verifyBuffer(buf, spec, digest)                     // throws VERIFY on a mismatch
  if (cache) await cache.put(url, new Response(buf.slice(0))).catch(() => {})
  return buf
}

// Point onnxruntime at verified in-memory copies. transformers.js sees blob URLs and leaves them.
let ready = null
export function pinRuntime(onnxEnv, opts) {
  ready ??= (async () => {
    const [mjs, wasm] = await Promise.all([verifiedFile(R.files.mjs, opts), verifiedFile(R.files.wasm, opts)])
    // the same Node check transformers.js strips before it runs the loader
    const code = new TextDecoder().decode(mjs).replaceAll('globalThis.process?.versions?.node', 'false')
    onnxEnv.wasm.wasmBinary = wasm
    onnxEnv.wasm.wasmPaths = {
      mjs: URL.createObjectURL(new Blob([code], { type: 'text/javascript' })),
      wasm: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
    }
  })().catch(e => { ready = null; throw e })
  return ready
}
