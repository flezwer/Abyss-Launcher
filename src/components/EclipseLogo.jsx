import './EclipseLogo.css'

/**
 * EclipseLogo — SVG logo animado del launcher Eclipse.
 * Props:
 *   size: número en px (default 32)
 *   glow: bool — si muestra el anillo de plasma (default true)
 *   spin: bool — si giran las partículas orbitales (default true)
 */
export default function EclipseLogo({ size = 32, glow = true, spin = true, className = '' }) {
  const s = size
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.34       // radio del planeta oscuro
  const ringR = s * 0.44   // radio del anillo de plasma

  return (
    <svg
      className={`eclipse-logo ${glow ? 'eclipse-glow' : ''} ${className}`}
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente del planeta */}
        <radialGradient id="planetGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#2a2040" />
          <stop offset="60%"  stopColor="#0d0b18" />
          <stop offset="100%" stopColor="#060410" />
        </radialGradient>

        {/* Glow del anillo */}
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--accent-bright)" stopOpacity="0" />
          <stop offset="60%"  stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>

        {/* Filtro bloom */}
        <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={s * 0.04} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Filtro glow suave para el anillo */}
        <filter id="ringBloom" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={s * 0.06} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip del planeta para la sombra del eclipse */}
        <clipPath id="eclipseClip">
          <circle cx={cx} cy={cy} r={r + 1} />
        </clipPath>
      </defs>

      {/* ── Halo exterior difuso ── */}
      <circle
        cx={cx} cy={cy} r={ringR * 1.3}
        fill="url(#ringGlow)"
        className="eclipse-halo"
      />

      {/* ── Anillo de plasma principal ── */}
      <circle
        cx={cx} cy={cy} r={ringR}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={s * 0.055}
        strokeLinecap="round"
        filter="url(#ringBloom)"
        className="eclipse-ring"
      />

      {/* Arco brillante superior del anillo (el "flash" del eclipse) */}
      <path
        d={describeArc(cx, cy, ringR, -60, 60)}
        fill="none"
        stroke="var(--accent-bright)"
        strokeWidth={s * 0.035}
        strokeLinecap="round"
        filter="url(#bloom)"
        className="eclipse-arc"
      />

      {/* ── Planeta oscuro ── */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="url(#planetGrad)"
        filter="url(#bloom)"
      />

      {/* Brillo interno del planeta (specular) */}
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.28}
        rx={r * 0.28}
        ry={r * 0.18}
        fill="var(--accent-glow)"
        transform={`rotate(-30, ${cx}, ${cy})`}
      />

      {/* Línea de terminador (borde luz/sombra del planeta) */}
      <path
        d={describeArc(cx, cy, r - 1, -80, 80)}
        fill="none"
        stroke="var(--accent-glow)"
        strokeWidth={s * 0.02}
      />

      {/* ── Partículas orbitales ── */}
      {spin && (
        <g className="eclipse-orbit">
          {/* Órbita 1 */}
          <g className="orbit-ring orbit-1">
            <circle cx={cx + ringR * 1.18} cy={cy} r={s * 0.025} fill="var(--accent-bright)" opacity="0.9" />
            <circle cx={cx - ringR * 1.18} cy={cy} r={s * 0.016} fill="var(--accent)" opacity="0.6" />
          </g>
          {/* Órbita 2 */}
          <g className="orbit-ring orbit-2">
            <circle cx={cx + ringR * 1.28} cy={cy} r={s * 0.018} fill="var(--accent-bright)" opacity="0.7" />
            <circle cx={cx - ringR * 1.28} cy={cy} r={s * 0.012} fill="var(--accent-bright)" opacity="0.4" />
          </g>
        </g>
      )}

      {/* ── Corona solar (destellos en el borde del eclipse) ── */}
      <g filter="url(#bloom)" className="eclipse-corona">
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = cx + Math.cos(rad) * r
          const y1 = cy + Math.sin(rad) * r
          const x2 = cx + Math.cos(rad) * (r + s * 0.09)
          const y2 = cy + Math.sin(rad) * (r + s * 0.09)
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--accent)"
              strokeWidth={s * 0.015}
              strokeLinecap="round"
              opacity="0.5"
            />
          )
        })}
      </g>
    </svg>
  )
}

// Helper: describe arc SVG path
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end   = polarToCartesian(cx, cy, r, startAngle)
  const large = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
