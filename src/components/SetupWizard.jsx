import { useState } from 'react'
import './SetupWizard.css'

/* ── Banderas SVG ─────────────────────────────────────────────────────────── */
const FlagSpain = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="60" height="40" fill="#C60B1E"/>
    <rect y="10" width="60" height="20" fill="#FFC400"/>
    <rect x="14" y="13" width="7" height="14" fill="#C60B1E" opacity=".8"/>
    <rect x="14" y="13" width="7" height="3" fill="#9B1C31"/>
    <rect x="14" y="24" width="7" height="3" fill="#9B1C31"/>
  </svg>
)
const FlagMexico = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="20" height="40" fill="#006847"/>
    <rect x="20" width="20" height="40" fill="#FFFFFF"/>
    <rect x="40" width="20" height="40" fill="#CE1126"/>
    <circle cx="30" cy="20" r="5" fill="none" stroke="#8B6914" strokeWidth="1"/>
    <ellipse cx="30" cy="20" rx="3" ry="2" fill="#4A7C59" opacity=".7"/>
  </svg>
)
const FlagUSA = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="60" height="40" fill="#B22234"/>
    {[0,1,2,3,4,5].map(i => (
      <rect key={i} y={i*6+3} width="60" height="3" fill="#FFFFFF"/>
    ))}
    <rect width="24" height="21" fill="#3C3B6E"/>
    {[...Array(15)].map((_,i) => {
      const col = i % 5, row = Math.floor(i / 5)
      return <circle key={i} cx={col*4.5+2.5+(row%2)*2.25} cy={row*3.5+2} r=".8" fill="#FFF"/>
    })}
  </svg>
)
const FlagRussia = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="60" height="40" fill="#FFFFFF"/>
    <rect y="13" width="60" height="14" fill="#0039A6"/>
    <rect y="27" width="60" height="13" fill="#D52B1E"/>
  </svg>
)
const FlagGermany = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="60" height="40" fill="#000000"/>
    <rect y="13" width="60" height="14" fill="#DD0000"/>
    <rect y="27" width="60" height="13" fill="#FFCE00"/>
  </svg>
)
const FlagFrance = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="20" height="40" fill="#002395"/>
    <rect x="20" width="20" height="40" fill="#FFFFFF"/>
    <rect x="40" width="20" height="40" fill="#ED2939"/>
  </svg>
)
const FlagItaly = () => (
  <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" className="flag-svg">
    <rect width="20" height="40" fill="#009246"/>
    <rect x="20" width="20" height="40" fill="#FFFFFF"/>
    <rect x="40" width="20" height="40" fill="#CE2B37"/>
  </svg>
)

const LANGUAGES = [
  { code: 'es-ES', name: 'Español', country: 'España',      Flag: FlagSpain   },
  { code: 'es-MX', name: 'Español', country: 'México',      Flag: FlagMexico  },
  { code: 'en',    name: 'English', country: 'English',     Flag: FlagUSA     },
  { code: 'ru',    name: 'Русский', country: 'Россия',      Flag: FlagRussia  },
  { code: 'de',    name: 'Deutsch', country: 'Deutschland', Flag: FlagGermany },
  { code: 'fr',    name: 'Français',country: 'France',      Flag: FlagFrance  },
  { code: 'it',    name: 'Italiano',country: 'Italia',      Flag: FlagItaly   },
]

export default function SetupWizard({ onComplete, saveSettings, settings }) {
  const [step, setStep]         = useState(0)
  const [lang, setLang]         = useState(null)
  const [username, setUsername] = useState('')
  const [javaPath, setJavaPath] = useState(settings?.javaPath || 'java')
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected]   = useState(false)

  const steps = [
    /* 0 — Idioma */
    {
      title: 'Choose your language',
      subtitle: 'Elige tu idioma / Select your language',
      wide: true,
      content: (
        <div className="lang-grid">
          {LANGUAGES.map(({ code, name, country, Flag }, i) => (
            <button
              key={code}
              className={`lang-card ${lang === code ? 'selected' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setLang(code)}
            >
              <div className="flag-wrap"><Flag /></div>
              <div className="lang-label">
                <span className="lang-country">{country}</span>
                <span className="lang-name">{name}</span>
              </div>
              {lang === code && (
                <div className="lang-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      ),
    },
    /* 1 — Bienvenida */
    {
      title: 'Bienvenido a Eclipse',
      subtitle: 'El launcher de Minecraft más limpio. Configuremos todo en 3 pasos.',
      content: (
        <div className="wizard-welcome">
          <div className="wizard-logo">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 7 7" fill="var(--accent)" stroke="none" opacity="0.3"/>
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="1.5"/>
            </svg>
          </div>
          <p>Eclipse te permite jugar Minecraft, gestionar mods, shaders y más — todo en un lugar.</p>
        </div>
      ),
    },
    /* 2 — Cuenta */
    {
      title: 'Tu primera cuenta',
      subtitle: 'Añade un nombre de usuario para empezar a jugar.',
      content: (
        <div className="wizard-field">
          <label>Nombre de usuario (offline)</label>
          <input
            autoFocus
            placeholder="Steve"
            value={username}
            onChange={e => setUsername(e.target.value.slice(0, 16))}
            maxLength={16}
          />
          <span className="wizard-hint">Puedes añadir más cuentas en la sección Cuentas.</span>
        </div>
      ),
    },
    /* 3 — Java */
    {
      title: 'Verificar Java',
      subtitle: 'Minecraft necesita Java para funcionar.',
      content: (
        <div className="wizard-java">
          <div className={`wizard-java-status ${detected ? 'ok' : ''}`}>
            {detected ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="20 6 9 17 4 12"/></svg>Java encontrado</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Java no verificado</>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" disabled={detecting} onClick={async () => {
              setDetecting(true)
              const r = await window.eclipse.detectJava()
              if (r.found) { setJavaPath(r.path); setDetected(true) }
              setDetecting(false)
            }}>
              {detecting ? 'Detectando...' : 'Detectar Java'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.openExternal('https://adoptium.net/temurin/releases/?version=22')}>
              Descargar Java
            </button>
          </div>
          <span className="wizard-hint">Si tienes Java instalado, haz clic en Detectar. Si no, descárgalo.</span>
        </div>
      ),
    },
  ]

  const handleNext = async () => {
    if (step === 2 && username.trim()) {
      const acc = { id: Date.now().toString(), type: 'offline', username: username.trim() }
      const existing = await window.eclipse.loadAccounts()
      await window.eclipse.saveAccounts([...existing, acc])
    }
    if (step === 3) {
      await saveSettings({ ...settings, javaPath, language: lang || 'es-ES' })
      onComplete()
      return
    }
    setStep(s => s + 1)
  }

  const canNext =
    step === 0 ? !!lang :
    step === 2 ? username.trim().length > 0 : true

  const cur = steps[step]

  return (
    <div className="wizard-overlay">
      <div className={`wizard-panel ${cur.wide ? 'wizard-panel--wide' : ''}`}>
        <div className="wizard-progress">
          {steps.map((_, i) => (
            <div key={i} className={`wizard-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="wizard-step">
          <h2 className="wizard-title">{cur.title}</h2>
          <p className="wizard-subtitle">{cur.subtitle}</p>
          <div className="wizard-content">{cur.content}</div>
        </div>
        <div className="wizard-footer">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="15 18 9 12 15 6"/></svg>Atrás</button>
          )}
          <button className="btn btn-primary" disabled={!canNext} onClick={handleNext}>
            {step === steps.length - 1 ? '¡Empezar!' : <>Siguiente <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle'}}><polyline points="9 18 15 12 9 6"/></svg></>}
          </button>
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={onComplete}>
            Omitir
          </button>
        </div>
      </div>
    </div>
  )
}
