import { useState, useEffect } from 'react'
import './WorldsView.css'
import { useI18n } from '../i18n'

export default function WorldsView({ settings }) {
  const { t, locale } = useI18n()
  const [worlds, setWorlds] = useState([])
  const [loading, setLoading] = useState(false)
  const [backingUp, setBackingUp] = useState({})
  const [deletingWorld, setDeletingWorld] = useState({})

  const gameDir = settings?.gameDir ?? ''

  const load = async () => {
    if (!gameDir) return
    setLoading(true)
    const list = await window.eclipse.listWorlds({ gameDir })
    setWorlds(list)
    setLoading(false)
  }

  useEffect(() => { load() }, [gameDir])

  const backup = async (world) => {
    setBackingUp(prev => ({ ...prev, [world.name]: true }))
    await window.eclipse.backupWorld({ worldPath: world.path, name: world.name })
    setBackingUp(prev => ({ ...prev, [world.name]: false }))
  }

  const deleteWorld = async (world) => {
    setDeletingWorld(prev => ({ ...prev, [world.name]: 'eating' }))
    await new Promise(r => setTimeout(r, 420))
    setDeletingWorld(prev => ({ ...prev, [world.name]: 'collapsing' }))
    await new Promise(r => setTimeout(r, 300))
    await window.eclipse.deleteWorld({ worldPath: world.path })
    setDeletingWorld(prev => { const n = { ...prev }; delete n[world.name]; return n })
    load()
  }

  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          {t('worlds.title')}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ {t('worlds.refresh')}</button>
      </div>

      {loading && <div className="worlds-loading"><span className="big-spinner"/></div>}

      {!loading && worlds.length === 0 && (
        <div className="view-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.35}}>
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <p>{t('worlds.empty', { path: `${gameDir}/saves` })}</p>
        </div>
      )}

      <div className="worlds-grid">
        {worlds.map(world => {
          const isEating = deletingWorld[world.name] === 'eating'
          const isCollapsing = deletingWorld[world.name] === 'collapsing'
          return (
            <div key={world.name} className={`world-card card ${isEating ? 'bin-eating-card' : ''} ${isCollapsing ? 'bin-collapsing-card' : ''}`}>
              <div className="world-icon bin-label">
                {world.hasIcon
                  ? <img src={`file://${world.iconPath}`} alt={world.name} className="world-img" />
                  : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.5}}>
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>}
              </div>
              <div className="world-info bin-label">
                <div className="world-name">{world.name}</div>
                <div className="world-date">{t('worlds.lastPlayed', { date: fmt(world.lastModified) })}</div>
              </div>
              <div className="world-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.openWorld({ worldPath: world.path })} title={t('worlds.openFolder')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
                <button className="btn btn-ghost btn-sm" onClick={() => backup(world)} disabled={backingUp[world.name]} title={t('worlds.backup')}>
                  {backingUp[world.name] ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                </button>
                <button className={`bin-btn ${isEating ? 'bin-btn--chomping' : ''}`} disabled={!!deletingWorld[world.name]} onClick={() => !deletingWorld[world.name] && deleteWorld(world)}>
                  <span className="bin-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>
                  <svg className="bin-ring" viewBox="0 0 36 36" width="36" height="36">
                    <circle className="bin-ring-track" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"/>
                    <circle className="bin-ring-fill" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5" strokeDasharray="94.25" strokeDashoffset="94.25" style={isEating ? { strokeDashoffset: 0 } : {}}/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
