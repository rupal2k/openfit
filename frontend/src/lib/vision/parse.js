// Turns a small VLM's free text into [{ name, g }]. Forgiving on purpose: 256M models drift
// between "Rice - 150 g", "1. Rice: about 150g" and the occasional fenced JSON array.
const LINE = /^\s*(?:(?:\d+[.)]|[-*•])\s+)?(.+?)\s*[-–—:,(]\s*(?:about|approx\.?|~)?\s*(\d+(?:[.,]\d+)?)\s*(kg|g|grams?|ml|oz)\b/i
const TO_G = { kg: 1000, oz: 28.35 }
const clampG = g => Math.min(1500, Math.max(5, Math.round(g)))

function fromJson(text) {
  const s = text.indexOf('['), e = text.lastIndexOf(']')
  if (s < 0 || e <= s) return null
  try {
    const arr = JSON.parse(text.slice(s, e + 1))
    return Array.isArray(arr) ? arr.map(x => ({ name: x?.name, g: +(x?.grams ?? x?.g) })) : null
  } catch { return null }
}

function fromLines(text) {
  const out = []
  for (const raw of text.split(/\n|;/)) {
    const m = raw.match(LINE)
    if (m) out.push({ name: m[1], g: parseFloat(m[2].replace(',', '.')) * (TO_G[m[3].toLowerCase()] || 1) })
  }
  return out
}

export function parseDetections(text) {
  const src = String(text || '')
  const rows = fromJson(src) || fromLines(src)
  const seen = new Set(), out = []
  for (const r of rows) {
    const name = String(r.name || '').replace(/["*_`]/g, '').trim().toLowerCase()
    if (!name || !(r.g > 0) || seen.has(name)) continue
    seen.add(name)
    out.push({ name, g: clampG(r.g) })
  }
  return out.slice(0, 8)
}
