// OPENFIT's LocalModelManager: lifecycle state for the UI, verified install, cancel, delete,
// and the worker RPC. transformers.js caches files in Cache Storage ('transformers-cache') under
// their Hugging Face resolve URL; we hash them once after download and then trust a marker
// (localStorage) — fud-ai's "size + marker" rule — so startup never re-hashes the model.
import { create } from 'zustand'
import { MODELS, DEFAULT_MODEL, pickDevice, deviceFiles, downloadBytes, fileUrl, ineligibility } from './catalog.js'
import { VisionError } from './errors.js'

const CACHE = 'transformers-cache'
const DEVICE_KEY = 'openfit.vision.device'
const IDLE_MS = 90_000
const ls = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } },
}
export const markerKey = (id, device) => `openfit.vision.verified.${id}.${device}`
export const sumProgress = files => Object.values(files).reduce(
  (a, f) => ({ loaded: a.loaded + (f.loaded || 0), total: a.total + (f.total || 0) }), { loaded: 0, total: 0 })

// state: unknown | ineligible | absent | downloading | verifying | ready | busy | failed
export const useVision = create(() => ({
  modelId: DEFAULT_MODEL, device: null, state: 'unknown', reason: null, loaded: 0, total: 0, error: null,
}))
const set = p => useVision.setState(p)
const get = () => useVision.getState()

/* ---------- worker RPC (one engine at a time, like LocalGemmaRuntime's mutex) ---------- */
let worker = null, seq = 0, idle = null
const pending = new Map()
function release() {
  clearTimeout(idle)
  if (!worker) return
  worker.terminate(); worker = null
  for (const p of pending.values()) p.reject(new VisionError('CANCELLED'))
  pending.clear()
}
function call(msg, onProgress) {
  clearTimeout(idle)
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const p = pending.get(data.rid)
      if (!p) return
      if (data.type === 'progress') { p.onProgress?.(data); return }
      pending.delete(data.rid)
      data.type === 'ok' ? p.resolve(data) : p.reject(new VisionError(data.kind, data.message))
    }
  }
  const rid = ++seq
  return new Promise((resolve, reject) => {
    pending.set(rid, { resolve, reject, onProgress })
    worker.postMessage({ ...msg, rid })
  })
}
const scheduleRelease = () => { clearTimeout(idle); idle = setTimeout(release, IDLE_MS) }

/* ---------- detection ---------- */
async function detectDevice() {
  const saved = ls.get(DEVICE_KEY)
  if (saved === 'wasm' || saved === 'webgpu') return saved
  try { return pickDevice(!!(navigator.gpu && (await navigator.gpu.requestAdapter()))) } catch { return 'wasm' }
}
async function cachedAll(m, device) {
  if (!('caches' in self)) return false
  const c = await caches.open(CACHE)
  return (await Promise.all(deviceFiles(m, device).map(f => c.match(fileUrl(m, f.path))))).every(Boolean)
}
async function purge(m) {
  if (!('caches' in self)) return
  const c = await caches.open(CACHE)
  for (const req of await c.keys()) if (req.url.includes(`/${m.repo}/`)) await c.delete(req)
}

export async function refreshVision() {
  if (['downloading', 'verifying', 'busy'].includes(get().state)) return
  const device = await detectDevice()
  const m = MODELS[get().modelId]
  const installed = ls.get(markerKey(m.id, device)) === m.revision && await cachedAll(m, device)
  if (installed) { set({ device, state: 'ready', reason: null, error: null }); return }
  const est = await navigator.storage?.estimate?.().catch(() => null)
  const reason = ineligibility(m, { deviceMemoryGb: navigator.deviceMemory, freeBytes: est?.quota ? est.quota - est.usage : null })
  set({ device, state: reason ? 'ineligible' : 'absent', reason, total: downloadBytes(m, device), error: null })
}

/* ---------- install / cancel / remove ---------- */
export async function installModel() {
  const { modelId, device } = get()
  const m = MODELS[modelId]
  await navigator.storage?.persist?.().catch(() => false)
  const files = {}
  set({ state: 'downloading', loaded: 0, total: downloadBytes(m, device), error: null })
  try {
    await call({ type: 'load', id: modelId, device }, p => {
      files[p.file] = p
      set({ loaded: Math.min(sumProgress(files).loaded, get().total) })
    })
    set({ state: 'verifying' })
    await call({ type: 'verify', id: modelId, device })
    ls.set(markerKey(modelId, device), m.revision)
    set({ state: 'ready' })
    scheduleRelease()
  } catch (e) {
    const err = e instanceof VisionError ? e : new VisionError('DOWNLOAD', String(e?.message || e))
    release()
    if (err.kind === 'CANCELLED') { await purge(m); set({ state: 'absent', loaded: 0 }); return }
    if (err.kind === 'GPU_INIT') { ls.set(DEVICE_KEY, 'wasm'); await purge(m); set({ device: 'wasm', total: downloadBytes(m, 'wasm') }) }
    if (err.kind === 'VERIFY') await purge(m)
    set({ state: 'failed', error: err.message })
    throw err
  }
}

export const cancelInstall = () => release()

export async function removeModel() {
  release()
  const m = MODELS[get().modelId]
  await purge(m)
  ls.set(markerKey(m.id, 'webgpu'), null)
  ls.set(markerKey(m.id, 'wasm'), null)
  set({ state: 'absent', loaded: 0, error: null })
}

/* ---------- inference ---------- */
// → [{ label, score }] top-3, best first
export async function classify(image) {
  const { modelId, device, state } = get()
  if (state !== 'ready') throw new VisionError('NOT_INSTALLED')
  set({ state: 'busy', error: null })
  try {
    const { top } = await call({ type: 'classify', id: modelId, device, image })
    set({ state: 'ready' })
    scheduleRelease()
    return top || []
  } catch (e) {
    set({ state: 'ready' })
    if (e.kind === 'GPU_INIT') { ls.set(DEVICE_KEY, 'wasm'); ls.set(markerKey(modelId, device), null); await refreshVision() }
    throw e
  }
}

export const cancelClassify = () => release()
