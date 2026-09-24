import { useState, useEffect } from 'react'

const DEFAULTS = { bgType: 'stars', bgColor1: '#0d0d14', bgColor2: '#12122a' }

function computeStyle(bg) {
  if (bg.bgType === 'gradient')
    return { background: `linear-gradient(135deg, ${bg.bgColor1 || DEFAULTS.bgColor1}, ${bg.bgColor2 || DEFAULTS.bgColor2})` }
  if (bg.bgType === 'solid')
    return { background: bg.bgColor1 || DEFAULTS.bgColor1 }
  return {}
}

function loadBg() {
  try {
    const saved = localStorage.getItem('eclipse-bg')
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
  } catch { return DEFAULTS }
}

export function useBg() {
  const [bg, setBgState] = useState(loadBg)

  useEffect(() => {
    try { localStorage.setItem('eclipse-bg', JSON.stringify(bg)) } catch {}
  }, [bg])

  const setBg = (partial) => setBgState(prev => ({ ...prev, ...partial }))

  return [bg, setBg, computeStyle(bg)]
}
