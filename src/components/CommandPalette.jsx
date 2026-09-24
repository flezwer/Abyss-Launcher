import { useState, useEffect, useRef, useCallback } from 'react'
import './CommandPalette.css'
import { useT } from '../i18n'

// `hint` values are internal ids (also saved in recent commands); their visible text comes from HINT_LABELS.
const NAV_COMMANDS = [
  { id: 'nav-home',      labelKey: 'goHome',     hint: 'nav', action: 'nav', target: 'home' },
  { id: 'nav-mods',      labelKey: 'goMods',     hint: 'nav', action: 'nav', target: 'mods' },
  { id: 'nav-accounts',  labelKey: 'goAccounts', hint: 'nav', action: 'nav', target: 'accounts' },
  { id: 'nav-settings',  labelKey: 'goSettings', hint: 'nav', action: 'nav', target: 'settings' },
  { id: 'nav-console',   labelKey: 'goConsole',  hint: 'nav', action: 'nav', target: 'console' },
  { id: 'nav-servers',   labelKey: 'goServers',  hint: 'nav', action: 'nav', target: 'servers' },
  { id: 'nav-worlds',    labelKey: 'goWorlds',   hint: 'nav', action: 'nav', target: 'worlds' },
  { id: 'nav-stats',     labelKey: 'goStats',    hint: 'nav', action: 'nav', target: 'stats' },
  { id: 'action-launch', labelKey: 'launch',     hint: 'acción', action: 'launch' },
  { id: 'action-theme-dark',  labelKey: 'themeDark',  hint: 'tema', action: 'theme', target: 'dark' },
  { id: 'action-theme-light', labelKey: 'themeLight', hint: 'tema', action: 'theme', target: 'light' },
]

const HINT_LABELS = {
  nav: 'hintNav',
  acción: 'hintAction',
  tema: 'hintTheme',
  instancia: 'hintInstance',
  versión: 'hintVersion',
  mod: 'hintMod',
}

const GROUPS = [
  { hint: 'nav',       labelKey: 'groupNav' },
  { hint: 'instancia', labelKey: 'groupInstances' },
  { hint: 'acción',    labelKey: 'groupActions' },
  { hint: 'versión',   labelKey: 'groupVersions' },
  { hint: 'mod',       labelKey: 'groupMods' },
  { hint: 'tema',      labelKey: 'groupThemes' },
]

const HINT_ICONS = {
  nav: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  acción: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  tema: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  ),
  instancia: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  versión: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  mod: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6l-8 4l8 4l8-4l-8-4"/><path d="M4 14l8 4l8-4"/>
    </svg>
  ),
}

const RECENT_KEY = 'eclipse-recent-cmds'

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(cmd) {
  try {
    const prev = loadRecent().filter(r => r.id !== cmd.id)
    const next = [{ id: cmd.id, label: cmd.label, hint: cmd.hint, action: cmd.action, target: cmd.target }, ...prev].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

export default function CommandPalette({ open, onClose, setActiveView, instances, onLaunch, setTheme }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const [selected, setSelected] = useState(0)
  const [dynCmds, setDynCmds] = useState([])
  const [recentCmds, setRecentCmds] = useState([])

  useEffect(() => {
    if (!open) return
    setQuery(''); setSelected(0)
    setRecentCmds(loadRecent())
    setTimeout(() => inputRef.current?.focus(), 30)

    window.eclipse.fetchVersions?.().then(vs => {
      const verCmds = (vs || []).filter(v => v.type === 'release').slice(0, 20).map(v => ({
        id: `ver-${v.id}`,
        label: `Minecraft ${v.id}`,
        hint: 'versión',
        action: 'launch-version',
        target: v.id,
      }))
      window.eclipse.listMods?.({}).then(mods => {
        const modCmds = (mods || []).slice(0, 30).map(m => ({
          id: `mod-${m.name}`,
          label: m.name,
          hint: 'mod',
          action: 'nav',
          target: 'mods',
        }))
        setDynCmds([...verCmds, ...modCmds])
      }).catch(() => setDynCmds(verCmds))
    }).catch(() => setDynCmds([]))
  }, [open])

  const instanceCmds = (instances || []).map(inst => ({
    id: `launch-${inst.id}`,
    label: `${inst.name} (${inst.version})`,
    hint: 'instancia',
    action: 'launch-instance',
    target: inst,
  }))

  const navCmds = NAV_COMMANDS.map(c => ({ ...c, label: t(`palette.${c.labelKey}`) }))
  // Recent built-in commands show their label in the current language
  const recentList = recentCmds.map(r => navCmds.find(c => c.id === r.id) || r)

  const all = [...navCmds, ...instanceCmds, ...dynCmds]
  const q = query.toLowerCase().trim()
  const filtered = q ? all.filter(c => c.label.toLowerCase().includes(q)) : all

  // Build grouped list
  const byHint = GROUPS.map(g => ({ label: t(`palette.${g.labelKey}`), items: filtered.filter(c => c.hint === g.hint) }))
  const grouped = q
    ? byHint.filter(g => g.items.length > 0)
    : [
        ...(recentList.length > 0 ? [{ label: t('palette.groupRecent'), items: recentList }] : []),
        ...byHint,
      ].filter(g => g.items.length > 0)

  // Flat list of commands (for keyboard nav, skipping headers)
  const flatCmds = grouped.flatMap(g => g.items)

  const execute = useCallback((cmd) => {
    saveRecent(cmd)
    if (cmd.action === 'nav') setActiveView(cmd.target)
    if (cmd.action === 'launch') onLaunch?.()
    if (cmd.action === 'launch-instance') onLaunch?.(cmd.target)
    if (cmd.action === 'launch-version') { setActiveView('home'); onLaunch?.(cmd.target) }
    if (cmd.action === 'theme') setTheme?.(cmd.target)
    onClose()
  }, [setActiveView, onLaunch, setTheme, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatCmds.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && flatCmds[selected]) execute(flatCmds[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, flatCmds, selected, execute, onClose])

  if (!open) return null

  // Build flat index map for selection highlighting
  let flatIdx = 0

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-panel" onClick={e => e.stopPropagation()}>
        <div className="cp-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="cp-input"
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
          />
          <kbd className="cp-esc">ESC</kbd>
        </div>
        <div className="cp-list">
          {flatCmds.length === 0 && q && <div className="cp-empty">{t('palette.noResults', { query })}</div>}
          {grouped.map(group => {
            const groupStart = flatIdx
            flatIdx += group.items.length
            return (
              <div key={group.label}>
                <div className="cp-group-label">{group.label}</div>
                {group.items.map((cmd, i) => {
                  const idx = groupStart + i
                  return (
                    <div
                      key={cmd.id}
                      className={`cp-item ${idx === selected ? 'cp-item--selected' : ''}`}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => execute(cmd)}
                    >
                      <span className="cp-label">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="cp-hint">
                          {HINT_ICONS[cmd.hint]}
                          {HINT_LABELS[cmd.hint] ? t(`palette.${HINT_LABELS[cmd.hint]}`) : cmd.hint}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
