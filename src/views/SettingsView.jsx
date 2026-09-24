import { useState, useEffect } from 'react'
import { ACCENT_PRESETS, useAccent } from '../hooks/useAccent'
import { useT, useI18n, LANGS } from '../i18n'
import './SettingsView.css'

// Accent presets keep their Spanish `name` as a stable id; the label is translated here.
const accentLabel = (t, p) => p.name === 'Abyss'
  ? p.name
  : t(`settings.accent_${p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`)

// Renders a translated string with a single {placeholder} replaced by a React node.
const withSlot = (str, node) => {
  const [before, after = ''] = str.split(/\{\w+\}/)
  return <>{before}{node}{after}</>
}

function ThemeEditor() {
  const t = useT()
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
        {themes.map((th, i) => (
          <div key={th.name} className="theme-pill" style={{ '--tcolor': th.accent }}>
            <span className="theme-pill-dot" />
            <span>{th.name}</span>
            <button className="btn btn-ghost btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => applyTheme(th)}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => exportTheme(th)}>⬆</button>
            <button className="btn btn-danger btn-sm" style={{ padding: '1px 4px', fontSize: 11 }} onClick={() => saveThemes(themes.filter((_, j) => j !== i))}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...BLANK }); setShowNew(true) }}>+ {t('settings.newTheme')}</button>
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {t('settings.import')}
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={async e => {
            const f = e.target.files[0]; if (!f) return
            try { const th = JSON.parse(await f.text()); await saveThemes([...themes, th]) } catch {}
          }} />
        </label>
      </div>
      {showNew && editing && (
        <div className="card" style={{ padding: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label>{t('settings.themeName')}</label>
              <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder={t('settings.themeNamePlaceholder')} />
            </div>
            <div className="field">
              <label>{t('settings.themeAccent')}</label>
              <input type="color" value={editing.accent} onChange={e => setEditing(p => ({ ...p, accent: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <div className="field">
              <label>{t('settings.themeBright')}</label>
              <input type="color" value={editing.accentBright} onChange={e => setEditing(p => ({ ...p, accentBright: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <div className="field">
              <label>{t('settings.themeDim')}</label>
              <input type="color" value={editing.accentDim?.slice(0,7) || '#7c3aed'} onChange={e => setEditing(p => ({ ...p, accentDim: e.target.value + '33' }))} style={{ width: 48, height: 32, cursor: 'pointer', padding: 2, display: 'block', marginTop: 4 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              if (!editing.name.trim()) return
              await saveThemes([...themes, editing])
              setShowNew(false); setEditing(null)
            }}>{t('settings.save')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowNew(false); setEditing(null) }}>{t('settings.cancel')}</button>
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
  const t = useT()
  const { lang, setLang } = useI18n()

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (!form) return <div className="view-container"><p>{t('settings.loading')}</p></div>

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    // setLang already persists the language; keep it so saving the form doesn't revert it
    await saveSettings({ ...form, language: lang })
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
          {t('settings.title')}
        </h2>
      </div>

      <div className="settings-grid">
        {/* Apariencia */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            {t('settings.appearance')}
          </h3>

          {/* Idioma */}
          <div className="field lang-field">
            <label>{t('settings.language')}</label>
            <div className="lang-grid">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  className={`lang-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  lang={l.code}
                >
                  <span className="lang-btn-name">{l.name}</span>
                  {l.country !== l.name && <span className="lang-btn-country">· {l.country}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Tema */}
          <div className="field">
            <label>{t('settings.theme')}</label>
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
                {t('settings.themeDark')}
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
                {t('settings.themeLight')}
              </button>
            </div>
          </div>

          {/* Acento */}
          <div className="field" style={{ marginTop: '16px' }}>
            <label>{t('settings.colorPalette')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Azules — primeros 5 */}
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{t('settings.accentBlues')}</span>
                <div className="accent-grid">
                  {ACCENT_PRESETS.slice(0, 5).map((p, i) => (
                    <button
                      key={i}
                      className={`accent-dot ${accentIdx === i ? 'active' : ''}`}
                      style={{ '--dot-color': p.accent }}
                      onClick={() => setAccentIdx(i)}
                      title={accentLabel(t, p)}
                    />
                  ))}
                </div>
              </div>
              {/* Resto */}
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{t('settings.accentOthers')}</span>
                <div className="accent-grid">
                  {ACCENT_PRESETS.slice(5).map((p, i) => (
                    <button
                      key={i + 5}
                      className={`accent-dot ${accentIdx === i + 5 ? 'active' : ''}`}
                      style={{ '--dot-color': p.accent }}
                      onClick={() => setAccentIdx(i + 5)}
                      title={accentLabel(t, p)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <span className="field-hint" style={{ marginTop: 6, display: 'block' }}>
              {withSlot(t('settings.currentAccent'), <strong style={{ color: ACCENT_PRESETS[accentIdx].accent }}>{accentLabel(t, ACCENT_PRESETS[accentIdx])}</strong>)}
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
            <label>{t('settings.javaPath')}</label>
            <input
              value={form.javaPath}
              onChange={e => set('javaPath', e.target.value)}
              placeholder={t('settings.javaPathPlaceholder')}
            />
            <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const res = await window.eclipse.detectJava()
                if (res.found) set('javaPath', res.path)
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {t('settings.detect')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const javas = await window.eclipse.scanJavas()
                if (javas.length === 0) { alert(t('settings.noOtherJavas')); return }
                setJavaList(javas)
                setShowJavaList(s => !s)
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                {t('settings.showInstalled')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.openExternal('https://adoptium.net/temurin/releases/?version=22')}>
                {t('settings.downloadJava')}
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
            <span className="field-hint">{t('settings.javaHint')}</span>
          </div>
        </section>

        {/* RAM */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2M7 6v12M12 6v12M17 6v12"/>
            </svg>
            {t('settings.ramTitle')}
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
                {p.icon} {t(`settings.ramPreset${p.label}`)}
              </button>
            ))}
          </div>
          <div className="ram-fields">
            <div className="field">
              <label>{t('settings.ramMin')}</label>
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
              <label>{t('settings.ramMax')}</label>
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
          <span className="field-hint">{t('settings.ramAssigned', { mb: form.ramMax })}</span>
        </section>

        {/* JVM Args */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            {t('settings.jvmTitle')}
          </h3>
          <div className="field">
            <label>{t('settings.jvmFlags')}</label>
            <textarea
              value={form.jvmArgs ?? ''}
              onChange={e => set('jvmArgs', e.target.value)}
              placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200"
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            />
            <span className="field-hint">{t('settings.jvmHint')}</span>
          </div>
          <div className="jvm-presets">
            <span style={{fontSize:12,color:'var(--text-muted)'}}>{t('settings.presets')}</span>
            {[
              { label: 'jvmPresetPerformance', args: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC' },
              { label: 'jvmPresetLowPower',    args: '-XX:+UseSerialGC -Xss512k' },
              { label: 'jvmPresetClear',       args: '' },
            ].map(p => (
              <button key={p.label} className="btn btn-ghost btn-sm" onClick={() => set('jvmArgs', p.args)}>
                {t(`settings.${p.label}`)}
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
            {t('settings.launchTitle')}
          </h3>
          <div className="field">
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={form.autoMinimize ?? false} onChange={e => set('autoMinimize', e.target.checked)} />
              {t('settings.autoMinimize')}
            </label>
            <span className="field-hint">{t('settings.autoMinimizeHint')}</span>
          </div>
        </section>

        {/* Carpeta del juego */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {t('settings.gameDirTitle')}
          </h3>
          <div className="field">
            <label>{t('settings.gameDirRoot')}</label>
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
            <label>{t('settings.cfApiKey')}</label>
            <input
              type="password"
              value={form.curseforgeApiKey ?? ''}
              onChange={e => set('curseforgeApiKey', e.target.value)}
              placeholder={t('settings.cfApiKeyPlaceholder')}
            />
            <span className="field-hint">
              {withSlot(t('settings.cfHint'), <strong>console.curseforge.com</strong>)}
            </span>
          </div>
        </section>

        {/* Fondo */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            {t('settings.bgTitle')}
          </h3>
          <div className="field">
            <label>{t('settings.bgType')}</label>
            <div className="bg-options">
              {[
                { id: 'stars',    label: t('settings.bgStars') },
                { id: 'gradient', label: `◈ ${t('settings.bgGradient')}` },
                { id: 'solid',    label: `■ ${t('settings.bgSolid')}` },
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
                <label>{t('settings.bgColorN', { n: 1 })}</label>
                <input type="color" value={bg.bgColor1 || '#0d0d14'} onChange={e => setBg({ bgColor1: e.target.value })} style={{ width: 48, height: 32, padding: 2, cursor: 'pointer', display: 'block', marginTop: 4 }} />
              </div>
              <div>
                <label>{t('settings.bgColorN', { n: 2 })}</label>
                <input type="color" value={bg.bgColor2 || '#12122a'} onChange={e => setBg({ bgColor2: e.target.value })} style={{ width: 48, height: 32, padding: 2, cursor: 'pointer', display: 'block', marginTop: 4 }} />
              </div>
            </div>
          )}

          {bg?.bgType === 'solid' && (
            <div className="field" style={{ marginTop: 12 }}>
              <label>{t('settings.bgColor')}</label>
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
            {t('settings.generalTitle')}
          </h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.closeOnLaunch}
              onChange={e => set('closeOnLaunch', e.target.checked)}
            />
            <div>
              <span>{t('settings.minimizeOnLaunch')}</span>
              <span className="field-hint">{t('settings.minimizeOnLaunchHint')}</span>
            </div>
          </label>
          <label className="toggle-row" style={{marginTop: 10}}>
            <input
              type="checkbox"
              checked={form.autoBackup !== false}
              onChange={e => set('autoBackup', e.target.checked)}
            />
            <div>
              <span>{t('settings.autoBackup')}</span>
              <span className="field-hint">{t('settings.autoBackupHint')}</span>
            </div>
          </label>
          <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={() => window.eclipse.openBackupsDir?.()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            {t('settings.openBackups')}
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
                  window.eclipse.discordSetActivity({ details: t('settings.discordInLauncher'), state: '' })
                } else {
                  window.eclipse.discordClear()
                }
              }}
            />
            <div>
              <span>{t('settings.discordShow')}</span>
              <span className="field-hint">{t('settings.discordShowHint')}</span>
            </div>
          </label>
        </section>

        {/* Exportar / Importar */}
        <section className="card settings-section">
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {t('settings.exportImportTitle')}
          </h3>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              const res = await window.eclipse.exportSettings()
              if (res.ok) alert(t('settings.exportSettingsDone'))
            }}>⬆ {t('settings.exportSettings')}</button>
            <label className="btn btn-ghost btn-sm" style={{cursor:'pointer'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {t('settings.importSettings')}
              <input type="file" accept=".json" style={{display:'none'}} onChange={async e => {
                const file = e.target.files[0]; if (!file) return
                const text = await file.text()
                const res = await window.eclipse.importSettings(text)
                if (res.ok) { alert(t('settings.importDone')) } else { alert(t('settings.importError', { error: res.error })) }
              }} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              const [instances, accounts, themes] = await Promise.all([
                window.eclipse.loadInstances().catch(() => []),
                window.eclipse.loadAccounts().catch(() => []),
                window.eclipse.loadThemes().catch(() => []),
              ])
              const res = await window.eclipse.exportProfile({ settings: form, instances, accounts, themes })
              if (res.ok) alert(t('settings.exportAllDone'))
              else if (res.ok === false && !res.path) {} // cancelado
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {t('settings.exportAll')}
            </button>
          </div>
        </section>

        {/* Temas */}
        <section className="card settings-section" style={{ gridColumn: '1 / -1' }}>
          <h3 className="settings-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
            </svg>
            {t('settings.colorSchemes')}
          </h3>
          <ThemeEditor />
        </section>
      </div>

      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleSave}>
        {saved ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="20 6 9 17 4 12"/></svg>{t('settings.saved')}</> : t('settings.saveChanges')}
      </button>
    </div>
  )
}
