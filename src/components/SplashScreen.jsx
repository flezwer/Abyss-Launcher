import { useEffect, useState, useRef } from 'react'
import './SplashScreen.css'
import EclipseLogo from './EclipseLogo'
import { useT } from '../i18n'

/**
 * SplashScreen — pantalla de carga al arrancar Abyss.
 * onDone() se llama cuando termina la animación de salida.
 */
export default function SplashScreen({ onDone }) {
  const t = useT()
  const [phase, setPhase] = useState('enter')  // 'enter' | 'idle' | 'exit'
  const [barW,  setBarW]  = useState(0)
  const canvasRef = useRef(null)

  // Secuencia de fases
  useEffect(() => {
    // 1. Logo entra → empieza a llenar la barra
    const t1 = setTimeout(() => {
      // Anima la barra de 0→100% en 1.4s
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const pct = Math.min((ts - start) / 1400, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - pct, 3)
        setBarW(eased * 100)
        if (pct < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, 600)

    // 2. Salida
    const t2 = setTimeout(() => setPhase('exit'), 2400)

    // 3. Llamar onDone cuando CSS fade termina
    const t3 = setTimeout(() => onDone(), 3100)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Partículas canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let rafId

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.016
      particles.forEach(p => {
        p.x = (p.x + p.vx + W) % W
        p.y = (p.y + p.vy + H) % H
        const alpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.8 + p.phase))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${alpha})`
        ctx.fill()
      })
      rafId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className={`splash ${phase}`}>
      <canvas ref={canvasRef} className="splash-canvas" />

      {/* Halo de fondo */}
      <div className="splash-halo" />

      {/* Logo */}
      <div className="splash-logo">
        <EclipseLogo size={120} glow spin />
      </div>

      {/* Wordmark */}
      <div className="splash-wordmark">
        <span className="splash-name">Abyss</span>
        <span className="splash-tagline">Minecraft Launcher</span>
      </div>

      {/* Barra de carga */}
      <div className="splash-bar-wrap">
        <div className="splash-bar-track">
          <div className="splash-bar-fill" style={{ width: `${barW}%` }} />
          {/* Destello en la punta */}
          <div className="splash-bar-tip" style={{ left: `${barW}%` }} />
        </div>
        <span className="splash-bar-label">
          {barW < 40  ? t('shell.splashStarting')
         : barW < 80  ? t('shell.splashLoadingModules')
         : barW < 100 ? t('shell.splashAlmostReady')
         :              t('shell.splashWelcome')}
        </span>
      </div>

      {/* Versión */}
      <span className="splash-version">v1.1.0</span>
    </div>
  )
}
