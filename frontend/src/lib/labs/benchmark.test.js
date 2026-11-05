// KR1 and KR2 of docs/PRD-openfit-labs.md, on getbased's synthetic US reference report
// (fixtures/, AGPL-3.0-or-later, see NOTICE.md): no real patient or laboratory.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import * as pdfjsNode from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfText } from './pdf.js'
import { parseLabText } from './parse.js'
import { toCanonical } from './units.js'

// Right = same printed number and the same amount once converted (mEq/L sodium = mmol/L sodium).
const sameAmount = (r, g) => {
  const a = toCanonical(r.key, r.value, r.unit, r.basis), b = toCanonical(g.mappedKey, g.value, g.unit)
  return a.ok && b.ok && Math.abs(a.v - b.v) <= 1e-6 * Math.max(1, Math.abs(b.v))
}

const dir = new URL('./fixtures/', import.meta.url)
const gold = JSON.parse(readFileSync(new URL('getbased-reference-us-v2.gold.json', dir), 'utf8')).expected

describe('getbased reference report', () => {
  let parsed
  beforeAll(async () => {
    // any network use fails the test: the import must work offline
    vi.stubGlobal('fetch', () => { throw new Error('network used during import') })
    const text = await pdfText(readFileSync(new URL('getbased-reference-us-v2.pdf', dir)), pdfjsNode)
    parsed = parseLabText(text, { mdy: true })
  })
  afterAll(() => vi.unstubAllGlobals())

  it('finds the collection date', () => expect(parsed.date).toBe(gold.date))

  it('reads at least 90% of rows with the right marker, value and unit', () => {
    const byKey = new Map(parsed.rows.filter(r => r.key).map(r => [r.key, r]))
    const misses = gold.markers.filter(g => {
      const r = byKey.get(g.mappedKey)
      return !r || Math.abs(r.value - g.value) > 1e-9 || !sameAmount(r, g)
    })
    const share = 1 - misses.length / gold.markers.length
    console.log(`benchmark: ${gold.markers.length - misses.length}/${gold.markers.length} rows right${misses.length ? '; missed: ' + misses.map(g => g.rawName).join(', ') : ''}`)
    expect(share).toBeGreaterThanOrEqual(0.9)
  })

  it('maps no row to a wrong marker', () => {
    const want = new Map(gold.markers.map(g => [g.rawName, g.mappedKey]))
    const wrong = parsed.rows.filter(r => r.key && want.has(r.name) && want.get(r.name) !== r.key)
    expect(wrong.map(r => `${r.name} → ${r.key}`)).toEqual([])
  })
})
