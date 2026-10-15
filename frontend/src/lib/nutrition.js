// Nutrition targets + food-diary math. The energy formulas are ported from OpenNutriTracker
// (GPL-3.0, github.com/simonoppowa/OpenNutriTracker, lib/core/utils/calc/): IOM 2005 TDEE,
// its PAL categories and the ±500 kcal goal adjustment. Protein deliberately differs — a gym
// app targets 1.6 g/kg bodyweight, not 15 % of energy.
import { uid } from './format.js'

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
export const PAL = { sedentary: 1.25, low: 1.5, active: 1.75, very: 2.2 }
export const GOAL_ADJ = { lose: -500, maintain: 0, gain: 500 }
const PROTEIN_PER_KG = 1.6
const FAT_SHARE = 0.25
const LB = 0.45359237

function paFor(pal, male) {
  if (pal < 1.4) return 1.0
  if (pal < 1.6) return male ? 1.12 : 1.14
  if (pal < 1.9) return 1.27
  return male ? 1.54 : 1.45
}

// IOM 2005 total daily energy expenditure, kcal. sex 'other' = mean of both equations.
export function tdee({ sex, age, heightCm, weightKg, pal }) {
  const v = PAL[pal] ?? PAL.low
  const h = heightCm / 100
  const male = 864 - 9.72 * age + paFor(v, true) * (14.2 * weightKg + 503 * h)
  const female = 387 - 7.31 * age + paFor(v, false) * (10.9 * weightKg + 660.7 * h)
  return sex === 'male' ? male : sex === 'female' ? female : (male + female) / 2
}

export const ageFrom = (birthYear, now = new Date()) => now.getFullYear() - birthYear

// Latest weigh-in in kg (the log stores numbers in whatever S.unit is).
export function bodyKg(S) {
  const b = S.bodyweight?.[S.bodyweight.length - 1]
  if (!b) return null
  return S.unit === 'lb' ? b.w * LB : b.w
}

// Daily targets, or null when there isn't enough to give an honest number.
export function targets(S, now = new Date()) {
  const p = S.nutrition?.profile
  if (!p) return null
  const w = bodyKg(S)
  let kcal
  if (p.kcal) kcal = p.kcal
  else {
    if (!w || !p.heightCm || !p.birthYear) return null
    kcal = tdee({ sex: p.sex, age: ageFrom(p.birthYear, now), heightCm: p.heightCm, weightKg: w, pal: p.pal }) + (GOAL_ADJ[p.goal] ?? 0)
  }
  kcal = Math.round(kcal)
  const protein = w ? Math.round(w * PROTEIN_PER_KG) : Math.round(kcal * 0.25 / 4)
  const fat = Math.round(kcal * FAT_SHARE / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

const r1 = x => Math.round(x * 10) / 10
const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0 })

export function entryTotals({ g, food }) {
  const k = g / 100, n = food.per100
  return { kcal: r1(n.kcal * k), p: r1(n.p * k), c: r1(n.c * k), f: r1(n.f * k) }
}

export function dayTotals(entries) {
  const sum = ZERO()
  for (const e of entries || []) {
    const k = e.g / 100, n = e.food.per100
    sum.kcal += n.kcal * k; sum.p += n.p * k; sum.c += n.c * k; sum.f += n.f * k
  }
  return { kcal: r1(sum.kcal), p: r1(sum.p), c: r1(sum.c), f: r1(sum.f) }
}

// Mutators take the draft S handed out by useStore().update(mut).
// Portion units. Entries always store grams (`g`) so totals stay per-100 g math; `u` only
// remembers what the user typed in. ponytail: volume assumes 1 ml ≈ 1 g (right for drinks,
// ~10% off for oil) — add per-food density if OFF ever gives us one.
export const UNITS = {
  g: { f: 1, step: 10, dec: false }, kg: { f: 1000, step: 0.1, dec: true }, oz: { f: 28.3495, step: 1, dec: true },
  ml: { f: 1, step: 10, dec: false }, L: { f: 1000, step: 0.1, dec: true }, 'fl oz': { f: 29.5735, step: 1, dec: true },
}
export const toGrams = (qty, u = 'g', serving = null) => {
  if (u === 'serving' || u === 'portion') return Math.round((+qty || 0) * (serving || 100) * 10) / 10
  return Math.round((+qty || 0) * (UNITS[u] || UNITS.g).f * 10) / 10
}
export const fromGrams = (g, u = 'g', serving = null) => {
  if (u === 'serving' || u === 'portion') return Math.round(((+g || 0) / (serving || 100)) * 100) / 100
  return Math.round((+g || 0) / (UNITS[u] || UNITS.g).f * 100) / 100
}
export const fmtAmount = e => {
  if ((e.u === 'serving' || e.u === 'portion') && e.food?.serving) {
    const s = Math.round((e.g / e.food.serving) * 100) / 100
    const uLabel = e.food.servingUnit || 'g'
    const word = s === 1 ? 'serving' : 'servings'
    return `${s} ${word} (${e.g} ${uLabel})`
  }
  return e.u && e.u !== 'g' && UNITS[e.u] ? `${fromGrams(e.g, e.u)} ${e.u}` : `${e.g} g`
}

export function addEntry(S, iso, { meal, g, u, food }) {
  const e = { id: uid(), meal, g, t: Date.now(), food: structuredClone(food) }
  if (u && u !== 'g') e.u = u
  S.nutrition ||= { profile: null, days: {}, foods: [] }
  S.nutrition.days ||= {}
  ;(S.nutrition.days[iso] ||= []).push(e)
  return e
}
export function updateEntry(S, iso, id, patch) {
  const e = (S.nutrition?.days?.[iso] || []).find(x => x.id === id)
  if (e) Object.assign(e, patch)
}
export function removeEntry(S, iso, id) {
  if (!S.nutrition?.days?.[iso]) return
  const list = S.nutrition.days[iso].filter(x => x.id !== id)
  if (list.length) S.nutrition.days[iso] = list
  else delete S.nutrition.days[iso]
}

// ponytail: scans every logged day; fine for years of logs. Index it if it ever shows in a profile.
export function recentFoods(S, limit = 20) {
  const all = Object.values(S.nutrition?.days || {}).flat().sort((a, b) => b.t - a.t)
  const seen = new Set(), out = []
  for (const e of all) {
    const key = e.food.code || e.food.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key); out.push(e.food)
    if (out.length >= limit) break
  }
  return out
}
