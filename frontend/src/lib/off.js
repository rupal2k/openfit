// Open Food Facts → our Food shape (see lib/nutrition.js). Field names follow OpenNutriTracker's
// off_const.dart. Search hits carry `brands` as an array, the v2 product API as a comma string.
export const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_quantity'

const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v)

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
  return {
    src: 'off', code: String(p.code || ''), name, brand,
    serving: num(p.serving_quantity),
    per100: { kcal, p: pProt, c: pCarb, f: pFat }
  }
}

