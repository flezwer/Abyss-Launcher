import { useState, useEffect } from 'react'
import './StatsView.css'
import { fmtTime } from '../utils/time'
import { useI18n } from '../i18n'

export default function StatsView() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState(null)
  const [playtime, setPlaytime] = useState({})
  const [weekData, setWeekData] = useState([])

  useEffect(() => {
    window.eclipse.getStats().then(s => { if (s.ok) setStats(s) }).catch(() => {})
    window.eclipse.loadPlaytime().then(setPlaytime).catch(() => {})
  }, [])

  useEffect(() => {
    // Build last 14 days from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('eclipse-daily-ms') || '[]')
      const today = new Date().toISOString().slice(0, 10)
      const days = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const date = d.toISOString().slice(0, 10)
        const label = d.toLocaleDateString(locale, { weekday: 'short' })
        const found = stored.find(s => s.date === date)
        days.push({ date, label, ms: found?.ms || 0, isToday: date === today })
      }
      setWeekData(days)
    } catch {}
  }, [locale])

  const sorted = Object.values(playtime).sort((a,b) => b.totalMs - a.totalMs)

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          {t('stats.title')}
        </h2>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-value">{fmtTime(stats.totalMs)}</div>
            <div className="stat-label">{t('stats.totalPlaytime')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 4 0v2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="10" x2="12" y2="14"/>
              </svg>
            </div>
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">{t('stats.totalSessions')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
            </div>
            <div className="stat-value">{stats.topVersion}</div>
            <div className="stat-label">{t('stats.topVersion')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <div className="stat-value">{stats.totalInstances}</div>
            <div className="stat-label">{t('stats.instances')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div className="stat-value">{stats.totalMods}</div>
            <div className="stat-label">{t('stats.modsInstalled')}</div>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {t('stats.byAccountVersion')}
          </h3>
          <div className="playtime-bars">
            {sorted.map((p, i) => {
              const pct = stats?.totalMs ? Math.round((p.totalMs / stats.totalMs) * 100) : 0
              return (
                <div key={i} className="pt-bar-row">
                  <div className="pt-bar-info">
                    <span className="pt-bar-name">{p.username} — MC {p.version}</span>
                    <span className="pt-bar-time">{fmtTime(p.totalMs)}</span>
                  </div>
                  <div className="pt-bar-track">
                    <div className="pt-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {weekData.some(d => d.ms > 0) && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {t('stats.last14Days')}
            </span>
            <span className="week-total-label">
              {(() => {
                const totalMs = weekData.reduce((s, d) => s + d.ms, 0)
                const h = Math.floor(totalMs / 3600000)
                const m = Math.floor((totalMs % 3600000) / 60000)
                return totalMs > 0 ? t('stats.periodTotal', { time: `${h > 0 ? `${h}h ` : ''}${m}m` }) : ''
              })()}
            </span>
          </h3>
          <div className="week-chart week-chart--14">
            {weekData.map(d => {
              const maxMs = Math.max(...weekData.map(x => x.ms), 1)
              const pct = Math.round((d.ms / maxMs) * 100)
              const h = Math.floor(d.ms / 3600000)
              const m = Math.floor((d.ms % 3600000) / 60000)
              return (
                <div key={d.date} className="week-bar-col">
                  <div className="week-bar-val">{d.ms > 0 ? (h > 0 ? `${h}h${m}m` : `${m}m`) : ''}</div>
                  <div className="week-bar-track">
                    <div
                      className={`week-bar-fill${d.isToday ? ' week-bar-fill--today' : ''}`}
                      style={{ transform: `scaleY(${pct / 100})`, opacity: d.ms > 0 ? 1 : 0.15 }}
                    />
                  </div>
                  <div className={`week-bar-label${d.isToday ? ' week-bar-label--today' : ''}`}>{d.label}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Versiones más jugadas ── */}
      {(() => {
        const byVersion = {}
        Object.values(playtime).forEach(p => {
          if (!byVersion[p.version]) byVersion[p.version] = { version: p.version, totalMs: 0, sessions: 0 }
          byVersion[p.version].totalMs += p.totalMs
          byVersion[p.version].sessions += p.sessions
        })
        const verList = Object.values(byVersion).sort((a, b) => b.totalMs - a.totalMs)
        if (verList.length === 0) return null
        const maxMs = verList[0].totalMs
        return (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              {t('stats.timeByVersion')}
            </h3>
            <div className="playtime-bars">
              {verList.map((v, i) => {
                const pct = Math.round((v.totalMs / maxMs) * 100)
                const h = Math.floor(v.totalMs / 3600000)
                const m = Math.floor((v.totalMs % 3600000) / 60000)
                return (
                  <div key={v.version} className="pt-bar-row">
                    <div className="pt-bar-info">
                      <span className="pt-bar-name" style={{ color: 'var(--accent-bright)' }}>MC {v.version}</span>
                      <span className="pt-bar-time">{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>
                    </div>
                    <div className="pt-bar-track">
                      <div className="pt-bar-fill" style={{ width: `${pct}%`, opacity: 0.85 + i * 0 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {sorted.length === 0 && !stats && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}>
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <p>{t('stats.empty')}</p>
        </div>
      )}
    </div>
  )
}
