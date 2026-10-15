// Builds frontend/src/data/food101-foods.json: per-100 g nutrition and a typical portion for each
// Food-101 classifier label, from USDA FNDDS survey foods (public domain, no API key needed).
// Download + unzip https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip
// Usage: node scripts/build-food101-foods.mjs <unzipped dir>
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/build-food101-foods.mjs <FNDDS csv dir>'); process.exit(1) }

// FNDDS rows are fully quoted and never contain newlines, so a quoted-field split is enough.
const rows = file => fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter(Boolean).slice(1)
  .map(l => [...l.matchAll(/"((?:[^"]|"")*)"|(?<=^|,)(?=,|$)/g)].map(m => (m[1] ?? '').replace(/""/g, '"')))

const byDesc = new Map(rows('food.csv').map(([id, , desc]) => [desc, id]))
const NBR = { '208': 'kcal', '203': 'p', '205': 'c', '204': 'f' }   // energy, protein, carbs, fat (per 100 g)
const nut = new Map()
for (const [, id, nbr, amount] of rows('food_nutrient.csv')) {
  if (!NBR[nbr]) continue
  if (!nut.has(id)) nut.set(id, {})
  nut.get(id)[NBR[nbr]] = Math.round(+amount * 10) / 10
}
const portions = new Map()
for (const [, id, seq, , , desc, , grams] of rows('food_portion.csv')) {
  if (!portions.has(id)) portions.set(id, [])
  portions.get(id).push({ seq: +seq, desc, g: +grams })
}
// "Quantity not specified" is FNDDS's typical portion; otherwise take its first listed portion.
const typical = list => list.find(p => p.desc === 'Quantity not specified') || list.sort((a, b) => a.seq - b.seq)[0]

const out = {}, missing = []
for (const line of fs.readFileSync(path.join(R, 'scripts/food101-map.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  const [label, desc, flag] = line.split('|').map(s => (s || '').trim())
  const id = byDesc.get(desc)
  const n = id && nut.get(id)
  if (!n || !(n.kcal >= 0)) { missing.push(`${label} → ${desc}`); continue }
  const p = typical(portions.get(id) || [])
  out[label] = {
    name: label.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
    usda: desc, approx: flag === '~',
    per100: { kcal: n.kcal, p: n.p ?? 0, c: n.c ?? 0, f: n.f ?? 0 },
    portion: p && p.g > 0 ? Math.round(p.g) : 150,
  }
}
if (missing.length) { console.error('No FNDDS match for:\n  ' + missing.join('\n  ')); process.exit(1) }
fs.writeFileSync(path.join(R, 'frontend/src/data/food101-foods.json'), JSON.stringify(out, null, 1) + '\n')
console.log('wrote', Object.keys(out).length, 'dishes;', Object.values(out).filter(x => x.approx).length, 'approximate')
