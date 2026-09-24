import { useState, useEffect } from 'react'
import './Sidebar.css'
import { useT } from '../i18n'

/* ── Iconos SVG personalizados ─────────────────────────────── */

// Inicio — planeta con anillo orbital
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-icon">
    <circle cx="10" cy="10" r="4" fill="currentColor" opacity="0.9"/>
    <ellipse cx="10" cy="10" rx="8.5" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" className="icon-ring"/>
    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
  </svg>
)

// Cuentas — avatar con escudo/halo
const IconAccounts = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-icon">
    <circle cx="10" cy="7.5" r="3" fill="currentColor" opacity="0.9"/>
    <path d="M3.5 17c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" className="icon-pulse-ring"/>
  </svg>
)

// Mods — stack-icon de itshover.com (capas apiladas = mods/add-ons)
const IconMods = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg" className="nav-icon" style={{overflow:'visible'}}>
    <path className="icon-stack-top"    d="M12 6l-8 4l8 4l8 -4l-8 -4" style={{transformOrigin:'12px 10px', transformBox:'fill-box'}}/>
    <path className="icon-stack-bottom" d="M4 14l8 4l8 -4"             style={{transformOrigin:'12px 16px', transformBox:'fill-box'}}/>
  </svg>
)

// Consola — terminal con cursor parpadeante
const IconConsole = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-icon">
    <rect x="1.5" y="3.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 8l3 2.5L5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="icon-cursor"/>
  </svg>
)

// Ajustes — gear icon de itshover.com
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor"
    strokeWidth="2.667" strokeLinecap="square" strokeMiterlimit="10"
    xmlns="http://www.w3.org/2000/svg" className="nav-icon" style={{overflow:'visible'}}>
    <g className="icon-gear-rotator" style={{transformOrigin:'50% 50%', transformBox:'fill-box'}}>
      <circle cx="16" cy="16" r="5"/>
      <path d="m30,17.5v-3l-3.388-1.355c-.25-.933-.617-1.815-1.089-2.633l1.436-3.351-2.121-2.121-3.351,1.436c-.817-.472-1.7-.838-2.633-1.089l-1.355-3.388h-3l-1.355,3.388c-.933.25-1.815.617-2.633,1.089l-3.351-1.436-2.121,2.121 1.436,3.351c-.472.817-.838,1.7-1.089,2.633l-3.388,1.355v3l3.388,1.355c.25.933.617,1.815,1.089,2.633l-1.436,3.351 2.121,2.121 3.351-1.436c.817.472 1.7.838 2.633,1.089l1.355,3.388h3l1.355-3.388c.933-.25 1.815-.617 2.633-1.089l3.351,1.436 2.121-2.121-1.436-3.351c.472-.817.838-1.7 1.089-2.633l3.388-1.355Z"/>
    </g>
  </svg>
)

const IconServers = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-icon">
    <rect x="2" y="3" width="16" height="5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="2" y="12" width="16" height="5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="15" cy="5.5" r="1" fill="currentColor"/>
    <circle cx="15" cy="14.5" r="1" fill="currentColor"/>
  </svg>
)

const IconWorlds = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="nav-icon">
    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2.5 10h15M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5" stroke="currentColor" strokeWidth="1.1"/>
  </svg>
)

const IconStats = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const NAV = [
  { id: 'home',     Icon: IconHome,     labelKey: 'shell.navHome'     },
  { id: 'accounts', Icon: IconAccounts, labelKey: 'shell.navAccounts' },
  { id: 'mods',     Icon: IconMods,     labelKey: 'shell.navMods'     },
  { id: 'servers',  Icon: IconServers,  labelKey: 'shell.navServers'  },
  { id: 'worlds',   Icon: IconWorlds,   labelKey: 'shell.navWorlds'   },
  { id: 'console',  Icon: IconConsole,  labelKey: 'shell.navConsole'  },
  { id: 'stats',    Icon: IconStats,    labelKey: 'shell.navStats'    },
  { id: 'settings', Icon: IconSettings, labelKey: 'shell.navSettings' },
]

export default function Sidebar({ activeView, setActiveView }) {
  const t = useT()
  const [hasUpdate, setHasUpdate] = useState(false)
  const [updateUrl, setUpdateUrl] = useState('')
  const [modBadge, setModBadge] = useState(() => { try { return Number(localStorage.getItem('eclipse-mod-updates') || 0) } catch { return 0 } })
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  const toggle = () => {
    setCollapsed(p => {
      const next = !p
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    window.eclipse.checkLauncherUpdate().then(res => {
      if (res?.hasUpdate) {
        setHasUpdate(true)
        setUpdateUrl(res.url || '')
      }
    }).catch(() => {})
  }, [])

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <nav className="sidebar-nav">
        {NAV.map(({ id, Icon, labelKey }) => { const label = t(labelKey); return (
          <button
            key={id}
            className={`sidebar-item ${activeView === id ? 'active' : ''}`}
            onClick={() => { setActiveView(id); if (id === 'mods') { setModBadge(0); try { localStorage.removeItem('eclipse-mod-updates') } catch {} } }}
            data-tooltip={label}
            title={label}
          >
            <span style={{position:'relative',display:'inline-flex'}}>
              <Icon />
              {id === 'mods' && modBadge > 0 && (
                <span style={{position:'absolute',top:-4,right:-6,background:'#ef4444',color:'#fff',borderRadius:'50%',fontSize:9,fontWeight:700,minWidth:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:'0 2px'}}>
                  {modBadge}
                </span>
              )}
            </span>
            <span className="sidebar-nav-label">{label}</span>
          </button>
        )})}
      </nav>
      <div className="sidebar-bottom">
        {hasUpdate && (
          <div
            className="update-notice"
            onClick={() => updateUrl && window.eclipse.openExternal(updateUrl)}
            title={t('shell.updateAvailableTitle')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <span> {t('shell.updateAvailable')}</span>
          </div>
        )}
        <button className="sidebar-collapse-btn" onClick={toggle} title={collapsed ? t('shell.expand') : t('shell.collapse')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6"/>
              : <polyline points="15 18 9 12 15 6"/>
            }
          </svg>
        </button>
        {!collapsed && <span className="sidebar-version">v1.0</span>}
      </div>
    </aside>
  )
}
