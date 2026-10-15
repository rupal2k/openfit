// One pipeline for every recognition backend (fud-ai routes all providers through one
// analyzeFood path). `classify` is the only backend-specific piece; a Phase 2 native Gemma
// provider would add a parse step (lib/vision/parse.js) and feed the same review sheet.
import { dishFood } from './dishes.js'

// Spike: classifier top-1 at ≥85% was always right; ≤25% was wrong or ambiguous.
export const UNSURE = 0.5

export async function analyzeDish({ image }, { classify, lookup = dishFood }) {
  const top = await classify(image)
  const options = top.map(t => ({ food: lookup(t.label), score: t.score })).filter(o => o.food)
  return {
    options,
    pick: 0,
    g: options[0]?.food.serving || 0,
    unsure: !options.length || options[0].score < UNSURE,
  }
}
