export function fmtTime(ms) {
  if (!ms) return '0m'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function fmtSecs(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000)
  if (d >= 1) return `hace ${d}d`
  if (h >= 1) return `hace ${h}h`
  if (m >= 1) return `hace ${m}m`
  return 'hace un momento'
}
