import { useState, useEffect, useRef } from 'react'
import './ServersView.css'
import { useT } from '../i18n'

export default function ServersView({ accounts, activeAccount, settings, launching, setLaunching, setLogs, setProgress, setActiveView, notify }) {
  const t = useT()
  const [servers, setServers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eclipse-servers') || '[]') } catch { return [] }
  })
  const [pinging, setPinging] = useState({})
  const [pingResults, setPingResults] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIp, setNewIp] = useState('')
  const [deletingServer, setDeletingServer] = useState({})
  const serversRef = useRef(servers)

  useEffect(() => {
    try { localStorage.setItem('eclipse-servers', JSON.stringify(servers)) } catch {}
    serversRef.current = servers
  }, [servers])

  // Auto-ping all servers on mount and every 30 seconds
  useEffect(() => {
    const doAll = () => serversRef.current.forEach(s => pingServer(s))
    if (serversRef.current.length > 0) doAll()
    const id = setInterval(doAll, 30000)
    return () => clearInterval(id)
  }, [])

  const addServer = () => {
    if (!newIp.trim()) return
    const [host, port] = newIp.includes(':') ? newIp.split(':') : [newIp, '25565']
    const srv = { id: Date.now().toString(), name: newName.trim() || host, ip: host.trim(), port: parseInt(port) || 25565, favorite: false }
    setServers(prev => [...prev, srv])
    setNewName(''); setNewIp(''); setShowAdd(false)
    pingServer(srv)
  }

  const pingServer = async (srv) => {
    setPinging(prev => ({ ...prev, [srv.id]: true }))
    try {
      const res = await window.eclipse.pingServer({ host: srv.ip, port: srv.port })
      setPingResults(prev => ({ ...prev, [srv.id]: res }))
    } catch {
      setPingResults(prev => ({ ...prev, [srv.id]: { online: false } }))
    }
    setPinging(prev => ({ ...prev, [srv.id]: false }))
  }

  const pingAll = () => servers.forEach(pingServer)

  const toggleFavorite = (id) => setServers(prev => prev.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s))

  const deleteServer = async (srv) => {
    setDeletingServer(prev => ({ ...prev, [srv.id]: 'eating' }))
    await new Promise(r => setTimeout(r, 420))
    setDeletingServer(prev => ({ ...prev, [srv.id]: 'collapsing' }))
    await new Promise(r => setTimeout(r, 300))
    setServers(prev => prev.filter(s => s.id !== srv.id))
    setDeletingServer(prev => { const n = { ...prev }; delete n[srv.id]; return n })
  }

  const copyIp = (srv) => navigator.clipboard.writeText(`${srv.ip}:${srv.port}`)

  const connectToServer = async (srv) => {
    if (!activeAccount) { notify?.({ message: t('servers.needAccount'), type: 'error' }); setActiveView?.('accounts'); return }
    if (!settings) return
    setLaunching?.(true); setLogs?.([]); setActiveView?.('console')
    const result = await window.eclipse.launchGame({ account: activeAccount, version: settings.lastVersion || '1.21.4', settings, serverHost: srv.ip, serverPort: srv.port })
    if (!result.ok) { setLaunching?.(false); notify?.({ message: t('servers.launchError', { error: result.error }), type: 'error' }) }
  }

  const sorted = [...servers].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.name.localeCompare(b.name))

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          {t('servers.title')}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={pingAll}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>{t('servers.refresh')}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>+ {t('servers.add')}</button>
        </div>
      </div>

      {showAdd && (
        <div className="card srv-add-form">
          <input autoFocus placeholder={t('servers.namePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 8 }} />
          <input placeholder={t('servers.ipPlaceholder')} value={newIp}
            onChange={e => setNewIp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addServer()}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addServer}>{t('servers.add')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setNewName(''); setNewIp('') }}>{t('servers.cancel')}</button>
          </div>
        </div>
      )}

      {servers.length === 0 && !showAdd && (
        <div className="view-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.35}}>
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <p>{t('servers.empty')}</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ {t('servers.addServer')}</button>
        </div>
      )}

      <div className="srv-list">
        {sorted.map(srv => {
          const ping = pingResults[srv.id]
          const isPinging = pinging[srv.id]
          const isEating = deletingServer[srv.id] === 'eating'
          const isCollapsing = deletingServer[srv.id] === 'collapsing'
          return (
            <div key={srv.id} className={`srv-card card ${isEating ? 'bin-eating' : ''} ${isCollapsing ? 'bin-collapsing' : ''}`}>
              <div className={`srv-status ${!ping ? 'srv-unknown' : ping.online ? 'srv-online srv-online--pulse' : 'srv-offline'}`} />
              <div className="srv-info bin-label">
                <div className="srv-name">
                  {srv.favorite && <span className="srv-fav-star">⭐</span>}
                  {srv.name}
                </div>
                <div className="srv-ip">{srv.ip}{srv.port !== 25565 ? `:${srv.port}` : ''}</div>
                {ping && (
                  <div className="srv-ping-info">
                    {ping.online
                      ? <>
                          <span className="srv-online-txt">● {t('servers.online')}</span>
                          {ping.ms != null && (
                            <span className={`srv-ms ${ping.ms < 100 ? 'srv-ms--green' : ping.ms < 300 ? 'srv-ms--yellow' : 'srv-ms--red'}`}>
                              {ping.ms}ms
                            </span>
                          )}
                        </>
                      : <span className="srv-offline-txt">● {t('servers.offline')}</span>
                    }
                  </div>
                )}
              </div>
              <div className="srv-actions">
                <button className="btn btn-primary btn-sm srv-action-btn" onClick={() => connectToServer(srv)} disabled={launching} title={t('servers.connect')}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
                <button className="btn btn-ghost btn-sm srv-action-btn" onClick={() => pingServer(srv)} disabled={isPinging} title={t('servers.ping')}>
                  {isPinging ? <span className="srv-spinner" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
                </button>
                <button className="btn btn-ghost btn-sm srv-action-btn" onClick={() => copyIp(srv)} title={t('servers.copyIp')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button className="btn btn-ghost btn-sm srv-action-btn" onClick={() => toggleFavorite(srv.id)} title={t('servers.favorite')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={srv.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button className={`bin-btn ${isEating ? 'bin-btn--chomping' : ''}`} disabled={!!deletingServer[srv.id]} onClick={() => !deletingServer[srv.id] && deleteServer(srv)}>
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
