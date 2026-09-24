import { translate } from '../i18n'

const KEY = 'eclipse-activity'
const MAX = 20

// Older entries (and callers that still pass Spanish text) are stored as plain text;
// these patterns let them be shown in the current language.
const LEGACY = [
  [/^Lanzaste Minecraft (.+)$/, 'time.activityLaunched', 'version'],
  [/^Instancia creada: (.+)$/, 'time.activityInstanceCreated', 'name'],
  [/^Backup creado: (.+)$/, 'time.activityBackupCreated', 'name'],
]

function toEntry(text, vars) {
  if (vars) return { key: text, vars }
  for (const [re, key, v] of LEGACY) {
    const m = typeof text === 'string' && text.match(re)
    if (m) return { key, vars: { [v]: m[1] } }
  }
  return { text }
}

/**
 * logActivity('time.activityLaunched', { version }) stores a translation key,
 * logActivity('some text') stores the text as is.
 */
export function logActivity(text, vars) {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || '[]')
    const next = [{ ...toEntry(text, vars), time: Date.now() }, ...prev].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}

export function getActivity() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return list.map(item => {
      const e = item.key ? item : { ...item, ...toEntry(item.text) }
      return e.key ? { ...e, text: translate(e.key, e.vars) } : e
    })
  } catch { return [] }
}
