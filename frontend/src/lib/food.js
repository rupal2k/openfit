// Food lookups. Search goes through our API (OFF search has no CORS); barcode lookups hit
// world.openfoodfacts.org directly — it sends Access-Control-Allow-Origin: *, so they also work
// in the mobile and demo builds, which have no backend.
import { api } from './api.js'
import { MOBILE } from './mobile.js'
import { DEMO } from './demo.js'
import { OFF_FIELDS, normalizeOFF } from './off.js'

export const SEARCH_OK = !DEMO

// The APK has no backend, but CapacitorHttp (capacitor.config.json) sends fetch through the
// native stack, where CORS doesn't apply — so it queries Open Food Facts search directly.
const OFF_SEARCH = 'https://search.openfoodfacts.org/search?page_size=25&fields=' + OFF_FIELDS + '&q='

export async function searchFoods(q) {
  let hits
  if (MOBILE) {
    const r = await fetch(OFF_SEARCH + encodeURIComponent(q))
    if (!r.ok) throw new Error('food database error ' + r.status)
    hits = (await r.json()).hits || []
  } else hits = (await api('/api/food/search?q=' + encodeURIComponent(q))).hits
  return hits.map(normalizeOFF).filter(Boolean)
}

export async function lookupBarcode(code) {
  const clean = String(code).replace(/\D/g, '')
  if (clean.length < 8) return null
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}?fields=${OFF_FIELDS}`)
  const d = await r.json().catch(() => ({}))
  return d.status === 1 ? normalizeOFF(d.product) : null   // unknown codes come back 200 + status 0
}
