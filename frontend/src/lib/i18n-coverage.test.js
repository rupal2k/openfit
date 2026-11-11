// Every t('literal') in the app must exist in every locale pack, with the same {0} placeholders.
// 1.6.1 shipped ~300 untranslated strings per language (tab names included) because nothing
// checked this; a new string now fails the tests until each language has it.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(__dirname, '..')
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (['locales', 'instr'].includes(e.name) ? [] : walk(path.join(d, e.name)))
    : /\.jsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : [])
const keys = new Set()
for (const f of walk(SRC)) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\(['"])/g, '$1'))
}
const packs = import.meta.glob('../locales/*.js', { eager: true })
const ph = s => [...s.matchAll(/\{\d\}/g)].map(m => m[0]).sort().join(',')

describe('translations', () => {
  it('finds the app strings', () => expect(keys.size).toBeGreaterThan(500))
  for (const [file, mod] of Object.entries(packs)) {
    const lang = path.basename(file, '.js'), dict = mod.default
    it(`${lang} has every string`, () => expect([...keys].filter(k => !(k in dict))).toEqual([]))
    it(`${lang} keeps every placeholder`, () =>
      expect(Object.entries(dict).filter(([k, v]) => ph(k) !== ph(v)).map(([k]) => k)).toEqual([]))
  }
})
