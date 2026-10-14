// Food lookups. Search goes through our API (OFF search has no CORS); barcode lookups hit
// world.openfoodfacts.org directly — it sends Access-Control-Allow-Origin: *, so they also work
// in the mobile and demo builds, which have no backend.
import { api } from './api.js'
import { MOBILE } from './mobile.js'
import { DEMO } from './demo.js'
import { OFF_FIELDS, normalizeOFF } from './off.js'

export const SEARCH_OK = !MOBILE && !DEMO

export async function searchFoods(q) {
  const { hits } = await api('/api/food/search?q=' + encodeURIComponent(q))
  return hits.map(normalizeOFF).filter(Boolean)
}

export async function lookupBarcode(code) {
  const clean = String(code).replace(/\D/g, '')
  if (clean.length < 8) return null
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}?fields=${OFF_FIELDS}`)
  const d = await r.json().catch(() => ({}))
  return d.status === 1 ? normalizeOFF(d.product) : null   // unknown codes come back 200 + status 0
}
