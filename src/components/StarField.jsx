import { useEffect, useRef } from 'react'

/**
 * StarField — canvas de estrellas cayendo en el fondo.
 * Minimalista: puntos blancos con opacidad variable, caída lenta en diagonal.
 */
export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0
    let stars = []
    let rafId

    const COUNT = 55 // pocas estrellas — minimalismo

    function createStar() {
      return {
        x: Math.random() * W,
        y: Math.random() * H - H,        // empieza arriba (incluso fuera)
        size: Math.random() * 1.4 + 0.3, // 0.3 – 1.7 px
        speed: Math.random() * 0.35 + 0.12, // muy lento
        drift: (Math.random() - 0.5) * 0.15, // deriva horizontal ligera
        opacity: Math.random() * 0.5 + 0.15, // 0.15 – 0.65, nunca demasiado brillante
        twinkle: Math.random() * Math.PI * 2, // fase de parpadeo
        twinkleSpeed: Math.random() * 0.018 + 0.006,
      }
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width  = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)

      // Regenerar estrellitas al cambiar tamaño
      stars = Array.from({ length: COUNT }, () => {
        const s = createStar()
        s.y = Math.random() * H // distribuir por toda la pantalla al inicio
        return s
      })
    }

    function tick() {
      ctx.clearRect(0, 0, W, H)

      for (const s of stars) {
        // Movimiento
        s.y += s.speed
        s.x += s.drift
        s.twinkle += s.twinkleSpeed

        // Reciclar cuando salga por abajo (o por los lados)
        if (s.y > H + 4 || s.x < -4 || s.x > W + 4) {
          Object.assign(s, createStar())
          s.x = Math.random() * W
          s.y = -4
        }

        // Opacidad con parpadeo sutil (±15% de su opacidad base)
        const alpha = s.opacity * (0.85 + 0.15 * Math.sin(s.twinkle))

        // Dibujar: punto con halo muy suave
        const r = s.size
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 200, 255, ${alpha})`
        ctx.fill()

        // Halo difuso en estrellas más grandes
        if (r > 0.9) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, r * 2.5, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.5)
          grad.addColorStop(0, `rgba(167, 139, 250, ${alpha * 0.25})`)
          grad.addColorStop(1, `rgba(167, 139, 250, 0)`)
          ctx.fillStyle = grad
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    tick()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
