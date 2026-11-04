// On-device OCR for photographed and scanned lab reports. Tesseract runs in a web worker with
// the English model bundled under ocr/ (see vite.config.js), so nothing is downloaded and the
// image never leaves the device. Output matches lib/labs/pdf.js: one line per printed row, a tab
// between table cells, so parseLabText reads both the same way.

// Words → rows by vertical overlap → cells by horizontal gap. Tesseract may split a table into
// column blocks; regrouping every word by position puts each printed row back together.
// unsure (optional Set) collects the lines holding a number Tesseract wasn't confident about.
export function rowsFromWords(words, unsure = null) {
  const ws = words.filter(w => w.text && w.text.trim() && (w.confidence ?? 100) > 20)
    .map(w => ({ s: w.text.trim(), c: w.confidence ?? 100, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 }))
    .sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1))
  const rows = []
  for (const w of ws) {
    const h = w.y1 - w.y0, mid = (w.y0 + w.y1) / 2
    const row = rows.find(r => Math.abs(r.mid - mid) < Math.max(h, r.h) * 0.5)
    if (row) { row.words.push(w); row.mid = (row.mid * (row.words.length - 1) + mid) / row.words.length }
    else rows.push({ mid, h, words: [w] })
  }
  rows.sort((a, b) => a.mid - b.mid)
  return rows.map(r => {
    r.words.sort((a, b) => a.x0 - b.x0)
    let out = '', end = null
    for (const w of r.words) {
      if (end != null) out += w.x0 - end > r.h * 1.1 ? '\t' : ' '
      out += w.s
      end = w.x1
    }
    if (unsure && r.words.some(w => /\d/.test(w.s) && w.c < 80)) unsure.add(out)
    return out
  }).join('\n')
}

// Phone photos: stretch contrast (2nd–98th percentile → black–white) and sharpen once. Works on a
// grey channel; returns a new array the same size. On the reference photo this is the clean-up
// that helped OCR most (14/22 rows vs 10/22 untouched).
export function enhanceGray(g, w, h) {
  const hist = new Uint32Array(256)
  for (const v of g) hist[v]++
  const pick = q => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= q * g.length) return i } return 255 }
  const lo = pick(0.02), hi = Math.max(pick(0.98), lo + 1)
  const s = new Uint8ClampedArray(g.length)
  for (let i = 0; i < g.length; i++) s[i] = ((g[i] - lo) * 255) / (hi - lo)
  const out = new Uint8ClampedArray(g.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { out[i] = s[i]; continue }
    out[i] = 5 * s[i] - s[i - 1] - s[i + 1] - s[i - w] - s[i + w]   // 3×3 sharpen
  }
  return out
}

// A photo File → a cleaned canvas: at least 2400 px on its long side (OCR wants ~300 dpi), grey,
// contrast-stretched and sharpened.
export async function preparePhoto(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(4000 / Math.max(bmp.width, bmp.height), Math.max(1, 2400 / Math.max(bmp.width, bmp.height)))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h), px = img.data
  const g = new Uint8ClampedArray(w * h)
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
  const e = enhanceGray(g, w, h)
  for (let i = 0; i < e.length; i++) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = e[i]; px[i * 4 + 3] = 255 }
  ctx.putImageData(img, 0, 0)
  return c
}

let worker = null
async function getWorker(onProgress) {
  if (worker) return worker
  const { createWorker, OEM } = await import('tesseract.js')
  const base = new URL('ocr/', document.baseURI).href
  worker = createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: base + 'worker.min.js',
    corePath: base + 'tesseract-core-simd-lstm.wasm.js',
    langPath: base.replace(/\/$/, ''),
    workerBlobURL: false,
    logger: m => m.status === 'recognizing text' && onProgress?.(m.progress),
  }).catch(e => { worker = null; throw e })
  return worker
}

// image: File, Blob, canvas or data URL → text lines. unsure: optional Set, see rowsFromWords.
export async function ocrText(image, onProgress, unsure = null) {
  const w = await getWorker(onProgress)
  const { data } = await w.recognize(image, { rotateAuto: true }, { blocks: true })
  return rowsFromWords(wordsOf(data), unsure)
}

export function wordsOf(data) {
  return (data.blocks || []).flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words)))
}

// A scanned PDF has pages but no text layer: render each page and OCR it.
export async function ocrPdfPages(pdfData, onProgress, unsure = null, maxPages = 6) {
  const P = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  P.GlobalWorkerOptions.workerSrc = workerSrc
  const doc = await P.getDocument({ data: new Uint8Array(pdfData), isEvalSupported: false }).promise
  const out = []
  const n = Math.min(doc.numPages, maxPages)
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale: 4 })   // ~290 dpi on a letter page: smaller loses decimal points
    const canvas = document.createElement('canvas')
    canvas.width = vp.width; canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    out.push(await ocrText(canvas, p => onProgress?.((i - 1 + p) / n), unsure))
  }
  await doc.destroy()
  return out.join('\n')
}
