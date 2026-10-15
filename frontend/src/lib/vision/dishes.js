// Food-101 classifier label → entry-ready food. Numbers come from USDA FNDDS survey foods
// (frontend/src/data/food101-foods.json, built by scripts/build-food101-foods.mjs), never the model.
import TABLE from '../../data/food101-foods.json'

export function dishFood(label, table = TABLE) {
  const d = table[label]
  if (!d) return null
  return {
    src: 'food101', id: label, code: '', name: d.name, brand: 'USDA: ' + d.usda,
    serving: d.portion, servingUnit: 'g', approx: d.approx, per100: { ...d.per100 },
  }
}
