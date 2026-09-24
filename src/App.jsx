import { useState, useEffect, useRef } from 'react'
import './App.css'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import StarField from './components/StarField'
import SplashScreen from './components/SplashScreen'
import ViewTransition from './components/ViewTransition'
import HomeView from './views/HomeView'
import SettingsView from './views/SettingsView'
import AccountsView from './views/AccountsView'
import ConsoleView from './views/ConsoleView'
import ModsView from './views/ModsView'
import ServersView from './views/ServersView'
import WorldsView from './views/WorldsView'
import StatsView from './views/StatsView'
import Notifications from './components/Notifications'
import DownloadQueue from './components/DownloadQueue'
import SetupWizard from './components/SetupWizard'
import { useTheme } from './hooks/useTheme'
import { useAccent } from './hooks/useAccent'
import { useBg } from './hooks/useBg'
import { useNotifications } from './hooks/useNotifications'
import { useDownloadQueue } from './hooks/useDownloadQueue'

function getCrashHint(logs, code) {
  const text = logs.join('\n').toLowerCase()
  if (text.includes('outofmemoryerror') || text.includes('java.lang.outofmemory'))
    return { label: 'RAM insuficiente', detail: 'Aumenta la RAM en Ajustes', nav: 'settings', icon: 'M' }
  if (text.includes('nosuchfielderror') || text.includes('classnotfoundexception') || text.includes('nosuchmethoderror'))
    return { label: 'Mod incompatible', detail: 'Desactiva mods recientes', nav: 'mods', icon: 'L' }
  if (text.includes('nullpointerexception') && text.includes('mod'))
    return { label: 'Error en mod', detail: 'Revisa mods instalados', nav: 'mods', icon: 'L' }
  if (code === -1073741819 || code === 3221225477)
    return { label: 'Crash de driver', detail: 'Actualiza drivers de gráficos', nav: null, icon: 'G' }
  if (code === 1 && text.includes('could not find or load main class'))
    return { label: 'Java no encontrado', detail: 'Verifica la ruta de Java en Ajustes', nav: 'settings', icon: 'J' }
  if (text.includes('unsupportedclassversionerror') || text.includes('class file version'))
    return { label: 'Java desactualizado', detail: 'Minecraft 1.17+ necesita Java 17, 1.20.5+ necesita Java 21. Configura la ruta en Ajustes', nav: 'settings', icon: 'J' }
  return null
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [accounts, setAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [settings, setSettings] = useState(null)
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(null)
  const [launching, setLaunching] = useState(false)
  const [showCrash, setShowCrash] = useState(false)
  const [crashCode, setCrashCode] = useState(null)
  const [instances, setInstances] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  useAccent()
  const [bg, setBg, bgStyle] = useBg()
  const { notify, notifications, dismiss } = useNotifications()
  const { queue, addToQueue, updateQueue } = useDownloadQueue()
  const gameStartRef = useRef(null)


  useEffect(() => {
    if (launching) gameStartRef.current = Date.now()
  }, [launching])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      const accs = await window.eclipse.loadAccounts()
      setAccounts(accs)
      if (accs.length > 0) setActiveAccount(accs[0])
      // Show wizard if no accounts yet
      if (accs.length === 0) setShowWizard(true)
      const cfg = await window.eclipse.loadSettings()
      setSettings(cfg)
    }
    load()

    window.eclipse.onGameLog((msg) => {
      setLogs(prev => [...prev.slice(-300), msg])
    })
    window.eclipse.onProgress((data) => {
      setProgress(data)
    })
    window.eclipse.onClose((code) => {
      if (gameStartRef.current) {
        const ms = Date.now() - gameStartRef.current
        const date = new Date().toISOString().slice(0, 10)
        try {
          const key = 'eclipse-daily-ms'
          const prev = JSON.parse(localStorage.getItem(key) || '[]')
          const existing = prev.find(d => d.date === date)
          if (existing) existing.ms += ms
          else prev.push({ date, ms })
          const sorted = prev.sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
          localStorage.setItem(key, JSON.stringify(sorted))
        } catch {}
        gameStartRef.current = null
      }
      setLaunching(false)
      setProgress(null)
      setLogs(prev => [...prev, `\n── Juego cerrado (código ${code}) ──`])
      if (code !== 0 && code !== null) {
        setCrashCode(code)
        setShowCrash(true)
        notify({ message: `El juego crasheó (código ${code})`, type: 'error', duration: 0 })
        // En crash: quedarse en consola para ver logs + overlay
      } else {
        notify({ message: 'Juego cerrado', type: 'info' })
        // Cierre normal: volver al inicio tras 1.2 s
        setTimeout(() => setActiveView('home'), 1200)
      }
      window.eclipse.osNotify?.({
        title: code !== 0 && code !== null ? 'Minecraft crasheó' : 'Minecraft cerrado',
        body: code !== 0 && code !== null ? `Código de salida: ${code}` : 'La sesión terminó correctamente.',
      })
    })
    return () => {
      window.eclipse.offGameLog?.()
      window.eclipse.offProgress?.()
      window.eclipse.offClose?.()
    }
  }, [])

  const saveAccounts = async (newAccounts) => {
    setAccounts(newAccounts)
    await window.eclipse.saveAccounts(newAccounts)
  }

  const saveSettings = async (newSettings) => {
    setSettings(newSettings)
    await window.eclipse.saveSettings(newSettings)
  }

  const getView = (id) => {
    const props = {
      home: { accounts, activeAccount, setActiveAccount, settings, launching, setLaunching, setLogs, setProgress, progress, setActiveView, notify, instances, setInstances },
      accounts: { accounts, activeAccount, setActiveAccount, saveAccounts },
      settings: { settings, saveSettings, theme, setTheme, bg, setBg },
      console: { logs, setLogs, settings },
      mods: { settings, addToQueue, updateQueue, notify },
      servers: { accounts, activeAccount, settings, launching, setLaunching, setLogs, setProgress, setActiveView, notify },
      worlds: { settings },
      stats: {}
    }
    const View = { home: HomeView, accounts: AccountsView, settings: SettingsView, console: ConsoleView, mods: ModsView, servers: ServersView, worlds: WorldsView, stats: StatsView }[id]
    return View ? <View {...(props[id] || {})} /> : null
  }

  return (
    <div className="app" style={bgStyle}>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      {bg.bgType === 'stars' && <StarField />}
      <TitleBar />
      <div className="app-body">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="main-content">
          <ViewTransition viewKey={activeView}>
            {(key) => getView(key)}
          </ViewTransition>
        </main>
      </div>
      {showWizard && (
        <SetupWizard
          onComplete={async () => {
            setShowWizard(false)
            // Reload accounts after wizard
            const accs = await window.eclipse.loadAccounts()
            setAccounts(accs)
            if (accs.length > 0) setActiveAccount(accs[0])
          }}
          saveSettings={saveSettings}
          settings={settings}
        />
      )}
      {showCrash && (
        <div className="crash-overlay">
          <div className="crash-panel">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:'0 auto 8px',display:'block'}}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h3>El juego crasheó</h3>
            <p className="crash-code">Código de salida: <code>{crashCode}</code></p>
            {(() => {
              const hint = getCrashHint(logs, crashCode)
              if (!hint) return <p className="crash-hint">Revisa la consola para más detalles.</p>
              return (
                <div className="crash-hint-box">
                  <div className="crash-hint-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {hint.label}
                  </div>
                  <div className="crash-hint-detail">{hint.detail}</div>
                </div>
              )
            })()}
            <div className="crash-actions">
              {(() => {
                const hint = getCrashHint(logs, crashCode)
                return hint?.nav ? (
                  <button className="btn btn-primary" onClick={() => { setShowCrash(false); setActiveView(hint.nav) }}>
                    Ir a {hint.nav === 'settings' ? 'Ajustes' : 'Mods'}
                  </button>
                ) : null
              })()}
              <button className="btn btn-primary" onClick={() => { setShowCrash(false); setActiveView('console') }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                Ver consola
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCrash(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <Notifications notifications={notifications} dismiss={dismiss} />
      <DownloadQueue queue={queue} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setActiveView={setActiveView}
        instances={instances}
        onLaunch={() => setActiveView('home')}
        setTheme={setTheme}
      />
    </div>
  )
}
