// Strings that reach t() through a variable: table values (meals, muscles, months, rules, lab
// markers and scores, dishes, the exercise dataset's body parts / equipment / targets) and the
// literals inside t(cond ? 'a' : 'b'). A source scan of t('...') misses all of them; this test
// loads the real tables and fails when any language lacks one.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { MUSCLE_NAME } from './muscles.js'
import * as F from './format.js'
import * as P from './progression.js'
import { MESSAGES } from './vision/errors.js'
import { MODELS } from './vision/catalog.js'
import { EXIDX } from './exercises.js'
import { MARKERS, CATEGORIES } from './labs/catalog.js'
import { SCORES } from './labs/scores.js'
import DISHES from '../data/food101-foods.json'
import { PLAN_WHERE, PLAN_TEMPLATES } from './starter.js'

const SRC = path.resolve(__dirname, '..')
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8')
const vals = o => (Array.isArray(o) ? o : Object.values(o || {})).filter(v => typeof v === 'string')
// object literals defined in JSX files that can't be imported here (MEAL_LABEL, STATUS, TAGS, LEGEND)
const literalTable = (file, name) => {
  const m = read(file).match(new RegExp('const ' + name + '\\s*=\\s*\\{([^}]*)\\}'))
  return m ? [...m[1].matchAll(/:\s*'((?:\\'|[^'])*)'/g)].map(x => x[1].replace(/\\'/g, "'")) : []
}

export function dynamicKeys() {
  const k = new Set()
  const add = a => a.forEach(s => typeof s === 'string' && s.trim() && k.add(s))
  add(vals(MUSCLE_NAME)); add(vals(F.MONTHS)); add(vals(F.MONTHS_LONG)); add(vals(F.DAYS)); add(vals(F.DAYN))
  add(vals(P.POLICY_NAME)); add(vals(P.POLICY_DESC)); add(vals(MESSAGES)); add(Object.values(MODELS).map(m => m.label))
  add(Object.values(CATEGORIES).map(c => (typeof c === 'string' ? c : c.name || c.label)))
  add(Object.values(MARKERS).map(m => m.name))
  for (const s of SCORES) add([s.name, s.what, s.formula, s.note])
  // band labels live inside each score's band() function
  add([...read('lib/labs/scores.js').matchAll(/band\('((?:\\'|[^'])*)'/g)].map(m => m[1].replace(/\\'/g, "'")))
  add(Object.values(DISHES).map(d => d.name))   // t(o.food.name) on the photo review
  add(PLAN_WHERE.map(([, label]) => label))
  for (const p of PLAN_TEMPLATES) add([p.name, p.badge, p.desc, ...p.routines.map(r => r.name)])
  for (const e of Object.values(EXIDX)) add([e.bp, e.eq, e.tg])
  add(literalTable('nutrition-sheets.jsx', 'MEAL_LABEL'))
  for (const n of ['STATUS', 'TAGS', 'LEGEND']) add(literalTable('views/Labs.jsx', n))
  // t(cond ? 'a' : 'b') — both branches are UI text
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (['locales', 'instr'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /\.jsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(d, e.name)] : [])
  for (const f of walk(SRC)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\([^'"`()]*\?\s*'((?:\\'|[^'])*)'\s*:\s*'((?:\\'|[^'])*)'/g)) add([m[1], m[2]].map(s => s.replace(/\\'/g, "'")))
  return k
}

const packs = import.meta.glob('../locales/*.js', { eager: true })
describe('translations of strings that reach t() through variables', () => {
  const keys = dynamicKeys()
  it('collects the tables', () => expect(keys.size).toBeGreaterThan(80))
  // I18N_DUMP=<file> writes every language's gaps, for the translator
  if (process.env.I18N_DUMP) fs.writeFileSync(process.env.I18N_DUMP, JSON.stringify(Object.fromEntries(Object.entries(packs).map(([f, m]) => [path.basename(f, '.js'), [...keys].filter(k => !(k in m.default))])), null, 1))
  for (const [file, mod] of Object.entries(packs)) {
    const lang = path.basename(file, '.js')
    it(`${lang} has every table string`, () => expect([...keys].filter(k => !(k in mod.default))).toEqual([]))
  }
})
