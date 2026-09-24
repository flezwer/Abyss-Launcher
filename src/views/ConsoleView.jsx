import { useState, useEffect, useRef, useCallback } from 'react'
// useRef still needed for bottomRef and boxRef
import './ConsoleView.css'
import { useI18n } from '../i18n'

// Picks the plural form (one / few / many / other) for the current locale
function plural(t, locale, base, count) {
  const cat = new Intl.PluralRules(locale).select(count)
  const key = `${base}${cat[0].toUpperCase()}${cat.slice(1)}`
  const s = t(key, { count })
  return s === key ? t(`${base}Other`, { count }) : s
}

export default function ConsoleView({ logs, setLogs, settings }) {
  const { t, locale } = useI18n()
  const bottomRef = useRef(null)
  const boxRef = useRef(null)
  const [filterText, setFilterText] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [wordWrap, setWordWrap] = useState(true)
  const [crash, setCrash] = useState(null)

  useEffect(() => {
    if (!settings?.gameDir) return
    window.eclipse.crashLatest({ gameDir: settings.gameDir }).then(r => { if (r.ok) setCrash(r) }).catch(() => {})
  }, [settings?.gameDir])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [searchIdx, setSearchIdx] = useState(0)

  const filteredLines = filterText
    ? logs.filter(l => typeof l === 'string' && l.toLowerCase().includes(filterText.toLowerCase()))
    : logs

  const searchLower = searchQuery.toLowerCase()
  const matchingIndices = searchQuery
    ? filteredLines.reduce((acc, l, i) => { if (typeof l === 'string' && l.toLowerCase().includes(searchLower)) acc.push(i); return acc }, [])
    : []
  const matches = matchingIndices.length

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Auto-pause scroll when user scrolls up; auto-resume when they reach the bottom
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onScroll = () => {
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40
      setAutoScroll(atBottom)
    }
    box.addEventListener('scroll', onScroll, { passive: true })
    return () => box.removeEventListener('scroll', onScroll)
  }, [])


  const highlightLine = useCallback((text) => {
    if (!searchQuery || typeof text !== 'string') return text
    const lower = text.toLowerCase()
    const parts = []; let last = 0, idx = lower.indexOf(searchLower)
    if (idx === -1) return text
    while (idx !== -1) {
      if (idx > last) parts.push(text.slice(last, idx))
      parts.push(<mark key={idx} className="console-highlight">{text.slice(idx, idx + searchQuery.length)}</mark>)
      last = idx + searchQuery.length
      idx = lower.indexOf(searchLower, last)
    }
    if (last < text.length) parts.push(text.slice(last))
    return <>{parts}</>
  }, [searchQuery, searchLower])

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          {t('console.title')}
        </h2>
      </div>
      {crash && (
        <div className="crash-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div style={{flex:1}}>
            <strong style={{fontSize:13}}>{t('console.lastCrash', { file: crash.file })}</strong>
            <div style={{fontSize:12,marginTop:2}}>{crash.desc}</div>
            {crash.exception && <div style={{fontSize:11,opacity:.7,fontFamily:'monospace'}}>{crash.exception}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setCrash(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <div className="console-toolbar">
        <input
          className="console-filter"
          placeholder={t('console.filterPlaceholder')}
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <button
          className={`btn btn-ghost btn-sm ${autoScroll ? 'active' : ''}`}
          onClick={() => setAutoScroll(s => !s)}
          title={autoScroll ? t('console.autoScrollOn') : t('console.autoScrollOff')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
            {autoScroll
              ? <><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></>
              : <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
            }
          </svg>
          {autoScroll ? t('console.auto') : t('console.manual')}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setLogs?.([])}
        >
          {t('console.clear')}
        </button>
        <button
          className={`btn btn-ghost btn-sm ${wordWrap ? 'active' : ''}`}
          onClick={() => setWordWrap(w => !w)}
          title={t('console.wordWrap')}
        ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg></button>
        <button
          className="btn btn-ghost btn-sm"
          title={t('console.exportLog')}
          onClick={() => window.eclipse.exportLogs({ gameDir: settings?.gameDir })}
          disabled={!settings?.gameDir}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
        </button>
        <button
          className={`btn btn-ghost btn-sm ${searchActive ? 'active' : ''}`}
          onClick={() => setSearchActive(s => !s)}
          title={t('console.search')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <span className="console-count">{plural(t, locale, 'console.lines', filteredLines.length)}</span>
      </div>
      {searchActive && (
        <div className="console-search-bar">
          <input
            autoFocus
            placeholder={t('console.searchPlaceholder')}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchIdx(0) }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setSearchActive(false); setSearchQuery('') }
              if (e.key === 'Enter') {
                if (e.shiftKey) setSearchIdx(i => Math.max(0, i - 1))
                else setSearchIdx(i => Math.min(i + 1, matches - 1))
              }
            }}
          />
          <span className="console-search-count">
            {searchQuery ? `${Math.min(searchIdx + 1, matches)} / ${matches}` : ''}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearchActive(false); setSearchQuery('') }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <div className="console-box" ref={boxRef} style={wordWrap ? {} : { whiteSpace: 'pre', overflowX: 'auto' }}>
        {filteredLines.length === 0 && (
          <p className="console-empty">
            {filterText ? t('console.noMatches') : t('console.empty')}
          </p>
        )}
        {filteredLines.map((line, i) => (
          <div key={i} className={`console-line log-line ${getLineClass(line)}`}>
            {highlightLine(line)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function getLineClass(line) {
  if (typeof line !== 'string') return ''
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('fatal')) return 'log-error'
  if (l.includes('warn')) return 'log-warn'
  if (l.includes('info')) return 'log-info'
  return 'log-debug'
}
