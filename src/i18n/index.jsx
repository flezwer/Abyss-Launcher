import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/*
 * Launcher translations.
 * Every file in ./locales/ exports a namespace object:
 *   export default { 'es-ES': { key: '…' }, 'es-MX': { … }, en: { … }, it, fr, de, ru }
 * The file name is the namespace, so t('home.play') reads locales/home.js → key "play".
 * es-ES is the source language and the fallback for any missing key;
 * es-MX only needs the keys that differ from es-ES.
 */

export const LANGS = [
  { code: 'es-ES', name: 'Español',  country: 'España',      intl: 'es-ES' },
  { code: 'es-MX', name: 'Español',  country: 'Latinoamérica', intl: 'es-MX' },
  { code: 'en',    name: 'English',  country: 'English',     intl: 'en-US' },
  { code: 'it',    name: 'Italiano', country: 'Italia',      intl: 'it-IT' },
  { code: 'fr',    name: 'Français', country: 'France',      intl: 'fr-FR' },
  { code: 'de',    name: 'Deutsch',  country: 'Deutschland', intl: 'de-DE' },
  { code: 'ru',    name: 'Русский',  country: 'Россия',      intl: 'ru-RU' },
]
const CODES = LANGS.map(l => l.code)
export const DEFAULT_LANG = 'es-ES'
const STORAGE_KEY = 'abyss-lang'

const modules = import.meta.glob('./locales/*.js', { eager: true })
const DICT = {}
for (const [path, mod] of Object.entries(modules)) {
  const ns = path.match(/\.\/locales\/(.+)\.js$/)[1]
  DICT[ns] = mod.default || {}
}

let currentLang = readStoredLang() || DEFAULT_LANG

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return CODES.includes(v) ? v : null
  } catch { return null }
}

/** The language currently in use (for code that writes settings.json). */
export function getLang() { return currentLang }

/** True until someone picks a language (the setup wizard asks first). */
export function hasChosenLang() { return readStoredLang() !== null }

function lookup(lang, key) {
  const dot = key.indexOf('.')
  const ns = DICT[key.slice(0, dot)]
  if (!ns) return undefined
  const k = key.slice(dot + 1)
  return ns[lang]?.[k] ?? ns[DEFAULT_LANG]?.[k]
}

/** Plain function for code outside React components (utils, hooks). */
export function translate(key, vars, lang = currentLang) {
  let s = lookup(lang, key)
  if (s == null) {
    if (import.meta.env.DEV) console.warn('[i18n] missing key', key)
    return key
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? ''))
  return s
}

/** Intl locale for dates and numbers in the current language. */
export function intlLocale(lang = currentLang) {
  return LANGS.find(l => l.code === lang)?.intl || 'es-ES'
}

const I18nContext = createContext({ lang: currentLang, setLang: () => {}, t: translate, locale: intlLocale() })

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang)

  const setLang = useCallback((code, { persist = true } = {}) => {
    if (!CODES.includes(code)) return
    currentLang = code
    setLangState(code)
    document.documentElement.lang = code
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, code) } catch {}
      // Keep settings.json in sync so the choice survives a reinstall of the renderer cache
      window.eclipse?.loadSettings?.().then(s => {
        if (s && s.language !== code) window.eclipse.saveSettings({ ...s, language: code })
      }).catch(() => {})
    }
  }, [])

  // settings.json wins over the renderer cache when they disagree
  useEffect(() => {
    document.documentElement.lang = currentLang
    window.eclipse?.loadSettings?.().then(s => {
      if (s?.language && CODES.includes(s.language) && s.language !== currentLang) {
        setLang(s.language, { persist: false })
        try { localStorage.setItem(STORAGE_KEY, s.language) } catch {}
      }
    }).catch(() => {})
  }, [setLang])

  const value = useMemo(() => ({
    lang,
    setLang,
    locale: intlLocale(lang),
    t: (key, vars) => translate(key, vars, lang),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() { return useContext(I18nContext) }
export function useT() { return useContext(I18nContext).t }
