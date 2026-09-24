import { useState, useEffect } from 'react'
import { ACCENT_PRESETS, useAccent } from '../hooks/useAccent'
import './SettingsView.css'

function ThemeEditor() {
  const [themes, setThemes] = useState([])
  const [editing, setEditing] = useState(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    window.eclipse.loadThemes().then(setThemes).catch(() => {})
  }, [])

  const saveThemes = async (next) => {
    setThemes(next)
    await window.eclipse.saveThemes(next)
  }

  const applyTheme = (theme) => {
    document.documentElement.style.setProperty('--accent', theme.accent)
    document.documentElement.style.setProperty('--accent-bright', theme.accentBright || theme.accent)
    document.documentElement.style.setProperty('--accent-dim', theme.accentDim || theme.accent + '33')
  }

  const exportTheme = (theme) => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `eclipse-theme-${theme.name}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const BLANK = { name: '', accent: '#7c3aed', accentBright: '#a78bfa', accentDim: '#7c3aed33' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {themes.map((t, i) => (
          <div key={t.name} className="theme-pill" style={{ '--tcolor': t.accent }}>
            <span className="theme-pill-dot" />
            <span>{t.name}</span>
            <button className="btn btn-ghost btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => applyTheme(t)}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => exportTheme(t)}>⬆</button>
            <button className="btn btn-danger btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => saveThemes(themes.filter((_, j) => j !== i))}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...BLANK }); setShowNew(true) }}>+ Nuevo tema</button>
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importar
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={async e => {
            const f = e.target.files[0]; if (!f) return
            try { const t = JSON.parse(await f.text()); await saveThemes([...themes, t]) } catch {}
          }} />
        </label>
      </div>
      {showNew && editing && (
        <div className="card" style={{ padding: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label>Nombre</label>
              <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Mi tema" />
            </div>
            <div className="field">
              <label>Acento</label>
              <input type="color" value={editing.accent} onChange={e => setEditing(p => ({ ...p, accent: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <div className="field">
              <label>Brillante</label>
              <input type="color" value={editing.accentBright} onChange={e => setEditing(p => ({ ...p, accentBright: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <div className="field">
              <label>Tenue</label>
              <input type="color" value={editing.accentDim?.slice(0,7) || '#7c3aed'} onChange={e => setEditing(p => ({ ...p, accentDim: e.target.value + '33' }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              if (!editing.name.trim()) return
              await saveThemes([...themes, editing])
              setShowNew(false); setEditing(null)
            }}>Guardar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowNew(false); setEditing(null) }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsView({ settings, saveSettings, theme, setTheme, bg, setBg }) {
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [javaList, setJavaList] = useState([])
  const [showJavaList, setShowJavaList] = useState(false)
  const [accentIdx, setAccentIdx] = useAccent()

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (!form) return <div className="view-container"><p>Cargando...</p></div>

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          Ajustes
        </h2>
      </div>

      <div className="settings-grid">
        {/* Apariencia */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            Apariencia
          </h3>

          {/* Tema */}
          <div className="field">
            <label>Tema</label>
            <div className="theme-toggle">
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                {/* moon-icon — itshover.com */}
                <svg className="theme-icon moon-svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path className="moon-path" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
                    style={{transformOrigin:'center'}}/>
                </svg>
                Oscuro
              </button>
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                {/* brightness-down-icon — itshover.com */}
                <svg className="theme-icon sun-svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path className="sun-center" d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
                    style={{transformOrigin:'center'}}/>
                  <g className="sun-rays">
                    <path d="M12 5l0 .01"/><path d="M17 7l0 .01"/>
                    <path d="M19 12l0 .01"/><path d="M17 17l0 .01"/>
                    <path d="M12 19l0 .01"/><path d="M7 17l0 .01"/>
                    <path d="M5 12l0 .01"/><path d="M7 7l0 .01"/>
                  </g>
                </svg>
                Claro
              </button>
            </div>
          </div>

          {/* Acento */}
          <div className="field" style={{ marginTop: '16px' }}>
            <label>Paleta de colores</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Azules — primeros 5 */}
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Azules</span>
                <div className="accent-grid">
                  {ACCENT_PRESETS.slice(0, 5).map((p, i) => (
                    <button
                      key={i}
                      className={`accent-dot ${accentIdx === i ? 'active' : ''}`}
                      style={{ '--dot-color': p.accent }}
                      onClick={() => setAccentIdx(i)}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
              {/* Resto */}
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Otros</span>
                <div className="accent-grid">
                  {ACCENT_PRESETS.slice(5).map((p, i) => (
                    <button
                      key={i + 5}
                      className={`accent-dot ${accentIdx === i + 5 ? 'active' : ''}`}
                      style={{ '--dot-color': p.accent }}
                      onClick={() => setAccentIdx(i + 5)}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <span className="field-hint" style={{ marginTop: 6, display: 'block' }}>
              Acento actual: <strong style={{ color: ACCENT_PRESETS[accentIdx].accent }}>{ACCENT_PRESETS[accentIdx].name}</strong>
            </span>
          </div>
        </section>

        {/* Java */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 17s-2 1-5 1c0 0 1-2 5-3"/><path d="M12 17s-2 1-5 1c0 0 1-2 5-3"/><path d="M9 9c0-2 1.5-4 4-4 2 0 4 2 4 5s-2 5-4 5"/><path d="M13 15c2 0 5-1 5-5"/>
            </svg>
            Java
          </h3>
          <div className="field">
            <label>Ruta de Java</label>
            <input
              value={form.javaPath}
              onChange={e => set('javaPath', e.target.value)}
              placeholder="java (o ruta completa)"
            />
            <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const res = await window.eclipse.detectJava()
                if (res.found) set('javaPath', res.path)
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Detectar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const javas = await window.eclipse.scanJavas()
                if (javas.length === 0) { alert('No se encontraron otras instalaciones de Java.'); return }
                setJavaList(javas)
                setShowJavaList(s => !s)
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Ver instaladas
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.openExternal('https://adoptium.net/temurin/releases/?version=22')}>
                Descargar Java
              </button>
            </div>
            {showJavaList && javaList.length > 0 && (
              <div className="java-list">
                {javaList.map(j => (
                  <button key={j.path} className={`java-list-item ${form.javaPath === j.path ? 'active' : ''}`}
                    onClick={() => { set('javaPath', j.path); setShowJavaList(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {j.label}
                  </button>
                ))}
              </div>
            )}
            <span className="field-hint">Deja "java" para usar el del sistema</span>
          </div>
        </section>

        {/* RAM */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2M7 6v12M12 6v12M17 6v12"/>
            </svg>
            Memoria RAM
          </h3>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            {[
              {
                label: 'Potato',
                ram: 1024,
                args: '-XX:+UseSerialGC -Xss512k',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="10" y="10" width="4" height="10" rx="1"/><rect x="17" y="6" width="4" height="14" rx="1"/><line x1="3" y1="14" x2="7" y2="14" opacity=".3"/><line x1="10" y1="10" x2="14" y2="10" opacity=".3"/></svg>
              },
              {
                label: 'Normal',
                ram: 2048,
                args: '-XX:+UseG1GC -XX:MaxGCPauseMillis=200',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="4" height="10" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/></svg>
              },
              {
                label: 'Gaming',
                ram: 4096,
                args: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              },
            ].map(p => (
              <button key={p.label} className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:6}}
                onClick={() => { set('ramMax', p.ram); set('jvmArgs', p.args) }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          <div className="ram-fields">
            <div className="field">
              <label>Mínimo (MB)</label>
              <input
                type="number"
                min={512}
                max={form.ramMax}
                step={256}
                value={form.ramMin}
                onChange={e => set('ramMin', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Máximo (MB)</label>
              <input
                type="number"
                min={form.ramMin}
                max={32768}
                step={256}
                value={form.ramMax}
                onChange={e => set('ramMax', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="ram-bar">
            <div
              className="ram-bar-fill"
              style={{ width: `${Math.min((form.ramMax / 8192) * 100, 100)}%` }}
            />
          </div>
          <span className="field-hint">{form.ramMax} MB asignados al juego</span>
        </section>

        {/* JVM Args */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            Argumentos JVM
          </h3>
          <div className="field">
            <label>Flags adicionales (avanzado)</label>
            <textarea
              value={form.jvmArgs ?? ''}
              onChange={e => set('jvmArgs', e.target.value)}
              placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200"
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            />
            <span className="field-hint">Separados por espacio. Afectan el rendimiento de la JVM.</span>
          </div>
          <div className="jvm-presets">
            <span style={{fontSize:12,color:'var(--text-muted)'}}>Presets:</span>
            {[
              { label: 'Alto rendimiento', args: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC' },
              { label: 'Bajo consumo',     args: '-XX:+UseSerialGC -Xss512k' },
              { label: 'Limpiar',          args: '' },
            ].map(p => (
              <button key={p.label} className="btn btn-ghost btn-sm" onClick={() => set('jvmArgs', p.args)}>
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Lanzamiento */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Lanzamiento
          </h3>
          <div className="field">
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={form.autoMinimize ?? false} onChange={e => set('autoMinimize', e.target.checked)} />
              Minimizar launcher al iniciar el juego
            </label>
            <span className="field-hint">El launcher se restaura automáticamente cuando el juego cierra.</span>
          </div>
        </section>

        {/* Carpeta del juego */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Directorio del juego
          </h3>
          <div className="field">
            <label>Carpeta raíz</label>
            <input
              value={form.gameDir}
              onChange={e => set('gameDir', e.target.value)}
            />
          </div>
        </section>

        {/* CurseForge */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 0 0 12 0c0-1.532-.671-2.467-1.5-3.5C15.5 13 14.017 12.436 12 12z"/>
            </svg>
            CurseForge
          </h3>
          <div className="field">
            <label>API Key (opcional)</label>
            <input
              type="password"
              value={form.curseforgeApiKey ?? ''}
              onChange={e => set('curseforgeApiKey', e.target.value)}
              placeholder="Tu API key de CurseForge"
            />
            <span className="field-hint">
              Obtén tu key en <strong>console.curseforge.com</strong>. Sin key se usa una clave pública con límites.
            </span>
          </div>
        </section>

        {/* Fondo */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            Fondo del Home
          </h3>
          <div className="field">
            <label>Tipo de fondo</label>
            <div className="bg-options">
              {[
                { id: 'stars',    label: 'Estrellas' },
                { id: 'gradient', label: '◈ Gradiente' },
                { id: 'solid',    label: '■ Sólido'    },
              ].map(opt => (
                <button
                  key={opt.id}
                  className={`bg-opt-btn ${(bg?.bgType || 'stars') === opt.id ? 'active' : ''}`}
                  onClick={() => setBg({ bgType: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {bg?.bgType === 'gradient' && (
            <div className="field" style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <label>Color 1</label>
                <input type="color" value={bg.bgColor1 || '#0d0d14'} onChange={e => setBg({ bgColor1: e.target.value })} style={{ width: 48, height: 32, padding: 2, cursor: 'pointer', display: 'block', marginTop: 4 }} />
              </div>
              <div>
                <label>Color 2</label>
                <input type="color" value={bg.bgColor2 || '#12122a'} onChange={e => setBg({ bgColor2: e.target.value })} style={{ width: 48, height: 32, padding: 2, cursor: 'pointer', display: 'block', marginTop: 4 }} />
              </div>
            </div>
          )}

          {bg?.bgType === 'solid' && (
            <div className="field" style={{ marginTop: 12 }}>
              <label>Color de fondo</label>
              <input type="color" value={bg.bgColor1 || '#0d0d14'} onChange={e => setBg({ bgColor1: e.target.value })} style={{ width: 48, height: 32, padding: 2, cursor: 'pointer', display: 'block', marginTop: 4 }} />
            </div>
          )}
        </section>

        {/* Misc */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/>
            </svg>
            General
          </h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.closeOnLaunch}
              onChange={e => set('closeOnLaunch', e.target.checked)}
            />
            <div>
              <span>Minimizar al lanzar</span>
              <span className="field-hint">El launcher se minimiza cuando inicia Minecraft</span>
            </div>
          </label>
          <label className="toggle-row" style={{marginTop: 10}}>
            <input
              type="checkbox"
              checked={form.autoBackup !== false}
              onChange={e => set('autoBackup', e.target.checked)}
            />
            <div>
              <span>Auto-backup al lanzar</span>
              <span className="field-hint">Guarda una copia de tus mundos antes de cada sesión (máx. 5 backups, cada 30 min)</span>
            </div>
          </label>
          <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={() => window.eclipse.openBackupsDir?.()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Ver backups guardados
          </button>
        </section>


        {/* Discord Rich Presence */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01"/>
            </svg>
            Discord Rich Presence
          </h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.discordRpc ?? false}
              onChange={e => {
                const enabled = e.target.checked
                set('discordRpc', enabled)
                if (enabled) {
                  window.eclipse.discordSetActivity({ details: 'En el launcher', state: '' })
                } else {
                  window.eclipse.discordClear()
                }
              }}
            />
            <div>
              <span>Mostrar estado en Discord</span>
              <span className="field-hint">Muestra qué versión estás jugando en tu perfil de Discord</span>
            </div>
          </label>
        </section>

        {/* Exportar / Importar */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Exportar / Importar
          </h3>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              const res = await window.eclipse.exportSettings()
              if (res.ok) alert('Backup guardado en Descargas')
            }}>⬆ Exportar configuración</button>
            <label className="btn btn-ghost btn-sm" style={{cursor:'pointer'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Importar configuración
              <input type="file" accept=".json" style={{display:'none'}} onChange={async e => {
                const file = e.target.files[0]; if (!file) return
                const text = await file.text()
                const res = await window.eclipse.importSettings(text)
                if (res.ok) { alert('Importado. Reinicia el launcher.') } else { alert('Error: ' + res.error) }
              }} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              const [instances, accounts, themes] = await Promise.all([
                window.eclipse.loadInstances().catch(() => []),
                window.eclipse.loadAccounts().catch(() => []),
                window.eclipse.loadThemes().catch(() => []),
              ])
              const res = await window.eclipse.exportProfile({ settings: form, instances, accounts, themes })
              if (res.ok) alert('Perfil exportado')
              else if (res.ok === false && !res.path) {} // cancelado
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar todo
            </button>
          </div>
        </section>

        {/* Temas */}
        <section className="card settings-section" style={{ gridColumn: '1 / -1' }}>
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
            </svg>
            Esquemas de color (acento)
          </h3>
          <ThemeEditor />
        </section>
      </div>

      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleSave}>
        {saved ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="20 6 9 17 4 12"/></svg>Guardado</> : 'Guardar cambios'}
      </button>
    </div>
  )
}
