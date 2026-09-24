import { useState, useRef } from 'react'
import './AccountsView.css'
import PlayerAvatar from '../components/PlayerAvatar'

const IcOffline = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IcPremium = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IcSkin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IcOfflineBtn = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
)
const IcMicrosoft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
    <rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>
  </svg>
)

export default function AccountsView({ accounts, activeAccount, setActiveAccount, saveAccounts }) {
  const [mode, setMode] = useState(null) // 'offline' | 'premium'
  const [username, setUsername] = useState('')
  const [previewAcc, setPreviewAcc] = useState(null)
  const [authType, setAuthType] = useState('offline') // 'offline' | 'microsoft'
  const [skinMsg, setSkinMsg] = useState('')
  const [skinPreview, setSkinPreview] = useState(null)
  const skinInputRef = useRef(null)

  // Microsoft device-code flow state
  const [msStep, setMsStep] = useState('idle') // 'idle' | 'loading' | 'waiting' | 'error'
  const [msCode, setMsCode] = useState(null)   // { userCode, verificationUri }
  const [msError, setMsError] = useState('')
  const pollRef = useRef(null)

  const handleSkinUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !previewAcc) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      const base64 = dataUrl.split(',')[1]
      setSkinPreview(dataUrl)
      try {
        await window.eclipse.saveSkin({ username: previewAcc.username, base64 })
        setSkinMsg('Skin guardada')
      } catch {
        setSkinMsg('Error al guardar skin')
      }
      setTimeout(() => setSkinMsg(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const openPreview = async (acc) => {
    setPreviewAcc(acc)
    setSkinMsg('')
    setSkinPreview(null)
    if (acc.type === 'offline') {
      try {
        const res = await window.eclipse.getSkin({ username: acc.username })
        if (res.ok) setSkinPreview(`data:image/png;base64,${res.base64}`)
      } catch {}
    }
  }

  const cancelMs = () => {
    clearInterval(pollRef.current)
    setMsStep('idle')
    setMsCode(null)
    setMsError('')
  }

  const startMsAuth = async () => {
    setMsStep('loading')
    setMsError('')
    const res = await window.eclipse.msAuthStart()
    if (!res.ok) { setMsStep('error'); setMsError(res.error); return }
    setMsCode({ userCode: res.userCode, verificationUri: res.verificationUri })
    setMsStep('waiting')
    window.eclipse.openExternal(res.verificationUri)

    const interval = (res.interval || 5) * 1000
    pollRef.current = setInterval(async () => {
      const poll = await window.eclipse.msAuthPoll()
      if (poll.status === 'pending') return
      clearInterval(pollRef.current)
      if (poll.status === 'error') {
        setMsStep('error')
        setMsError(poll.error)
        return
      }
      // success
      const next = [...accounts, poll.account]
      saveAccounts(next)
      setActiveAccount(poll.account)
      setMsStep('idle')
      setMsCode(null)
      setMode(null)
    }, interval)
  }

  const addOffline = () => {
    if (!username.trim()) return
    const acc = { id: Date.now().toString(), type: 'offline', username: username.trim() }
    const next = [...accounts, acc]
    saveAccounts(next)
    setActiveAccount(acc)
    setMode(null)
    setUsername('')
  }

  const removeAccount = (id) => {
    const next = accounts.filter(a => a.id !== id)
    saveAccounts(next)
    if (activeAccount?.id === id) setActiveAccount(next[0] ?? null)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Cuentas
        </h2>
        <div className="account-add-btns">
          <button className="btn btn-ghost" onClick={() => { setMode('add'); setAuthType('offline') }}>
            + Añadir cuenta
          </button>
        </div>
      </div>

      {/* Formulario añadir cuenta */}
      {mode === 'add' && (
        <div className="card add-form">
          <h3>Nueva cuenta</h3>
          <div className="auth-type-toggle" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`auth-btn btn btn-sm ${authType === 'offline' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAuthType('offline')}><IcOfflineBtn />Offline</button>
            <button className={`auth-btn btn btn-sm ${authType === 'microsoft' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAuthType('microsoft')}><IcMicrosoft />Microsoft</button>
          </div>

          {authType === 'offline' && (
            <>
              <p className="form-note">Podrás jugar en servidores offline y singleplayer. No requiere cuenta de Mojang.</p>
              <div className="form-row">
                <input
                  autoFocus
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOffline()}
                  maxLength={16}
                />
                <button className="btn btn-primary" onClick={addOffline}>Añadir</button>
                <button className="btn btn-ghost" onClick={() => { setMode(null); setUsername('') }}>Cancelar</button>
              </div>
            </>
          )}

          {authType === 'microsoft' && (
            <>
              {msStep === 'idle' && (
                <>
                  <p className="form-note">Inicia sesión con tu cuenta de Microsoft para jugar con tu perfil real de Minecraft.</p>
                  <div className="form-row">
                    <button className="btn btn-primary" onClick={startMsAuth}>
                      <IcMicrosoft />Iniciar sesión con Microsoft
                    </button>
                    <button className="btn btn-ghost" onClick={() => setMode(null)}>Cancelar</button>
                  </div>
                </>
              )}

              {msStep === 'loading' && (
                <p className="form-note" style={{ color: 'var(--accent-bright)' }}>Conectando con Microsoft...</p>
              )}

              {msStep === 'waiting' && msCode && (
                <div className="ms-device-card">
                  <p className="form-note">Ingresa este código en <strong>microsoft.com/link</strong></p>
                  <div className="ms-user-code">{msCode.userCode}</div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => window.eclipse.openExternal(msCode.verificationUri)}>
                      Abrir microsoft.com/link →
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={cancelMs}>Cancelar</button>
                  </div>
                  <p className="form-note" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                    <span className="ms-spinner" /> Esperando confirmación...
                  </p>
                </div>
              )}

              {msStep === 'error' && (
                <>
                  <p className="form-note" style={{ color: '#f87171' }}>{msError}</p>
                  <div className="form-row">
                    <button className="btn btn-primary btn-sm" onClick={startMsAuth}>Reintentar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { cancelMs(); setMode(null) }}>Cancelar</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Lista de cuentas */}
      <div className="accounts-list">
        {accounts.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <p>No hay cuentas. Añade una para empezar.</p>
          </div>
        )}
        {accounts.map(acc => (
          <div
            key={acc.id}
            className={`account-row card ${activeAccount?.id === acc.id ? 'account-row--active' : ''}`}
            onClick={() => setActiveAccount(acc)}
          >
            <PlayerAvatar account={acc} size={38} />
            <div className="account-row-info">
              <div className="account-name">{acc.username}</div>
              <span className={`badge ${acc.type === 'offline' ? 'badge-offline' : 'badge-premium'}`}>
                {acc.type === 'offline' ? <><IcOffline />Offline</> : <><IcPremium />Premium</>}
              </span>
            </div>
            {activeAccount?.id === acc.id && (
              <span className="active-indicator">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:3}}><polyline points="20 6 9 17 4 12"/></svg>
                Activa
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); openPreview(acc) }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Skin
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={e => { e.stopPropagation(); removeAccount(acc.id) }}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {/* Skin preview */}
      {previewAcc && (
        <div className="skin-preview-panel card">
          <div className="skin-preview-header">
            <span className="skin-preview-title">Preview: {previewAcc.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreviewAcc(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="skin-preview-body">
            <div className="skin-preview-imgs">
              <div className="skin-img-wrap">
                <img
                  src={`https://crafatar.com/avatars/${encodeURIComponent(previewAcc.uuid || previewAcc.username)}?size=128&overlay`}
                  alt="Cabeza"
                  className="skin-img-head"
                  onError={e => e.target.style.display='none'}
                />
                <span className="skin-img-label">Cabeza</span>
              </div>
              <div className="skin-img-wrap">
                <img
                  src={`https://crafatar.com/renders/body/${encodeURIComponent(previewAcc.uuid || previewAcc.username)}?scale=4&overlay`}
                  alt="Cuerpo"
                  className="skin-img-body"
                  onError={e => e.target.style.display='none'}
                />
                <span className="skin-img-label">Cuerpo</span>
              </div>
            </div>
            <div className="skin-preview-info">
              <div className="account-name">{previewAcc.username}</div>
              <span className={`badge ${previewAcc.type === 'offline' ? 'badge-offline' : 'badge-premium'}`}>
                {previewAcc.type === 'offline' ? <><IcOffline />Offline</> : <><IcPremium />Premium</>}
              </span>
              <p className="form-note" style={{ marginTop: 8 }}>
                {previewAcc.type === 'offline'
                  ? 'Cuenta offline — skin generada por nombre.'
                  : 'Cuenta Microsoft — skin real.'}
              </p>
              {previewAcc.type === 'offline' && (
                <div className="skin-upload-section">
                  <input
                    ref={skinInputRef}
                    type="file"
                    accept=".png"
                    style={{ display: 'none' }}
                    onChange={handleSkinUpload}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => skinInputRef.current?.click()}>
                    <IcSkin />Subir skin
                  </button>
                  {skinPreview && (
                    <img
                      src={skinPreview}
                      alt="Skin personalizada"
                      className="skin-custom-preview"
                      style={{ width: 16, height: 32, imageRendering: 'pixelated', marginLeft: 8, verticalAlign: 'middle' }}
                    />
                  )}
                  {skinMsg && <span className="skin-msg" style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent-bright)' }}>{skinMsg}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
