// Builds frontend/src/data/generic-foods.json from scripts/generic-foods.txt using USDA
// FoodData Central (public domain). Rows with a manual "kcal p c f" override skip the API.
// Usage: FDC_API_KEY=<free key: https://fdc.nal.usda.gov/api-key-signup> node scripts/build-generic-foods.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KEY = process.env.FDC_API_KEY
if (!KEY) { console.error('Set FDC_API_KEY'); process.exit(1) }
const NUT = { kcal: [1008, 2047, 2048], p: [1003], c: [1005], f: [1004] }   // Energy (kcal / Atwater), protein, carbs, fat
const r1 = x => Math.round(x * 10) / 10

async function fdc(query) {
  const q = query.replace(/[()"]/g, '')
  const u = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${KEY}&pageSize=1&dataType=Foundation,SR%20Legacy&query=${encodeURIComponent(q)}`
  const res = await fetch(u)
  if (!res.ok) throw new Error(`FDC ${res.status} for ${query}`)
  const food = (await res.json()).foods?.[0]
  if (!food) throw new Error('no FDC hit for ' + query)
  const val = ids => { for (const id of ids) { const n = food.foodNutrients.find(x => x.nutrientId === id); if (n) return n.value } return 0 }
  return { kcal: Math.round(val(NUT.kcal)), p: r1(val(NUT.p)), c: r1(val(NUT.c)), f: r1(val(NUT.f)), fdcName: food.description }
}

const out = []
for (const line of fs.readFileSync(path.join(R, 'scripts/generic-foods.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  const [id, query, aka, manual] = line.split('|').map(s => (s || '').trim())
  let per100
  if (manual) { const [kcal, p, c, f] = manual.split(/\s+/).map(Number); per100 = { kcal, p, c, f } }
  else { const h = await fdc(query); per100 = { kcal: h.kcal, p: h.p, c: h.c, f: h.f }; console.log(id, '←', h.fdcName) }
  const name = manual || !query ? aka.split(',')[0].trim().replace(/^\w/, c => c.toUpperCase()) : query.split(',').slice(0, 2).join(',')
  out.push({ id, name, aka: aka.split(',').map(s => s.trim()).filter(Boolean), per100 })
}
fs.writeFileSync(path.join(R, 'frontend/src/data/generic-foods.json'), JSON.stringify(out, null, 1) + '\n')
console.log('wrote', out.length, 'foods')
