import './LiquidButton.css'

/**
 * LiquidButton — botón con efecto liquid fill al hacer clic.
 * Props:
 *   - onClick: función async que devuelve progreso (0-100) o simplemente completa
 *   - onProgress: (opcional) número 0-100 controlado desde afuera
 *   - loading: bool controlado desde afuera
 *   - disabled: bool
 *   - className: clases extra
 *   - idleLabel: contenido en estado normal  (default: "Instalar")
 *   - loadingLabel: contenido mientras carga (default: "Instalando...")
 *   - doneLabel: contenido al terminar      (default: "✓ Listo")
 *   - showDone: mostrar estado "done" brevemente
 */
export default function LiquidButton({
  onClick,
  loading = false,
  progress = 0,
  disabled = false,
  className = '',
  idleLabel    = 'Instalar',
  loadingLabel = null,
  doneLabel    = 'Listo',
  done = false,
  size = 'sm', // 'sm' | 'md' | 'lg'
}) {
  const pct = Math.max(Math.min(progress, 100), loading ? 6 : 0)

  let stateClass = ''
  if (done)    stateClass = 'lb-done'
  else if (loading) stateClass = 'lb-loading'

  return (
    <button
      className={`liquid-btn lb-${size} ${stateClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading || done}
    >
      {/* Capa de fondo sólido (visible en idle y done) */}
      <span className="lb-bg" />

      {/* Líquido que sube */}
      <span
        className="lb-liquid"
        style={{ height: `${pct}%` }}
      />

      {/* Label — siempre encima */}
      <span className="lb-label">
        {done
          ? doneLabel
          : loading
            ? (loadingLabel ?? <><span className="lb-spinner" /> {progress > 0 ? `${Math.round(progress)}%` : 'Instalando...'}</>)
            : idleLabel}
      </span>
    </button>
  )
}
