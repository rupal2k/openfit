// PDF → text with one line per printed row and a tab between table cells. pdf.js and its worker
// are bundled by Vite and loaded only when someone imports a report; nothing is fetched from a
// CDN, so an import works offline and sends the report nowhere.

let lib = null
async function pdfjs() {
  if (lib) return lib
  lib = await import('pdfjs-dist')
  if (typeof window !== 'undefined') {
    const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    lib.GlobalWorkerOptions.workerSrc = worker
  }
  return lib
}

// Items on one printed row share a baseline; a gap wider than about two characters is a new cell.
export function linesOf(items) {
  const rows = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || 10
    let row = rows.find(r => Math.abs(r.y - y) < h * 0.4)
    if (!row) rows.push(row = { y, items: [] })
    row.items.push({ x, w: it.width || 0, s: it.str, h })
  }
  rows.sort((a, b) => b.y - a.y)
  return rows.map(r => {
    r.items.sort((a, b) => a.x - b.x)
    let out = '', end = null
    for (const it of r.items) {
      if (end != null) out += it.x - end > it.h * 0.9 ? '\t' : (out.endsWith(' ') || it.s.startsWith(' ') ? '' : ' ')
      out += it.s
      end = it.x + it.w
    }
    return out.replace(/ +/g, ' ').trim()
  })
}

// data: ArrayBuffer or Uint8Array of a PDF. lib may be passed in (tests use the Node build).
// maxPages: a lab report is a few pages; a huge PDF must not stall the phone
export async function pdfText(data, pdf = null, maxPages = 30) {
  const P = pdf || await pdfjs()
  const task = P.getDocument({ data: new Uint8Array(data), isEvalSupported: false, disableFontFace: true })   // pdf.js 6: the loading task owns destroy()
  const doc = await task.promise
  const out = []
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const tc = await (await doc.getPage(p)).getTextContent()
    out.push(...linesOf(tc.items))
  }
  await task.destroy()
  return out.join('\n')
}
