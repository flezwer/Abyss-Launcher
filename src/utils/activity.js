const KEY = 'eclipse-activity'
const MAX = 20

export function logActivity(text) {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || '[]')
    const next = [{ text, time: Date.now() }, ...prev].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}

export function getActivity() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
