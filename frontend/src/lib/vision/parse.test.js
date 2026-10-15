import { describe, it, expect } from 'vitest'
import { parseDetections } from './parse.js'
import { BASE_PROMPT, buildPrompt } from './prompt.js'

describe('buildPrompt', () => {
  it('appends trimmed user context like fud-ai’s description, capped at 200 chars', () => {
    expect(buildPrompt()).toBe(BASE_PROMPT)
    expect(buildPrompt('   ')).toBe(BASE_PROMPT)
    expect(buildPrompt(' half portion of rice ')).toBe(BASE_PROMPT + '\nContext from the user: half portion of rice')
    expect(buildPrompt('x'.repeat(500)).length).toBe(BASE_PROMPT.length + '\nContext from the user: '.length + 200)
  })
})

describe('parseDetections', () => {
  it('reads the requested "<food> - <grams> g" lines', () => {
    expect(parseDetections('Rice - 150 g\nChicken curry - 200 g')).toEqual([
      { name: 'rice', g: 150 }, { name: 'chicken curry', g: 200 }])
  })
  it('tolerates numbering, bullets, colons, brackets, dashes and "about"', () => {
    expect(parseDetections('1. Banana: about 120g\n- salad (80 g)\n* Dal – 180 grams')).toEqual([
      { name: 'banana', g: 120 }, { name: 'salad', g: 80 }, { name: 'dal', g: 180 }])
  })
  it('keeps digits that belong to the name', () => {
    expect(parseDetections('7up - 330 ml')).toEqual([{ name: '7up', g: 330 }])
    expect(parseDetections('2 eggs - 100 g')).toEqual([{ name: '2 eggs', g: 100 }])
  })
  it('converts kg and oz, clamps silly values, drops duplicates', () => {
    expect(parseDetections('Steak - 0.25 kg\nCheese - 2 oz\nCake - 3000 g\nrice - 1 g\nRice - 90 g')).toEqual([
      { name: 'steak', g: 250 }, { name: 'cheese', g: 57 }, { name: 'cake', g: 1500 }, { name: 'rice', g: 5 }])
  })
  it('accepts a JSON array, even inside ``` fences (fud-ai FoodJsonParser behaviour)', () => {
    expect(parseDetections('```json\n[{"name":"Apple","grams":180}]\n```')).toEqual([{ name: 'apple', g: 180 }])
  })
  it('caps at 8 items and returns [] for chatter', () => {
    const many = Array.from({ length: 12 }, (_, i) => `food${String.fromCharCode(97 + i)} - 10 g`).join('\n')
    expect(parseDetections(many)).toHaveLength(8)
    expect(parseDetections('This is a picture of a delicious meal.')).toEqual([])
    expect(parseDetections('')).toEqual([])
    expect(parseDetections(undefined)).toEqual([])
  })
})
