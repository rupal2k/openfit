// OCR accuracy on getbased's synthetic reference report rendered to images (fixtures/): clean
// page renders like a flatbed scan, and page 1 as a tilted, soft phone photo. Runs Tesseract in
// Node with the same bundled English model the app ships; any network use fails the test.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createWorker, OEM } from 'tesseract.js'
import { rowsFromWords, wordsOf } from './ocr.js'
import { parseLabText } from './parse.js'
import { sameUnit } from './units.js'

const dir = new URL('./fixtures/', import.meta.url)
const gold = JSON.parse(readFileSync(new URL('getbased-reference-us-v2.gold.json', dir), 'utf8')).expected
const langPath = fileURLToPath(new URL('../../../node_modules/@tesseract.js-data/eng/4.0.0_best_int', import.meta.url))

function score(rows, expected) {
  const byKey = new Map(rows.filter(r => r.key).map(r => [r.key, r]))
  const misses = expected.filter(g => {
    const r = byKey.get(g.mappedKey)
    return !r || Math.abs(r.value - g.value) > 1e-9 || !sameUnit(r.unit, g.unit)
  })
  return { right: expected.length - misses.length, of: expected.length, misses: misses.map(g => g.rawName) }
}

describe('OCR of the reference report', { timeout: 240000 }, () => {
  let worker
  const read = async file => {
    const { data } = await worker.recognize(readFileSync(new URL(file, dir)), { rotateAuto: true }, { blocks: true })
    return rowsFromWords(wordsOf(data))
  }
  beforeAll(async () => {
    vi.stubGlobal('fetch', () => { throw new Error('network used during OCR') })
    worker = await createWorker('eng', OEM.LSTM_ONLY, { langPath, cacheMethod: 'none' })
  }, 120000)
  afterAll(async () => { await worker?.terminate(); vi.unstubAllGlobals() })

  it('reads a scanned report (all three pages)', async () => {
    const text = (await Promise.all(['reference-page1.png', 'reference-page2.png', 'reference-page3.png'].map(read))).join('\n')
    const p = parseLabText(text, { mdy: true })
    const s = score(p.rows, gold.markers)
    console.log(`OCR scan: ${s.right}/${s.of} rows right${s.misses.length ? '; missed: ' + s.misses.join(', ') : ''}; date ${p.date}`)
    expect(s.right / s.of).toBeGreaterThanOrEqual(0.9)
  })

  it('reads a tilted, soft phone photo of page 1', async () => {
    const p = parseLabText(await read('reference-page1-photo.jpg'), { mdy: true })
    const s = score(p.rows, gold.markers.filter(g => g.page === 1))
    console.log(`OCR photo: ${s.right}/${s.of} rows right${s.misses.length ? '; missed: ' + s.misses.join(', ') : ''}`)
    // the fixture is deliberately harsh (tilt, blur, low contrast, heavy JPEG); misread digits are
    // caught on the review screen. The app also cleans photos up first (enhanceGray), which helps more.
    expect(s.right / s.of).toBeGreaterThanOrEqual(0.65)
  })
})

describe('photo clean-up', () => {
  it('stretches a dull image to full contrast', async () => {
    const { enhanceGray } = await import('./ocr.js')
    const w = 10, h = 10, g = new Uint8ClampedArray(w * h).map((_, i) => (i % 2 ? 110 : 150))
    const out = enhanceGray(g, w, h)
    expect(Math.min(...out)).toBe(0)
    expect(Math.max(...out)).toBe(255)
  })
  it('keeps the size and leaves a flat image flat inside', async () => {
    const { enhanceGray } = await import('./ocr.js')
    const out = enhanceGray(new Uint8ClampedArray(9).fill(128), 3, 3)
    expect(out).toHaveLength(9)
    expect(out[4]).toBe(out[0])
  })
})
