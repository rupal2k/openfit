// Tiny dependency-free i18n. English source strings are the keys; locale files in
// src/locales/ map them to translations and are lazy-loaded (Vite code-splits each
// import.meta.glob entry), so the initial bundle stays English-only.
// Exercise instructions come from separately generated packs in src/instr/ (one per
// language, from the upstream dataset) — also lazy-loaded on language switch.
import { useSyncExternalStore } from 'react'

// UI languages. de/pt have no instruction pack upstream — instructions fall back to English.
export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी'
}
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko']
const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN'
}

const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')

let lang = 'en'
let dict = {}
// instruction packs, loaded only when an exercise detail opens (performance audit 1.6.2: the
// English steps were 70% of the dataset and every pack was parsed at start-up)
const instrCache = {}       // pack name -> { exId: [steps] }
let version = 0
let loadGen = 0   // newest setLang call wins
const subs = new Set()
const notify = () => { version++; subs.forEach(f => f()) }

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  // QA hook: a tester sets globalThis.__i18nMiss = new Set() to collect strings with no
  // translation while walking the app (most keys are variables a source scan can't follow)
  if (lang !== 'en' && !dict[s] && globalThis.__i18nMiss && typeof s === 'string') globalThis.__i18nMiss.add(s)
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
const instrPack = () => (INSTR_LANGS.includes(lang) ? lang : 'en')
// Instructions for an exercise in the current language (English steps as fallback), from the
// packs loaded so far; [] until loadInstr() has fetched them.
export const instrFor = ex => (instrCache[instrPack()] && instrCache[instrPack()][ex.id]) || (instrCache.en && instrCache.en[ex.id]) || ex.st || []
export async function loadInstr() {
  for (const name of new Set([instrPack(), 'en'])) {
    if (instrCache[name]) continue
    try { instrCache[name] = (await instrPacks['../instr/' + name + '.js']()).default } catch { instrCache[name] = {} }
  }
}

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  if (l === lang && version > 0) return
  lang = l
  const gen = ++loadGen
  try {
    const d = l === 'en' ? {} : (await localePacks['../locales/' + l + '.js']()).default
    if (gen !== loadGen) return
    dict = d
  } catch (e) { if (gen !== loadGen) return; dict = {} }
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, () => version)
}
