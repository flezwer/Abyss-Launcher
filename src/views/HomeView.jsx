import React, { useState, useEffect, useRef } from 'react'
import './HomeView.css'
import LiquidButton from '../components/LiquidButton'
import PlayerAvatar from '../components/PlayerAvatar'
import NotesPad from '../components/NotesPad'
import { fmtTime, fmtSecs, relativeTime } from '../utils/time'
import { logActivity, getActivity } from '../utils/activity'

export default function HomeView({
  accounts, activeAccount, setActiveAccount,
  settings, launching, setLaunching,
  setLogs, setProgress, progress, setActiveView, notify,
  instances: instancesProp, setInstances: setInstancesProp
}) {
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState('1.21.4')
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showBetas, setShowBetas] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const versionDropRef = useRef(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [javaOk, setJavaOk] = useState(true)
  const [systemRam, setSystemRam] = useState(null)
  const [news, setNews] = useState([])
  const [showSwitch, setShowSwitch] = useState(false)
  const [instances, setInstancesLocal] = useState([])
  // Sincronizar con el estado global de App para que CommandPalette vea las instancias
  const setInstances = (val) => {
    setInstancesLocal(val)
    setInstancesProp?.(val)
  }
  const [activeInstance, setActiveInstance] = useState(null)
  const [showNewInstance, setShowNewInstance] = useState(false)
  const [newInstName, setNewInstName] = useState('')
  const [playtime, setPlaytime] = useState({})
  const [sysStats, setSysStats] = useState(null)
  const [editingInstance, setEditingInstance] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const importInstRef = useRef(null)
  const [sessionSecs, setSessionSecs] = useState(0)
  const [instanceView, setInstanceView] = useState('list') // 'list' | 'grid'
  const [activity, setActivity] = useState(() => getActivity())
  const [newInstLoader, setNewInstLoader] = useState('vanilla')
  const [newInstLoaderVer, setNewInstLoaderVer] = useState('')
  const [fabricLoaders, setFabricLoaders] = useState([])
  const [loadingFabric, setLoadingFabric] = useState(false)
  const [javaVersionAlert, setJavaVersionAlert] = useState(null) // { detected: 8, needed: 21 }
  const [shareModal, setShareModal] = useState(null)
  const [importCode, setImportCode] = useState('')
  const [launchStage, setLaunchStage] = useState('Preparando...')
  const [installingJava, setInstallingJava] = useState(false)
  const [javaInstallProgress, setJavaInstallProgress] = useState(0)

  useEffect(() => {
    if (!launching) {
      setSessionSecs(0)
      setStatusMsg('')   // limpiar mensaje al volver al estado normal
      setLaunchStage('Preparando...')
      return
    }
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [launching])

  // Detect launch stage from game:log events
  useEffect(() => {
    if (!window.eclipse?.on) return
    const handler = (log) => {
      if (/downloading|descargando/i.test(log)) setLaunchStage('Descargando archivos...')
      else if (/extracting|extrayendo/i.test(log)) setLaunchStage('Extrayendo archivos...')
      else if (/launching|starting/i.test(log)) setLaunchStage('Iniciando Minecraft...')
    }
    window.eclipse.on('game:log', handler)
    return () => window.eclipse.off?.('game:log', handler)
  }, [])

  // Also infer stage from progress.name
  useEffect(() => {
    if (!progress?.name) return
    const n = progress.name.toLowerCase()
    if (/download|descarg/.test(n)) setLaunchStage('Descargando archivos...')
    else if (/extract|extray/.test(n)) setLaunchStage('Extrayendo archivos...')
    else if (/launch|start|inici/.test(n)) setLaunchStage('Iniciando Minecraft...')
  }, [progress])

  // ── Helper: Java mínimo por versión MC ───────────────────────────────────────
  const getRequiredJavaMajor = (mcVer) => {
    const parts = (mcVer || '').replace(/[^0-9.]/g, '').split('.').map(Number)
    const minor = parts[1] || 0; const patch = parts[2] || 0
    if (minor > 20 || (minor === 20 && patch >= 5)) return 21
    if (minor >= 18) return 17
    if (minor === 17) return 16
    return 8
  }

  // ── Check proactivo de Java cuando cambia la instancia activa ────────────────
  useEffect(() => {
    const ver = activeInstance?.version || selectedVersion
    const needed = getRequiredJavaMajor(ver)
    if (needed < 17) { setJavaVersionAlert(null); return } // versiones viejas — no alertar
    window.eclipse.javaCurrentMajor({ javaPath: settings?.javaPath })
      .then(({ major }) => {
        if (major > 0 && major < needed) setJavaVersionAlert({ detected: major, needed })
        else setJavaVersionAlert(null)
      })
      .catch(() => {})
  }, [activeInstance?.version, selectedVersion, settings?.javaPath])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (versionDropRef.current && !versionDropRef.current.contains(e.target)) setVersionOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    window.eclipse.fetchVersions()
      .then(v => {
        setVersions(v)
        // Solo auto-seleccionar si no hay instancia activa que ya fijó la versión
        setSelectedVersion(prev => prev === '1.21.4' && v.length > 0 ? v[0].id : prev)
      })
      .catch(() => setVersions([]))

    window.eclipse.detectJava()
      .then(r => setJavaOk(r.found))
      .catch(() => setJavaOk(false))

    window.eclipse.systemRam().then(r => setSystemRam(r)).catch(() => {})

    window.eclipse.minecraftNews().then(r => { if (r.ok) setNews(r.entries) }).catch(() => {})

    window.eclipse.loadInstances().then(insts => {
      if (insts.length > 0) {
        setInstances(insts)
        setActiveInstance(insts[0])
        setSelectedVersion(insts[0].version || '1.21.4')
      }
    }).catch(() => {})

    window.eclipse.loadPlaytime().then(setPlaytime).catch(() => {})
  }, [])

  useEffect(() => {
    const tick = () => window.eclipse.systemStats().then(setSysStats).catch(() => {})
    tick()
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [])

  // Feature 2: aplicar accent color de la instancia activa
  useEffect(() => {
    const color = activeInstance?.accentColor
    if (color) {
      document.documentElement.style.setProperty('--accent', color)
      document.documentElement.style.setProperty('--accent-bright', color)
    } else {
      document.documentElement.style.removeProperty('--accent')
      document.documentElement.style.removeProperty('--accent-bright')
    }
  }, [activeInstance?.accentColor])

  // Cargar versiones de Fabric cuando se selecciona ese loader
  useEffect(() => {
    if (newInstLoader !== 'fabric') { setFabricLoaders([]); return }
    if (!selectedVersion) return
    setLoadingFabric(true)
    setFabricLoaders([])
    setNewInstLoaderVer('')
    window.eclipse.fabricLoaders({ gameVersion: selectedVersion })
      .then(loaders => {
        setFabricLoaders(loaders)
        const stable = loaders.find(l => l.stable) || loaders[0]
        if (stable) setNewInstLoaderVer(stable.version)
      })
      .catch(() => setFabricLoaders([]))
      .finally(() => setLoadingFabric(false))
  }, [newInstLoader, selectedVersion])

  const filtered = versions.filter(v => {
    if (v.type === 'release') return true
    if (v.type === 'snapshot' && showSnapshots) return true
    if ((v.type === 'old_beta' || v.type === 'old_alpha') && showBetas) return true
    return false
  })

  const updateInstance = async (id, changes) => {
    const next = instances.map(i => i.id === id ? { ...i, ...changes } : i)
    setInstances(next)
    if (activeInstance?.id === id) setActiveInstance(prev => ({ ...prev, ...changes }))
    await window.eclipse.saveInstances(next)
  }

  const handleLaunch = async (versionOverride, ramOverrides) => {
    if (!activeAccount) { setActiveView('accounts'); return }
    if (!settings) return
    setLaunching(true)
    setLogs([])
    setStatusMsg('Iniciando...')
    setActiveView('console')

    const launchSettings = ramOverrides
      ? { ...settings, ramMin: ramOverrides.ramMin ?? settings.ramMin, ramMax: ramOverrides.ramMax ?? settings.ramMax }
      : settings

    const result = await window.eclipse.launchGame({
      account: activeAccount,
      version: versionOverride ?? selectedVersion,
      settings: { ...launchSettings, instanceGameDir: activeInstance?.gameDir },
      loader: activeInstance?.loader || 'vanilla',
      loaderVersion: activeInstance?.loaderVersion || null,
    })

    if (!result.ok) {
      setLaunching(false)
      setStatusMsg('Error: ' + result.error)
      // Detectar error de versión de Java y mostrar alerta específica
      if (result.error && /java\s*(\d+)/i.test(result.error)) {
        const m = result.error.match(/Java\s+(\d+)/i)
        const needed = m ? parseInt(m[1]) : 21
        window.eclipse.javaCurrentMajor({ javaPath: settings?.javaPath })
          .then(({ major }) => { if (major > 0) setJavaVersionAlert({ detected: major, needed }) })
          .catch(() => setJavaVersionAlert({ detected: 8, needed }))
      }
      notify?.({ message: `Error: ${result.error}`, type: 'error' })
    } else {
      notify?.({ message: 'Minecraft iniciado', type: 'success' })
      if (activeInstance) updateInstance(activeInstance.id, { lastPlayed: new Date().toISOString() })
      logActivity(`Lanzaste Minecraft ${versionOverride ?? selectedVersion}`)
      setActivity(getActivity())
    }
  }

  const pct = progress
    ? Math.round((progress.task / Math.max(progress.total, 1)) * 100)
    : 0

  const createInstance = async () => {
    if (!newInstName.trim()) return
    const inst = {
      id: Date.now().toString(),
      name: newInstName.trim(),
      version: selectedVersion,
      loader: newInstLoader,
      loaderVersion: newInstLoader === 'fabric' ? newInstLoaderVer : null,
      createdAt: new Date().toISOString(),
    }
    const next = [...instances, inst]
    setInstances(next)
    setActiveInstance(inst)
    await window.eclipse.saveInstances(next)
    setShowNewInstance(false)
    setNewInstName('')
    setNewInstLoader('vanilla')
    setNewInstLoaderVer('')
    logActivity(`Instancia creada: ${inst.name}`)
    setActivity(getActivity())
  }

  const deleteInstance = async (id) => {
    const next = instances.filter(i => i.id !== id)
    setInstances(next)
    if (activeInstance?.id === id) setActiveInstance(next[0] ?? null)
    await window.eclipse.saveInstances(next)
  }

  const selectInstance = (inst) => {
    setActiveInstance(inst)
    setSelectedVersion(inst.version || selectedVersion)
  }

  const handleCloneInstance = async (id) => {
    const res = await window.eclipse.cloneInstance({ instanceId: id })
    if (res.ok) {
      const updated = [...instances, res.instance]
      setInstances(updated)
      notify?.({ message: `Instancia clonada: ${res.instance.name}`, type: 'success' })
    } else {
      notify?.({ message: 'Error al clonar: ' + res.error, type: 'error' })
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const username = activeAccount?.username
  const [notesOpen, setNotesOpen] = useState(false)

  return (
    <div className="home">
      {/* ── Centro ── */}
      <div className="home-main">

        {/* Hero header */}
        <div className="home-hero">
          <div className="home-hero-left">
            <div className="home-hero-greeting">
              {greeting}{username ? `, ${username}` : ''}
            </div>
            <div className="home-hero-sub">
              {instances.length > 0
                ? `${instances.length} instancia${instances.length !== 1 ? 's' : ''} · ${selectedVersion}`
                : `Listo para jugar · ${selectedVersion}`}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="home-hero-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
          </div>
        </div>
        <NotesPad open={notesOpen} onClose={() => setNotesOpen(false)} />

        {/* Advertencia Java — versión incompatible (animada) */}
        {javaVersionAlert && (
          <div className="java-version-alert" key={`${javaVersionAlert.detected}-${javaVersionAlert.needed}`}>
            <div className="java-version-alert__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="java-version-alert__body">
              <span className="java-version-alert__title">Java desactualizado</span>
              <span className="java-version-alert__msg">
                Se ha detectado <strong>Java {javaVersionAlert.detected}</strong>, por favor instala <strong>Java {javaVersionAlert.needed}</strong> para jugar esta versión.
              </span>
              <div className="java-version-alert__actions">
                <button
                  className="java-version-alert__download"
                  onClick={() => window.eclipse.openExternal(`https://adoptium.net/temurin/releases/?version=${javaVersionAlert.needed}`)}
                >
                  Descargar Java {javaVersionAlert.needed}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:5}}>
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
                <button
                  className="btn btn-primary"
                  style={{fontSize:12,padding:'5px 12px'}}
                  disabled={installingJava}
                  onClick={async () => {
                    setInstallingJava(true)
                    setJavaInstallProgress(0)
                    window.eclipse.offJavaInstallProgress?.()
                    window.eclipse.onJavaInstallProgress(({ percent }) => setJavaInstallProgress(percent))
                    const res = await window.eclipse.javaAutoInstall({ major: javaVersionAlert.needed })
                    window.eclipse.offJavaInstallProgress?.()
                    setInstallingJava(false)
                    if (res.ok) {
                      await window.eclipse.saveSettings({ ...settings, javaPath: res.javaPath })
                      setJavaVersionAlert(null)
                      notify?.({ message: `Java ${javaVersionAlert.needed} instalado`, type: 'success' })
                    } else {
                      notify?.({ message: 'Error: ' + res.error, type: 'error' })
                    }
                  }}
                >
                  {installingJava
                    ? `Descargando Java ${javaVersionAlert.needed}... ${javaInstallProgress}%`
                    : `Instalar automáticamente`}
                </button>
                <button className="java-version-alert__dismiss" onClick={() => setJavaVersionAlert(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advertencia Java — no encontrado */}
        {!javaOk && !javaVersionAlert && (
          <div className="java-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:6,flexShrink:0}}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <strong>Java no encontrado.</strong> Instala Java 17 o superior para poder jugar.
            <a href="#" onClick={e => { e.preventDefault(); window.eclipse.openExternal('https://adoptium.net/temurin/releases/?version=22') }} style={{color:'var(--accent-bright)',marginLeft:8}}>
              Descargar Java →
            </a>
          </div>
        )}

        {/* Versión */}
        <section>
          <div className="home-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 4 0v2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="10" x2="12" y2="14"/>
            </svg>
            Versión
          </div>
          <div className="ver-picker" ref={versionDropRef}>
            <button
              className={`ver-trigger${versionOpen ? ' ver-trigger--open' : ''}`}
              onClick={() => setVersionOpen(o => !o)}
              type="button"
            >
              <span className="ver-trigger-name">{selectedVersion || '1.21.4'}</span>
              <span className="ver-trigger-type">
                {versions.find(v => v.id === selectedVersion)?.type === 'snapshot' ? 'snapshot' : 'release'}
              </span>
              <svg className="ver-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {versionOpen && (
              <div className="ver-dropdown">
                <div className="ver-dropdown-header">
                  <button
                    type="button"
                    className={`ver-filter-pill${showSnapshots ? ' ver-filter-pill--on' : ''}`}
                    onClick={() => setShowSnapshots(s => !s)}
                  >Snapshots</button>
                  <button
                    type="button"
                    className={`ver-filter-pill${showBetas ? ' ver-filter-pill--on' : ''}`}
                    onClick={() => setShowBetas(b => !b)}
                  >Betas</button>
                </div>
                <div className="ver-list">
                  {(filtered.length === 0 ? [{ id: '1.21.4', type: 'release' }] : filtered).map(v => (
                    <button
                      key={v.id}
                      type="button"
                      className={`ver-item${v.id === selectedVersion ? ' ver-item--active' : ''}${v.type !== 'release' ? ' ver-item--snap' : ''}`}
                      onMouseDown={e => {
                        e.preventDefault()
                        setSelectedVersion(v.id)
                        if (activeInstance) updateInstance(activeInstance.id, { version: v.id })
                        setVersionOpen(false)
                      }}
                    >
                      <span className="ver-item-id">{v.id}</span>
                      {v.type === 'snapshot' && <span className="ver-item-badge">snapshot</span>}
                      {v.type === 'old_beta' && <span className="ver-item-badge ver-item-badge--beta">beta</span>}
                      {v.type === 'old_alpha' && <span className="ver-item-badge ver-item-badge--beta">alpha</span>}
                      {v.id === selectedVersion && (
                        <svg className="ver-item-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Instancias */}
        <section>
          <div className="home-section-title" style={{ justifyContent: 'space-between' }}>
            <span style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
              </svg>
              Instancias
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-ghost btn-sm`}
                onClick={() => setInstanceView(v => v === 'list' ? 'grid' : 'list')}
                title={instanceView === 'list' ? 'Vista cuadrícula' : 'Vista lista'}
              >
                {instanceView === 'list'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                }
              </button>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                if (!activeInstance) return
                const res = await window.eclipse.exportInstance({ instanceId: activeInstance.id })
                if (res.ok) notify?.({ message: 'Instancia exportada', type: 'success' })
                else notify?.({ message: `Error: ${res.error}`, type: 'error' })
              }}>⬆ Exportar</button>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                if (!activeInstance) return
                const res = await window.eclipse.exportInstanceMrpack({ instanceId: activeInstance.id })
                if (res.ok) notify?.({ message: 'Exportado como .mrpack', type: 'success' })
                else if (res.error) notify?.({ message: `Error: ${res.error}`, type: 'error' })
              }} title="Exportar como Modrinth Pack (.mrpack)">⬆ .mrpack</button>
              <input
                ref={importInstRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  const res = await window.eclipse.importInstance(text)
                  if (res.ok) {
                    const insts = await window.eclipse.loadInstances()
                    setInstances(insts)
                    setActiveInstance(res.instance)
                    notify?.({ message: 'Instancia importada', type: 'success' })
                  } else {
                    notify?.({ message: `Error: ${res.error}`, type: 'error' })
                  }
                  e.target.value = ''
                }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => importInstRef.current?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Importar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewInstance(s => !s)}>
                + Nueva
              </button>
            </div>
          </div>

          {showNewInstance && (
            <div className="card new-instance-form">
              <input
                autoFocus
                placeholder="Nombre de la instancia"
                value={newInstName}
                onChange={e => setNewInstName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createInstance()}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                <select
                  value={newInstLoader}
                  onChange={e => setNewInstLoader(e.target.value)}
                  style={{ flex:1 }}
                >
                  <option value="vanilla">Vanilla</option>
                  <option value="fabric">Fabric</option>
                </select>
                {newInstLoader === 'fabric' && (
                  <select
                    value={newInstLoaderVer}
                    onChange={e => setNewInstLoaderVer(e.target.value)}
                    style={{ flex:1 }}
                    disabled={loadingFabric || fabricLoaders.length === 0}
                  >
                    {loadingFabric && <option value="">Cargando...</option>}
                    {!loadingFabric && fabricLoaders.length === 0 && <option value="">Sin versiones</option>}
                    {fabricLoaders.map(l => (
                      <option key={l.version} value={l.version}>
                        {l.version}{l.stable ? '' : ' ⚠'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={createInstance} disabled={newInstLoader === 'fabric' && !newInstLoaderVer}>Crear</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewInstance(false); setNewInstName(''); setNewInstLoader('vanilla'); setNewInstLoaderVer('') }}>Cancelar</button>
              </div>
            </div>
          )}

          {(() => {
            const allTags = [...new Set(instances.flatMap(i => i.tags || []))]
            if (allTags.length === 0) return null
            return (
              <div className="tag-filter-bar">
                <button className={`tag-chip ${!tagFilter ? 'tag-chip--active' : ''}`} onClick={() => setTagFilter(null)}>Todas</button>
                {allTags.map(t => (
                  <button key={t} className={`tag-chip ${tagFilter === t ? 'tag-chip--active' : ''}`} onClick={() => setTagFilter(p => p === t ? null : t)}>{t}</button>
                ))}
              </div>
            )
          })()}

          {(() => {
            const visibleInstances = (tagFilter ? instances.filter(i => (i.tags||[]).includes(tagFilter)) : instances)
              .slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
            return (
          <div className={`instance-list ${instanceView === 'grid' ? 'instance-list--grid' : ''}`}>
            {visibleInstances.length === 0 && instances.length > 0 && (
              <div className="instance-card" style={{ opacity: 0.7 }}>
                <div className="instance-info">
                  <div className="instance-name">Sin instancias con tag "{tagFilter}"</div>
                </div>
              </div>
            )}
            {instances.length === 0 && (
              <div className="instance-card" style={{ opacity: 0.7 }}>
                <div className="instance-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <div className="instance-info">
                  <div className="instance-name">Minecraft {selectedVersion}</div>
                  <div className="instance-sub">
                    {activeAccount ? `Como ${activeAccount.username}` : 'Sin cuenta — añade una primero'}
                  </div>
                  {launching && progress && (
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <LiquidButton
                  size="md"
                  loading={launching}
                  progress={pct}
                  idleLabel="▶ Play"
                  loadingLabel={<><span className="lb-spinner" /> {pct > 0 ? `${pct}%` : 'Iniciando...'}</>}
                  onClick={handleLaunch}
                  disabled={launching}
                />
              </div>
            )}
            {visibleInstances.map(inst => (
              <React.Fragment key={inst.id}>
                <div
                  className={`instance-card ${activeInstance?.id === inst.id ? 'instance-card--active' : ''}`}
                  onClick={() => selectInstance(inst)}
                >
                  <div className="instance-icon" style={inst.accentColor ? { boxShadow: `0 0 0 2px ${inst.accentColor}44`, borderColor: inst.accentColor } : {}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={inst.accentColor || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                  </div>
                  <div className="instance-info">
                    <div className="instance-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {inst.accentColor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: inst.accentColor, flexShrink: 0, display: 'inline-block' }} />}
                      {inst.name}
                    </div>
                    <div className="instance-sub">
                      {inst.version}
                      {inst.loader && inst.loader !== 'vanilla' && (
                        <span className={`loader-badge loader-badge--${inst.loader}`}>
                          {inst.loader === 'fabric' ? 'Fabric' : inst.loader}
                        </span>
                      )}
                      {' · '}{activeAccount ? activeAccount.username : 'Sin cuenta'}
                      {inst.lastPlayed && !launching && <span style={{opacity:.55}}> · {relativeTime(inst.lastPlayed)}</span>}
                      {launching && activeInstance?.id === inst.id && sessionSecs > 0 && <span style={{color:'var(--accent-bright)'}}> · ⏱ {fmtSecs(sessionSecs)}</span>}
                    </div>
                    {(inst.tags || []).length > 0 && (
                      <div className="inst-tags-row">
                        {(inst.tags || []).map(t => <span key={t} className="inst-tag">{t}</span>)}
                      </div>
                    )}
                    {inst.notes && (
                      <span title={inst.notes} style={{ opacity: 0.45, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </span>
                    )}
                    {inst.seed && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, opacity: 0.7 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22V12m0 0C12 6 7 4 2 6c5-1 10 2 10 6zm0 0c0-6 5-8 10-6-5-1-10 2-10 6"/>
                        </svg>
                        <span>Seed: <code style={{ fontFamily: 'monospace', fontSize: 10 }}>{inst.seed}</code></span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '1px 4px', fontSize: 10, height: 'auto' }}
                          title="Ver mapa de seed"
                          onClick={e => { e.stopPropagation(); window.eclipse.openExternal(`https://www.minecraft-seed.net/seed/${inst.seed}`) }}
                        >🗺 Ver</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '1px 4px', fontSize: 10, height: 'auto' }}
                          title="Copiar seed"
                          onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(inst.seed) }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    {launching && activeInstance?.id === inst.id && progress && (
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <LiquidButton
                      size="md"
                      loading={launching && activeInstance?.id === inst.id}
                      progress={pct}
                      idleLabel="▶ Play"
                      loadingLabel={<><span className="lb-spinner" /> {pct > 0 ? `${pct}%` : 'Iniciando...'}</>}
                      onClick={e => { e.stopPropagation(); selectInstance(inst); handleLaunch(inst.version || selectedVersion, { ramMin: inst.ramMin, ramMax: inst.ramMax }) }}
                      disabled={launching}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); setEditingInstance(prev => prev === inst.id ? null : inst.id) }}
                      title="Configurar instancia"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); updateInstance(inst.id, { pinned: !inst.pinned }) }}
                      title={inst.pinned ? 'Desfijar' : 'Fijar arriba'}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={inst.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async e => {
                        e.stopPropagation()
                        const r = await window.eclipse.backupInstanceFull({ instanceId: inst.id, gameDir: settings?.gameDir })
                        if (r.ok) {
                          notify?.({ message: 'Backup creado', type: 'success' })
                          logActivity(`Backup creado: ${inst.name}`)
                          setActivity(getActivity())
                        } else notify?.({ message: 'Error al hacer backup', type: 'error' })
                      }}
                      title="Backup de instancia"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); setShareModal(inst) }}
                      title="Compartir instancia"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async e => {
                        e.stopPropagation()
                        notify?.({ message: 'Verificando archivos...', type: 'info' })
                        const res = await window.eclipse.repairGame({ account: activeAccount, version: inst.version || selectedVersion, settings: { ...settings, instanceGameDir: inst?.gameDir } })
                        if (res.ok) notify?.({ message: 'Reparación completada', type: 'success' })
                        else notify?.({ message: 'Error: ' + res.error, type: 'error' })
                      }}
                      title="Reparar instalación"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); handleCloneInstance(inst.id) }}
                      title="Clonar instancia"
                    >⧉</button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={e => { e.stopPropagation(); deleteInstance(inst.id) }}
                      title="Eliminar instancia"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {editingInstance === inst.id && (
                  <div className="instance-edit-panel card">
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                      <div className="field" style={{flex:1,minWidth:120}}>
                        <label>Versión</label>
                        <input value={inst.version||''} onChange={e=>updateInstance(inst.id,{version:e.target.value})} />
                      </div>
                      <div className="field" style={{width:110}}>
                        <label>Loader</label>
                        <select value={inst.loader||'vanilla'} onChange={e=>updateInstance(inst.id,{loader:e.target.value,loaderVersion:null})}>
                          <option value="vanilla">Vanilla</option>
                          <option value="fabric">Fabric</option>
                        </select>
                      </div>
                      <div className="field" style={{width:90}}>
                        <label>RAM mín (MB)</label>
                        <input type="number" step={256} min={512} value={inst.ramMin||settings?.ramMin||1024} onChange={e=>updateInstance(inst.id,{ramMin:Number(e.target.value)})} />
                      </div>
                      <div className="field" style={{width:90}}>
                        <label>RAM máx (MB)</label>
                        <input type="number" step={256} min={512} value={inst.ramMax||settings?.ramMax||2048} onChange={e=>updateInstance(inst.id,{ramMax:Number(e.target.value)})} />
                      </div>
                    </div>
                    {inst.gameDir && (
                      <div className="field">
                        <label>Carpeta</label>
                        <div style={{fontSize:11,color:'var(--text-muted)',padding:'4px 0',wordBreak:'break-all'}}>{inst.gameDir}</div>
                      </div>
                    )}
                    <div className="field">
                      <label>Seed del mundo</label>
                      <input
                        className="form-input"
                        placeholder="Ej: -4172144997902289642"
                        value={inst.seed || ''}
                        onChange={e => updateInstance(inst.id, { seed: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Notas</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 80, resize: 'vertical' }}
                        placeholder="Notas, coordenadas, seeds..."
                        value={inst.notes || ''}
                        onChange={e => updateInstance(inst.id, { notes: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Color de acento</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {['#7c6af7', '#22c55e', '#f97316', '#ef4444', '#3b82f6', '#ec4899'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateInstance(inst.id, { accentColor: color })}
                            style={{
                              width: 20, height: 20, borderRadius: '50%', background: color, border: 'none',
                              cursor: 'pointer', flexShrink: 0,
                              outline: inst.accentColor === color ? '2px solid white' : 'none',
                              outlineOffset: 2
                            }}
                          />
                        ))}
                        <button
                          onClick={() => updateInstance(inst.id, { accentColor: null })}
                          style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Tags</label>
                      <div className="tag-editor">
                        {(inst.tags || []).map(tag => (
                          <span key={tag} className="inst-tag inst-tag--edit">
                            {tag}
                            <button onClick={() => updateInstance(inst.id, { tags: (inst.tags || []).filter(t => t !== tag) })}>×</button>
                          </span>
                        ))}
                        <input
                          className="tag-input"
                          placeholder="+ tag"
                          style={{ width: 80, fontSize: 12 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              const newTag = e.target.value.trim().toLowerCase()
                              if (!(inst.tags || []).includes(newTag)) {
                                updateInstance(inst.id, { tags: [...(inst.tags || []), newTag] })
                              }
                              e.target.value = ''
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          )
          })()}
          {statusMsg && <p className="status-msg" style={{ marginTop: 8 }}>{statusMsg}</p>}
        </section>

        {/* Tiempo jugado */}
        {Object.keys(playtime).length > 0 && (
          <section>
            <div className="home-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Tiempo jugado
            </div>
            <div className="playtime-list">
              {Object.values(playtime).sort((a,b) => b.totalMs - a.totalMs).map(p => (
                <div key={`${p.username}_${p.version}`} className="playtime-row">
                  <span className="playtime-ver">MC {p.version}</span>
                  <span className="playtime-user">{p.username}</span>
                  <span className="playtime-time">{fmtTime(p.totalMs)}</span>
                  <span className="playtime-sessions">{p.sessions} {p.sessions === 1 ? 'sesión' : 'sesiones'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recursos del sistema */}
        {sysStats && (
          <section>
            <div className="home-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
              </svg>
              Recursos del sistema
            </div>
            <div className="sys-stats-row">
              <div className="sys-stat">
                <div className="sys-stat-label">CPU</div>
                <div className="sys-stat-bar"><div className="sys-stat-fill" style={{width:`${sysStats.cpuPercent}%`, background:'var(--accent)'}}/></div>
                <div className="sys-stat-val">{sysStats.cpuPercent}%</div>
              </div>
              <div className="sys-stat">
                <div className="sys-stat-label">RAM</div>
                <div className="sys-stat-bar"><div className="sys-stat-fill" style={{width:`${sysStats.usedPercent}%`, background:'var(--accent-bright)'}}/></div>
                <div className="sys-stat-val">{sysStats.usedMemMB} / {sysStats.totalMemMB} MB</div>
              </div>
            </div>
          </section>
        )}

        {/* Noticias */}
        {news.length > 0 && (
          <section>
            <div className="home-section-title" style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="var(--accent)"/>
              </svg>
              Novedades de Minecraft
            </div>
            <div className="news-grid">
              {news.map((item, i) => (
                <div className="news-card" key={i} style={item.url ? {cursor:'pointer'} : {}} onClick={() => item.url && window.eclipse.openExternal(item.url)}>
                  {item.image?.url && (
                    <div className="news-img-wrap">
                      <img src={item.image.url} alt={item.title} className="news-img" />
                    </div>
                  )}
                  <div className="news-body">
                    <div className="news-version">{item.version || item.type}</div>
                    <div className="news-title">{item.title}</div>
                    <div className="news-date">{item.date ? new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Panel derecho ── */}
      <aside className="home-right">

        {/* Cuenta — quick-switch */}
        <div style={{ position: 'relative' }}>
          <div className="right-section-title">Jugando como</div>
          {activeAccount ? (
            <div className="account-panel">
              <div
                className="account-select-row"
                onClick={() => setShowSwitch(s => !s)}
                title="Cambiar cuenta"
              >
                <PlayerAvatar account={activeAccount} size={36} />
                <div className="account-meta">
                  <div className="account-name">{activeAccount.username}</div>
                  <div className="account-type">
                    {activeAccount.type === 'offline' ? 'Cuenta offline' : 'Cuenta Microsoft'}
                  </div>
                </div>
                <span className={`account-chevron ${showSwitch ? 'open' : ''}`}>⌄</span>
              </div>

              {showSwitch && accounts.length > 1 && (
                <div className="quick-switch-panel">
                  {accounts.filter(a => a.id !== activeAccount.id).map(acc => (
                    <div
                      key={acc.id}
                      className="quick-switch-row"
                      onClick={() => { setActiveAccount(acc); setShowSwitch(false) }}
                    >
                      <PlayerAvatar account={acc} size={28} />
                      <span className="qs-name">{acc.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-account-panel">
              <p>Sin cuenta</p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveView('accounts')}>
                + Añadir
              </button>
            </div>
          )}
        </div>

        {/* RAM */}
        {settings && (
          <div>
            <div className="right-section-title">Memoria RAM</div>
            <div className="ram-panel">
              <div className="ram-row">
                <span>RAM del sistema</span>
                <span className="ram-value ram-total">{systemRam ? `${systemRam.totalMB} MB` : '...'}</span>
              </div>
              <div className="ram-row">
                <span>Asignada al juego</span>
                <span className="ram-value">{settings.ramMax} MB</span>
              </div>
              <div className="ram-bar-wrap">
                <div className="ram-bar-track">
                  <div className="ram-bar-fill" style={{ width: `${Math.min((settings.ramMax / (systemRam?.totalMB || 8192)) * 100, 100)}%` }} />
                </div>
                <span className="ram-bar-pct">{systemRam ? `${Math.round((settings.ramMax / systemRam.totalMB) * 100)}%` : ''}</span>
              </div>
              {systemRam && settings.ramMax !== systemRam.recommended && (
                <div className="ram-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
                    <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                  </svg>
                  Recomendado: <strong>{systemRam.recommended} MB</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div>
          <div className="right-section-title">Acciones</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 12 }}
              onClick={() => setActiveView('settings')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/>
              </svg>
              Ajustes
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 12 }}
              onClick={() => setActiveView('console')}>
              ≡ Consola
            </button>
          </div>
        </div>

        {/* Actividad reciente */}
        {activity.length > 0 && (
          <div>
            <div className="right-section-title" style={{display:'flex',alignItems:'center',gap:5}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Actividad reciente
            </div>
            <div className="activity-feed">
              {activity.slice(0, 6).map((item, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-dot" />
                  <span className="activity-text">{item.text}</span>
                  <span className="activity-time">{relativeTime(new Date(item.time).toISOString())}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </aside>

      {/* ── Launch overlay ── */}
      {launching && progress && (
        <div className="launch-overlay">
          <div className="launch-overlay-content">
            <div className="launch-overlay-title">Preparando Minecraft</div>
            <div className="launch-overlay-stage">{launchStage}</div>
            <div className="launch-progress-bar">
              <div className="launch-progress-fill" style={{ width: `${Math.round((progress.task / Math.max(progress.total, 1)) * 100)}%` }} />
            </div>
            <div className="launch-overlay-pct">{Math.round((progress.task / Math.max(progress.total, 1)) * 100)}%</div>
            <div className="launch-overlay-detail">{progress.name || ''}</div>
          </div>
        </div>
      )}

      {/* ── Share modal ── */}
      {shareModal && (() => {
        const shareData = { name: shareModal.name, version: shareModal.version, loader: shareModal.loader, loaderVersion: shareModal.loaderVersion, mods: [] }
        const encoded = btoa(JSON.stringify(shareData))
        return (
          <div className="share-modal-overlay" onClick={() => { setShareModal(null); setImportCode('') }}>
            <div className="share-modal-panel" onClick={e => e.stopPropagation()}>
              <div className="share-modal-header">
                <span className="share-modal-title">Compartir instancia</span>
                <button className="share-modal-close" onClick={() => { setShareModal(null); setImportCode('') }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                    Código de <strong style={{ color: 'var(--text-primary)' }}>{shareModal.name}</strong>
                  </label>
                  <textarea
                    readOnly
                    value={encoded}
                    style={{ width: '100%', height: 80, fontFamily: 'monospace', fontSize: 11, resize: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '8px 10px', boxSizing: 'border-box' }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => navigator.clipboard.writeText(encoded).then(() => notify?.({ message: 'Código copiado', type: 'success' }))}
                  >
                    Copiar código
                  </button>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Importar código de otra instancia</label>
                  <textarea
                    value={importCode}
                    onChange={e => setImportCode(e.target.value)}
                    placeholder="Pega aquí el código..."
                    style={{ width: '100%', height: 60, fontFamily: 'monospace', fontSize: 11, resize: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '8px 10px', boxSizing: 'border-box' }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      try {
                        const decoded = JSON.parse(atob(importCode.trim()))
                        const res = await window.eclipse.importInstance(JSON.stringify({ instance: decoded }))
                        if (res.ok) {
                          const insts = await window.eclipse.loadInstances()
                          setInstances(insts)
                          if (res.instance) setActiveInstance(res.instance)
                          notify?.({ message: 'Instancia importada', type: 'success' })
                          setShareModal(null); setImportCode('')
                        } else {
                          notify?.({ message: 'Error al importar: ' + res.error, type: 'error' })
                        }
                      } catch {
                        notify?.({ message: 'Código inválido', type: 'error' })
                      }
                    }}
                  >
                    Importar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
