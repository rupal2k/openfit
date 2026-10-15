// Open Food Facts → our Food shape (see lib/nutrition.js). Field names follow OpenNutriTracker's
// off_const.dart. Search hits carry `brands` as an array, the v2 product API as a comma string.
export const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size,serving_quantity_unit'

const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v)

function parseServing(p) {
  const sq = num(p.serving_quantity)
  if (sq !== null && sq > 0 && sq <= 5000) return sq
  if (p.serving_size && typeof p.serving_size === 'string') {
    const s = p.serving_size
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml|gr|gram|grams|mll)\b/i)
      || s.match(/\(\s*(\d+(?:[.,]\d+)?)\s*(?:g|ml|gr|gram|grams)\s*\)/i)
      || s.match(/(\d+(?:[.,]\d+)?)/)
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'))
      if (Number.isFinite(v) && v > 0 && v <= 5000) return v
    }
  }
  return null
}

function parseServingUnit(p) {
  const u = String(p.serving_quantity_unit || '').toLowerCase().trim()
  if (u === 'ml' || u === 'cl' || u === 'l' || u === 'fl oz') return 'ml'
  if (p.serving_size && typeof p.serving_size === 'string') {
    if (/\b(?:ml|milliliter|centiliter|cl|liter|litre|l)\b/i.test(p.serving_size)) return 'ml'
  }
  return 'g'
}

export function normalizeOFF(p) {
  if (!p) return null
  const n = p.nutriments || {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === null && num(n.energy_100g) !== null) kcal = Math.round(num(n.energy_100g) / 4.184 * 10) / 10
  const name = (p.product_name || p.product_name_en || '').trim()
  if (!name || kcal === null || kcal < 0 || kcal > 900) return null
  const pProt = num(n.proteins_100g) ?? 0
  const pCarb = num(n.carbohydrates_100g) ?? 0
  const pFat = num(n.fat_100g) ?? 0
  if (pProt < 0 || pCarb < 0 || pFat < 0) return null
  const brand = Array.isArray(p.brands) ? p.brands[0] || '' : String(p.brands || '').split(',')[0].trim()
  const serving = parseServing(p)
  const servingUnit = serving ? parseServingUnit(p) : 'g'
  const servingSize = (typeof p.serving_size === 'string' && p.serving_size.trim()) ? p.serving_size.trim().slice(0, 50) : null
  return {
    src: 'off', code: String(p.code || ''), name, brand,
    serving,
    servingUnit,
    servingSize,
    per100: { kcal, p: pProt, c: pCarb, f: pFat }
  }
}

