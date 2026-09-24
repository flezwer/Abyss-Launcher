import './TitleBar.css'
import EclipseLogo from './EclipseLogo'

/* ── Icono Cerrar — x-icon de itshover ── */
function IconClose() {
  return (
    <svg className="wc-svg" width="10" height="10" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
      <path className="wc-x1" d="M18 6L6 18" style={{transformOrigin:'50% 50%', transformBox:'fill-box'}}/>
      <path className="wc-x2" d="M6 6l12 12"  style={{transformOrigin:'50% 50%', transformBox:'fill-box'}}/>
    </svg>
  )
}

/* ── Icono Minimizar — línea con animación de caída ── */
function IconMinimize() {
  return (
    <svg className="wc-svg" width="10" height="10" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
      <path className="wc-minus" d="M5 12h14" style={{transformOrigin:'50% 50%', transformBox:'fill-box'}}/>
    </svg>
  )
}

/* ── Icono Maximizar — expand-icon de itshover ── */
function IconMaximize() {
  return (
    <svg className="wc-svg" width="10" height="10" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path className="wc-corners wc-tr" d="M21 8V3h-5"/>
      <path className="wc-arrow  wc-tr" d="M15 9l6-6"/>
      <path className="wc-corners wc-br" d="M21 16v5h-5"/>
      <path className="wc-arrow  wc-br" d="m15 15 6 6"/>
      <path className="wc-corners wc-bl" d="M3 16v5h5"/>
      <path className="wc-arrow  wc-bl" d="m3 21 6-6"/>
      <path className="wc-corners wc-tl" d="M3 8V3h5"/>
      <path className="wc-arrow  wc-tl" d="M9 9 3 3"/>
    </svg>
  )
}

/* ── Click animation helper ── */
function flash(e) {
  const btn = e.currentTarget
  btn.classList.remove('wc-clicked') // reset si ya está
  void btn.offsetWidth               // force reflow para reiniciar animación
  btn.classList.add('wc-clicked')
  setTimeout(() => btn.classList.remove('wc-clicked'), 400)
}

export default function TitleBar({ breadcrumb = 'Inicio' }) {
  return (
    <div className="titlebar">
      {/* Logo */}
      <div className="titlebar-logo">
        <EclipseLogo size={28} glow spin />
        <span className="titlebar-logo-text">Abyss</span>
      </div>

      {/* Nav arrows */}
      <div className="titlebar-nav">
        <button title="Atrás">‹</button>
        <button title="Adelante">›</button>
      </div>

      {/* Breadcrumb */}
      <span className="titlebar-breadcrumb">▷ {breadcrumb}</span>

      <div className="titlebar-drag" />

      {/* Window controls */}
      <div className="titlebar-controls">
        <button className="wc wc-close" onClick={e => { flash(e); window.eclipse.close() }}>
          <IconClose />
          <span className="wc-label">Cerrar</span>
        </button>
        <button className="wc wc-min" onClick={e => { flash(e); window.eclipse.minimize() }}>
          <IconMinimize />
          <span className="wc-label">Minimizar</span>
        </button>
        <button className="wc wc-max" onClick={e => { flash(e); window.eclipse.maximize() }}>
          <IconMaximize />
          <span className="wc-label">Maximizar</span>
        </button>
      </div>
    </div>
  )
}
