// Small VLMs follow "one item per line" far more reliably than fud-ai's 40-field JSON schema,
// so we ask only for names and grams; nutrition comes from the bundled table (match.js).
export const BASE_PROMPT = 'List each food item in this photo with an estimated weight in grams. One item per line, format: <food> - <grams> g. No other text.'
export const MAX_NEW_TOKENS = 160
export function buildPrompt(note) {
  const n = String(note || '').trim().slice(0, 200)
  return n ? `${BASE_PROMPT}\nContext from the user: ${n}` : BASE_PROMPT
}
