import { useState, useEffect } from 'react'

// Each preset: [accent hex, accent-dim hex, accent-bright hex, glow rgba]
export const ACCENT_PRESETS = [
  // ── Azules (primeros por ser el color oficial de Abyss) ──
  { name: 'Abyss',      accent: '#1d6fff', dim: '#1450cc', bright: '#60a5fa', glow: 'rgba(29,111,255,0.28)'  },
  { name: 'Azul',       accent: '#3b82f6', dim: '#2563eb', bright: '#60a5fa', glow: 'rgba(59,130,246,0.25)'  },
  { name: 'Cobalto',    accent: '#0ea5e9', dim: '#0284c7', bright: '#38bdf8', glow: 'rgba(14,165,233,0.25)'  },
  { name: 'Índigo',     accent: '#6366f1', dim: '#4f46e5', bright: '#818cf8', glow: 'rgba(99,102,241,0.25)'  },
  { name: 'Marina',     accent: '#1e40af', dim: '#1e3a8a', bright: '#3b82f6', glow: 'rgba(30,64,175,0.28)'   },
  // ── Otros colores ──
  { name: 'Violeta',    accent: '#7c6af7', dim: '#5b4ee0', bright: '#a78bfa', glow: 'rgba(124,106,247,0.25)' },
  { name: 'Cian',       accent: '#06b6d4', dim: '#0891b2', bright: '#22d3ee', glow: 'rgba(6,182,212,0.25)'   },
  { name: 'Verde',      accent: '#22c55e', dim: '#16a34a', bright: '#4ade80', glow: 'rgba(34,197,94,0.25)'   },
  { name: 'Esmeralda',  accent: '#10b981', dim: '#059669', bright: '#34d399', glow: 'rgba(16,185,129,0.25)'  },
  { name: 'Rosa',       accent: '#ec4899', dim: '#db2777', bright: '#f472b6', glow: 'rgba(236,72,153,0.25)'  },
  { name: 'Fucsia',     accent: '#d946ef', dim: '#c026d3', bright: '#e879f9', glow: 'rgba(217,70,239,0.25)'  },
  { name: 'Naranja',    accent: '#f97316', dim: '#ea580c', bright: '#fb923c', glow: 'rgba(249,115,22,0.25)'  },
  { name: 'Dorado',     accent: '#eab308', dim: '#ca8a04', bright: '#facc15', glow: 'rgba(234,179,8,0.25)'   },
  { name: 'Rojo',       accent: '#ef4444', dim: '#dc2626', bright: '#f87171', glow: 'rgba(239,68,68,0.25)'   },
  { name: 'Blanco',     accent: '#e2e8f0', dim: '#94a3b8', bright: '#f8fafc', glow: 'rgba(226,232,240,0.20)' },
]

function applyAccent(preset) {
  const r = document.documentElement
  r.style.setProperty('--accent',       preset.accent)
  r.style.setProperty('--accent-dim',   preset.dim)
  r.style.setProperty('--accent-bright',preset.bright)
  r.style.setProperty('--accent-glow',  preset.glow)
  r.style.setProperty('--border-hover', preset.glow.replace('0.25','0.4'))
}

export function useAccent() {
  const [accentIdx, setAccentIdx] = useState(() => {
    const saved = localStorage.getItem('abyss-accent') ?? localStorage.getItem('eclipse-accent')
    return saved !== null ? Number(saved) : 0  // default: Abyss (azul)
  })

  useEffect(() => {
    applyAccent(ACCENT_PRESETS[accentIdx])
    localStorage.setItem('abyss-accent', accentIdx)
  }, [accentIdx])

  return [accentIdx, setAccentIdx]
}
