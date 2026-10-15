// Maps a model's food name to reference nutrition. The model only names food; the numbers come
// from frontend/src/data/generic-foods.json (USDA FoodData Central, public domain).
import TABLE from '../../data/generic-foods.json'

const STOP = new Set(['and', 'with', 'the', 'of', 'a', 'some', 'piece', 'pieces', 'slice', 'slices', 'bowl', 'plate', 'cup', 'fresh', 'cooked', 'raw', 'small', 'large'])
const stem = w => w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.endsWith('oes') ? w.slice(0, -2)
  : (w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z ]/g, ' ').split(/\s+/)
  .filter(w => w.length > 1 && !STOP.has(w)).map(stem)

const keyCache = new WeakMap()
const keysOf = f => {
  if (!keyCache.has(f)) keyCache.set(f, [words(f.name), ...(f.aka || []).map(words)])
  return keyCache.get(f)
}

function score(q, f) {
  let best = 0
  for (const k of keysOf(f)) {
    if (!k.length) continue
    const hit = q.filter(w => k.includes(w)).length
    best = Math.max(best, hit / q.length + 0.25 * (hit / k.length))   // query coverage + candidate coverage
  }
  return best
}

const snapshot = f => ({ src: 'generic', id: f.id, code: '', name: f.name, brand: '', serving: null, servingUnit: 'g', per100: { ...f.per100 } })

export function matchFoods(name, foods = TABLE, k = 3) {
  const q = words(name)
  if (!q.length) return []
  return foods.map(f => ({ f, s: score(q, f) }))
    .filter(x => x.s >= 0.5)
    .sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length)
    .slice(0, k)
    .map(x => snapshot(x.f))
}
