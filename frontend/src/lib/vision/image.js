// Phone photos are 12 MP, SmolVLM works at 512 px. Shrinking first keeps the worker message
// small and decoding fast — the same job as fud-ai's FoodImagePreprocessor (1600 px, JPEG q80).
import { VisionError } from './errors.js'

export function fitWithin(w, h, max) {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

export async function prepImage(file, max = 512) {
  let bmp
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (e) {
    throw new VisionError('IMAGE', String(e?.message || e))
  }
  const { w, h } = fitWithin(bmp.width, bmp.height, max)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new VisionError('IMAGE', 'encode failed'))), 'image/jpeg', 0.85))
}
