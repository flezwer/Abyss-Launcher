import { useState, useEffect, useCallback, useRef } from 'react'
import './ModsView.css'
import LiquidButton from '../components/LiquidButton'
import { useT } from '../i18n'

// ── Pagination component (module-level to avoid remount on every render) ──────
function Pagination({ total, cur, onChange }) {
  if (total <= 1) return null
  const pages = []
  const delta = 2
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= cur - delta && i <= cur + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return (
    <div className="pagination">
      <button className="pg-btn" disabled={cur === 1} onClick={() => onChange(cur - 1)}>‹</button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} className="pg-ellipsis">…</span>
          : <button key={p} className={`pg-btn ${p === cur ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      )}
      <button className="pg-btn" disabled={cur === total} onClick={() => onChange(cur + 1)}>›</button>
    </div>
  )
}

const LOADERS = ['fabric', 'forge', 'quilt', 'neoforge', 'any']

// ── Iconos SVG inline ─────────────────────────────────────────────────────────
const IconMods = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.91 8.84L8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67z"/>
    <path d="M3.09 8.84L15.44 2.23a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .05 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67z"/>
    <line x1="12" y1="22" x2="12" y2="13"/>
    <path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"/>
  </svg>
)
const IconModpacks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
)
const IconShaders = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IconRP = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)
const IconScreenshots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const CATEGORIES = [
  { id: 'mods',          labelKey: 'mods.catMods',          Icon: IconMods         },
  { id: 'modpacks',      labelKey: 'mods.catModpacks',      Icon: IconModpacks     },
  { id: 'shaders',       labelKey: 'mods.catShaders',       Icon: IconShaders      },
  { id: 'resourcepacks', labelKey: 'mods.catResourcepacks', Icon: IconRP           },
  { id: 'screenshots',   labelKey: 'mods.catScreenshots',   Icon: IconScreenshots  },
]

const PER_PAGE_OPTIONS = [12, 24, 48, 100]

const IcDl = ({size=10}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:3}}>
    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="21" x2="12" y2="3"/>
  </svg>
)
const IcTrash = ({size=13}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const IcPlay = ({size=13}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const IcPause2 = ({size=13}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
)
const IcPuzzle = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const IcCamera = ({size=36}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcStar2 = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IcImage = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IcSave2 = ({size=13}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IcLayers2 = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
)

export default function ModsView({ settings, addToQueue, updateQueue, notify }) {
  const t = useT()
  const [platform, setPlatform] = useState('modrinth')
  const [tab, setTab]           = useState('search')
  const [category, setCategory] = useState('mods')

  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [totalHits, setTotalHits] = useState(0)
  const [searching, setSearching] = useState(false)
  const [mcVersion, setMcVersion] = useState('')
  const [loader, setLoader]       = useState('fabric')
  const [cfError, setCfError]     = useState('')

  // Paginación global
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(24)

  // Popular / trending (sin buscar)
  const [popular, setPopular]           = useState([])
  const [loadingPopular, setLoadingPopular] = useState(false)
  const [popularTotal, setPopularTotal] = useState(0)
  const [popularPage, setPopularPage]   = useState(1)
  const POPULAR_PER_PAGE = 100

  const [modal, setModal]             = useState(null)
  const [modalFiles, setModalFiles]   = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [installing, setInstalling]   = useState({})

  const [installed, setInstalled]     = useState([])
  const [loadingInst, setLoadingInst] = useState(false)

  const [shaderQuery, setShaderQuery] = useState('')
  const [shaderResults, setShaderResults] = useState([])
  const [shaderSearching, setShaderSearching] = useState(false)
  const [installedShaders, setInstalledShaders] = useState([])
  const [shaderTab, setShaderTab] = useState('search')
  const [shaderPopular, setShaderPopular] = useState([])
  const [installingShader, setInstallingShader] = useState({})
  const [deletingShader, setDeletingShader] = useState({})

  const [rpQuery, setRpQuery] = useState('')
  const [rpResults, setRpResults] = useState([])
  const [rpSearching, setRpSearching] = useState(false)
  const [installedRPs, setInstalledRPs] = useState([])
  const [rpTab, setRpTab] = useState('search')
  const [rpPopular, setRpPopular] = useState([])
  const [installingRP, setInstallingRP] = useState({})
  const [deletingRP, setDeletingRP] = useState({})

  const [screenshots, setScreenshots] = useState([])
  const [loadingShots, setLoadingShots] = useState(false)
  const [fullscreenShot, setFullscreenShot] = useState(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  const [mpQuery, setMpQuery] = useState('')
  const [mpResults, setMpResults] = useState([])
  const [mpSearching, setMpSearching] = useState(false)
  const [mpLoader, setMpLoader] = useState('fabric')
  const [mpPopular, setMpPopular] = useState([])
  const [mpInstalling, setMpInstalling] = useState(false)
  const [mpProgress, setMpProgress] = useState({ done: 0, total: 0 })

  // ── Bloque 5: Category chips ──────────────────────────────────────────────
  const [categories, setCategories] = useState([])
  const [activeCategories, setActiveCategories] = useState([])

  // ── Bloque 5: Profiles ────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState([])
  const [activeProfile, setActiveProfile] = useState(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)

  // ── Bloque 5: Dependencies ────────────────────────────────────────────────
  const [modalDeps, setModalDeps] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)

  // ── Bloque 5: Update checker ──────────────────────────────────────────────
  const [updateResults, setUpdateResults] = useState({})
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updatingMod, setUpdatingMod] = useState({})
  // "bin eats label" delete animation
  const [deletingMod, setDeletingMod] = useState({})

  // ── Bloque 9: Favoritos ───────────────────────────────────────────────────
  const [favorites, setFavorites] = useState([])
  const [showFavsOnly, setShowFavsOnly] = useState(false)

  // ── Feature: Mods search + sort ──────────────────────────────────────────
  const [modSearch, setModSearch] = useState('')
  const [modSort, setModSort] = useState('name') // 'name' | 'enabled'

  // ── Feature: mrpack drag-drop ─────────────────────────────────────────────
  const [draggingMrpack, setDraggingMrpack] = useState(false)
  const [mrpackInstalling, setMrpackInstalling] = useState(false)
  const [mrpackProgress, setMrpackProgress] = useState({ done: 0, total: 0 })

  // ── Feature: Profile name for save ───────────────────────────────────────
  const [profileName, setProfileName] = useState('')

  const gameDir  = settings?.gameDir  ?? ''
  const cfApiKey = settings?.curseforgeApiKey ?? ''

  // ── Fetch Modrinth categories on mount ───────────────────────────────────
  useEffect(() => {
    window.eclipse.modrinthCategories().then(cats => setCategories(cats)).catch(() => {})
  }, [])

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (forcePage) => {
    if (!query.trim() && activeCategories.length === 0) { setResults([]); setTotalHits(0); return }
    const pg = forcePage ?? page
    setSearching(true); setCfError('')
    try {
      if (platform === 'modrinth') {
        const extraFacets = activeCategories.map(cat => [`categories:${cat}`])
        const data = await window.eclipse.searchMods({
          query, version: mcVersion, loader: loader === 'any' ? '' : loader,
          limit: perPage, offset: (pg - 1) * perPage,
          extraFacets: extraFacets.length ? extraFacets : undefined,
        })
        setResults((data.hits || []).map(h => ({ _src: 'modrinth', ...h })))
        setTotalHits(data.total_hits ?? data.hits?.length ?? 0)
      } else {
        const res = await window.eclipse.cfSearch({ query, version: mcVersion, loader, apiKey: cfApiKey })
        if (!res.ok) { setCfError(res.error); setResults([]); setTotalHits(0) }
        else { setResults((res.data || []).map(m => ({ _src: 'curseforge', ...m }))); setTotalHits(res.data?.length ?? 0) }
      }
    } catch (e) { setResults([]); setTotalHits(0); setCfError(e.message) }
    setSearching(false)
  }, [query, mcVersion, loader, platform, cfApiKey, perPage, activeCategories])

  useEffect(() => {
    const t = setTimeout(() => { if (query.trim() || activeCategories.length > 0) doSearch(1).then(()=>setPage(1)); else { setResults([]); setTotalHits(0) } }, 500)
    return () => clearTimeout(t)
  }, [query, mcVersion, loader, platform, perPage, activeCategories])

  // ── Cargar populares al cambiar categoría ─────────────────────────────────
  useEffect(() => {
    if (category === 'mods' && tab === 'search' && popular.length === 0) {
      loadPopularMods(1)
    }
    if (category === 'shaders' && shaderTab === 'search' && shaderPopular.length === 0) {
      loadPopularShaders()
    }
    if (category === 'resourcepacks' && rpTab === 'search' && rpPopular.length === 0) {
      loadPopularRPs()
    }
    if (category === 'modpacks' && mpPopular.length === 0) {
      loadPopularModpacks()
    }
    if (category === 'screenshots') loadScreenshots()
    if (category === 'shaders' && shaderTab === 'installed') loadShaders()
    if (category === 'resourcepacks' && rpTab === 'installed') loadRPs()
  }, [category, tab, shaderTab, rpTab, gameDir, perPage])   // #fix: missing tab dep

  const loadPopularMods = async (page = 1) => {
    setLoadingPopular(true)
    try {
      const offset = (page - 1) * POPULAR_PER_PAGE
      const res = await window.eclipse.modrinthPopular({ type: 'mod', version: mcVersion, loader: loader === 'any' ? '' : loader, limit: POPULAR_PER_PAGE, offset })
      const hits = res.hits || res || []
      const total = res.total ?? hits.length
      setPopular(hits)
      setPopularTotal(total)
      setPopularPage(page)
    } catch { setPopular([]) }
    setLoadingPopular(false)
  }

  const loadPopularShaders = async () => {
    try {
      const hits = await window.eclipse.modrinthPopular({ type: 'shader', version: '', loader: '', limit: perPage })
      setShaderPopular(hits || [])
    } catch { setShaderPopular([]) }
  }

  const loadPopularRPs = async () => {
    try {
      const hits = await window.eclipse.modrinthPopular({ type: 'resourcepack', version: '', loader: '', limit: perPage })
      setRpPopular(hits || [])
    } catch { setRpPopular([]) }
  }

  const loadPopularModpacks = async () => {
    try {
      const hits = await window.eclipse.modrinthPopular({ type: 'modpack', version: '', loader: '', limit: perPage })
      setMpPopular(hits || [])
    } catch { setMpPopular([]) }
  }

  // ── Instalados ─────────────────────────────────────────────────────────────
  const loadInstalled = useCallback(async () => {
    if (!gameDir) return
    setLoadingInst(true)
    const list = await window.eclipse.listMods({ gameDir })
    setInstalled(list)
    setLoadingInst(false)
  }, [gameDir])

  useEffect(() => {
    if (tab === 'installed') {
      loadInstalled()
      window.eclipse.loadProfiles().then(setProfiles).catch(() => {})
      window.eclipse.loadFavorites().then(setFavorites).catch(() => {})
    }
  }, [tab, loadInstalled])

  // ── Auto-check de actualizaciones al entrar a Instalados ──────────────────
  const updateCheckedRef = useRef(false)

  useEffect(() => {
    if (tab !== 'installed') { updateCheckedRef.current = false; setUpdateResults({}) }
  }, [tab])

  useEffect(() => {
    if (tab !== 'installed' || installed.length === 0 || updateCheckedRef.current) return
    updateCheckedRef.current = true
    ;(async () => {
      setCheckingUpdates(true)
      try {
        const res = await window.eclipse.checkModUpdates({ gameDir, mcVersion, loader: loader === 'any' ? '' : loader })
        const map = {}
        res.forEach(r => { map[r.file] = r })
        setUpdateResults(map)
      } catch {}
      setCheckingUpdates(false)
    })()
  }, [tab, installed.length, gameDir, mcVersion, loader])

  const toggleFav = async (filename) => {
    const next = favorites.includes(filename)
      ? favorites.filter(f => f !== filename)
      : [...favorites, filename]
    setFavorites(next)
    await window.eclipse.saveFavorites(next).catch(() => {})
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const openMod = async (mod) => {
    setModal(mod); setModalFiles([]); setLoadingFiles(true)
    try {
      if (mod._src === 'modrinth' || !mod._src) {
        const activeLoader = category === 'modpacks' ? mpLoader : loader   // #fix: wrong loader for modpacks
        const vers = await window.eclipse.modVersions({ projectId: mod.project_id, mcVersion, loader: activeLoader === 'any' ? '' : activeLoader })
        setModalFiles(vers.map(v => ({
          _src: 'modrinth', id: v.id,
          name: v.name || v.version_number,
          gameVersions: v.game_versions?.slice(0, 3) ?? [],
          loaders: v.loaders ?? [],
          fileName: v.files?.[0]?.filename,
          url: v.files?.[0]?.url,
        })))
      } else {
        const res = await window.eclipse.cfFiles({ modId: mod.id, version: mcVersion, loader: loader === 'any' ? '' : loader, apiKey: cfApiKey })
        if (res.ok) setModalFiles((res.data || []).map(f => ({
          _src: 'curseforge', id: f.id, modId: mod.id,
          name: f.displayName, gameVersions: f.gameVersions?.slice(0, 3) ?? [],
          loaders: [], fileName: f.fileName, url: f.downloadUrl,
        })))
      }
    } catch { setModalFiles([]) }
    setLoadingFiles(false)
  }

  const installFile = async (file) => {
    const key = file.id
    const qid = `${file.id}-${Date.now()}`
    addToQueue?.(qid, file.name || file.fileName || file.id)
    setInstalling(prev => ({ ...prev, [key]: { loading: true, progress: 0, done: false } }))
    let sim = 0
    const ticker = setInterval(() => {
      sim = Math.min(sim + Math.random() * 18, 90)
      setInstalling(prev => ({ ...prev, [key]: { ...prev[key], progress: Math.round(sim) } }))
    }, 200)
    try {
      if (file._src === 'modrinth') {
        await window.eclipse.installMod({ fileUrl: file.url, fileName: file.fileName, gameDir })
      } else {
        await window.eclipse.cfInstall({ modId: file.modId, fileId: file.id, fileName: file.fileName, downloadUrl: file.url, gameDir, apiKey: cfApiKey })
      }
      clearInterval(ticker)
      updateQueue?.(qid, 'done')
      setInstalling(prev => ({ ...prev, [key]: { loading: false, progress: 100, done: true } }))   // #fix: only set done:true on success
      setTimeout(() => {
        setInstalling(prev => { const n = { ...prev }; delete n[key]; return n })
        setModal(null)
      }, 1200)
    } catch {
      clearInterval(ticker)
      updateQueue?.(qid, 'error')
      setInstalling(prev => ({ ...prev, [key]: { loading: false, progress: 0, done: false } }))
    }
  }

  const toggleMod = async (mod) => {
    await window.eclipse.toggleMod({ gameDir, file: mod.file, enabled: !mod.enabled })
    loadInstalled()
  }
  const deleteMod = async (mod) => {
    // Phase 1: "eating" — content slides into the bin
    setDeletingMod(prev => ({ ...prev, [mod.file]: 'eating' }))
    await new Promise(r => setTimeout(r, 420))
    // Phase 2: card collapses
    setDeletingMod(prev => ({ ...prev, [mod.file]: 'collapsing' }))
    await new Promise(r => setTimeout(r, 300))
    // Actually delete
    await window.eclipse.deleteMod({ gameDir, file: mod.file })
    setDeletingMod(prev => { const n = { ...prev }; delete n[mod.file]; return n })
    loadInstalled()
  }

  const deleteWithAnimation = async (key, setDelMap, deleteFn) => {
    setDelMap(prev => ({ ...prev, [key]: 'eating' }))
    await new Promise(r => setTimeout(r, 420))
    setDelMap(prev => ({ ...prev, [key]: 'collapsing' }))
    await new Promise(r => setTimeout(r, 300))
    await deleteFn()
    setDelMap(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const saveProfile = async () => {
    if (!profileName.trim()) return
    const active = installed.filter(m => m.enabled).map(m => m.name)
    const next = [...profiles.filter(p => p.name !== profileName.trim()), { id: Date.now().toString(), name: profileName.trim(), mods: active }]
    setProfiles(next); await window.eclipse.saveProfiles(next); setProfileName('')
  }

  const applyProfile = async (profile) => {
    const profileMods = profile.mods || []
    for (const mod of installed) {
      const should = Array.isArray(profileMods) && profileMods.length > 0
        ? (typeof profileMods[0] === 'string'
          ? profileMods.includes(mod.name)
          : profileMods.some(pm => pm.file === mod.file))
        : false
      if (mod.enabled !== should) await window.eclipse.toggleMod({ gameDir, file: mod.file, enabled: should })
    }
    window.eclipse.listMods({ gameDir }).then(setInstalled)
  }

  // ── Shaders ───────────────────────────────────────────────────────────────
  const searchShaders = async () => {
    if (!shaderQuery.trim()) { setShaderResults([]); return }
    setShaderSearching(true)
    try {
      const hits = await window.eclipse.searchShaders({ query: shaderQuery, version: mcVersion })
      setShaderResults(hits)
    } catch { setShaderResults([]) }
    setShaderSearching(false)
  }
  const loadShaders = async () => {
    if (!gameDir) return
    const list = await window.eclipse.listShaders({ gameDir })
    setInstalledShaders(list)
  }
  const installShader = async (hit) => {
    const qid = `shader-${hit.project_id}-${Date.now()}`
    addToQueue?.(qid, hit.title || hit.project_id)
    try {
      const versions = await window.eclipse.modVersions({ projectId: hit.project_id, mcVersion, loader: '' })
      if (!versions.length) { updateQueue?.(qid, 'error'); return }
      const file = versions[0].files[0]
      setInstallingShader(prev => ({ ...prev, [hit.project_id]: true }))
      await window.eclipse.installShader({ fileUrl: file.url, fileName: file.filename, gameDir })
      setInstallingShader(prev => ({ ...prev, [hit.project_id]: false }))
      updateQueue?.(qid, 'done')
      loadShaders()
    } catch {
      setInstallingShader(prev => ({ ...prev, [hit.project_id]: false }))
      updateQueue?.(qid, 'error')
    }
  }

  // ── Resource Packs ────────────────────────────────────────────────────────
  const searchRPs = async () => {
    if (!rpQuery.trim()) { setRpResults([]); return }
    setRpSearching(true)
    try {
      const hits = await window.eclipse.searchResourcePacks({ query: rpQuery, version: mcVersion })
      setRpResults(hits)
    } catch { setRpResults([]) }
    setRpSearching(false)
  }
  const loadRPs = async () => {
    if (!gameDir) return
    const list = await window.eclipse.listResourcePacks({ gameDir })
    setInstalledRPs(list)
  }
  const installRP = async (hit) => {
    const qid = `rp-${hit.project_id}-${Date.now()}`
    addToQueue?.(qid, hit.title || hit.project_id)
    try {
      const versions = await window.eclipse.modVersions({ projectId: hit.project_id, mcVersion, loader: '' })
      if (!versions.length) { updateQueue?.(qid, 'error'); return }
      const file = versions[0].files[0]
      setInstallingRP(prev => ({ ...prev, [hit.project_id]: true }))
      await window.eclipse.installResourcePack({ fileUrl: file.url, fileName: file.filename, gameDir })
      setInstallingRP(prev => ({ ...prev, [hit.project_id]: false }))
      updateQueue?.(qid, 'done')
      loadRPs()
    } catch {
      setInstallingRP(prev => ({ ...prev, [hit.project_id]: false }))
      updateQueue?.(qid, 'error')
    }
  }

  // ── Screenshots ───────────────────────────────────────────────────────────
  const loadScreenshots = async () => {
    if (!gameDir) return
    setLoadingShots(true)
    const list = await window.eclipse.listScreenshots({ gameDir })
    setScreenshots(list)
    setLoadingShots(false)
  }

  // ── Lightbox keyboard navigation ──────────────────────────────────────────
  useEffect(() => {
    if (!fullscreenShot) return
    const handler = (e) => {
      if (e.key === 'Escape') setFullscreenShot(null)
      if (e.key === 'ArrowRight') setLightboxIdx(i => { const next = Math.min(i+1, screenshots.length-1); setFullscreenShot(screenshots[next]); return next })
      if (e.key === 'ArrowLeft')  setLightboxIdx(i => { const prev = Math.max(i-1, 0); setFullscreenShot(screenshots[prev]); return prev })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fullscreenShot, screenshots])

  // ── Modpacks ──────────────────────────────────────────────────────────────
  const searchModpacks = async () => {
    if (!mpQuery.trim()) { setMpResults([]); return }
    setMpSearching(true)
    try {
      const hits = await window.eclipse.searchModpacks({ query: mpQuery, version: mcVersion, loader: mpLoader })
      setMpResults(hits)
    } catch { setMpResults([]) }
    setMpSearching(false)
  }

  // ── Modpack installer ──────────────────────────────────────────────────────
  const handleInstallModpack = async (versionId) => {
    setMpInstalling(true)
    setMpProgress({ done: 0, total: 0 })
    window.eclipse.offModpackProgress?.()   // #fix: cleanup before re-registering to avoid listener leak
    window.eclipse.onModpackProgress(({ done, total }) => {
      setMpProgress({ done, total })
    })
    const res = await window.eclipse.installModpack({
      projectId: modal?.project_id,
      versionId,
      gameDir: settings?.gameDir || '',
    })
    window.eclipse.offModpackProgress?.()   // #fix: cleanup after install
    setMpInstalling(false)
    if (res.ok) {
      notify?.({ message: t('mods.modpackInstalled', { installed: res.installed, total: res.total }), type: 'success' })
    } else {
      notify?.({ message: t('mods.errorGeneric', { error: res.error }), type: 'error' })
    }
  }

  // ── Bloque 5: Fetch dependencies ──────────────────────────────────────────
  const fetchDeps = async (versionId) => {
    if (selectedVersionId === versionId) return
    setSelectedVersionId(versionId)
    setModalDeps([])
    try {
      const deps = await window.eclipse.modDependencies({ versionId })
      setModalDeps(deps)
    } catch {}
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const modIcon  = (mod) => { const u = mod._src === 'modrinth' || !mod._src ? mod.icon_url : mod.logo?.thumbnailUrl; return u ? <img src={u} alt="" /> : <IcPuzzle size={18} /> }
  const modTitle = (mod) => mod._src === 'curseforge' ? mod.name : mod.title
  const modDesc  = (mod) => mod._src === 'curseforge' ? mod.summary : mod.description
  const modDl    = (mod) => mod._src === 'curseforge' ? mod.downloadCount : mod.downloads
  const modCats  = (mod) => mod._src === 'curseforge' ? (mod.categories?.map(c=>c.name)?.slice(0,3)??[]) : (mod.categories?.slice(0,3)??[])

  // ── Componente: paginación ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalHits / perPage))

  const handlePageChange = (p) => {
    setPage(p)
    doSearch(p)
  }

  // ── Componente: grid de populares ─────────────────────────────────────────
  const PopularGrid = ({ items, loading, onInstall, installingMap, onOpen, label = t('mods.popularDefaultLabel'), source = 'Modrinth', total = 0, page = 1, perPageCount = 100, onPageChange }) => {
    const totalPages = Math.ceil(total / perPageCount)
    return (
    <div className="popular-section">
      <div className="popular-header">
        <span className="popular-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:6}}>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
          </svg>
          {t('mods.mostDownloaded')}
        </span>
        <span className="popular-sub">{fmtNum(total)} {label} · {source}</span>
      </div>
      {loading && <div className="mods-loading"><span className="big-spinner"/></div>}
      <div className="popular-grid">
        {items.map(hit => (
          <div key={hit.project_id} className="popular-card" onClick={() => onOpen ? onOpen(hit) : openMod({ ...hit, _src: 'modrinth' })}>
            <div className="popular-card-img">
              {hit.icon_url
                ? <img src={hit.icon_url} alt={hit.title} />
                : <IcPuzzle size={28} />}
            </div>
            <div className="popular-card-body">
              <div className="popular-card-name">{hit.title}</div>
              <div className="popular-card-desc">{hit.description}</div>
              <div className="popular-card-meta">
                <span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:2}}>
                    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="21" x2="12" y2="3"/>
                  </svg>
                  {fmtNum(hit.downloads)}
                </span>
                {hit.categories?.slice(0,2).map(c => <span key={c} className="popular-tag">{c}</span>)}
              </div>
            </div>
            <button
              className={`pop-dl-btn${installingMap?.[hit.project_id] ? ' pop-dl-btn--loading' : ''}`}
              onClick={e => { e.stopPropagation(); onInstall ? onInstall(hit) : (onOpen ? onOpen(hit) : openMod({ ...hit, _src: 'modrinth' })) }}
              title={t('mods.viewMod')}
            >
              <span className="pop-dl-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 17 12 21 16 17"/><line x1="12" y1="21" x2="12" y2="3"/>
                </svg>
              </span>
              <span className="pop-dl-bar"/>
            </button>
          </div>
        ))}
      </div>
      {onPageChange && totalPages > 1 && (
        <Pagination total={totalPages} cur={page} onChange={onPageChange} />
      )}
    </div>
  )}

  return (
    <div className="mods-view">
      {/* ── Top bar: categoria + platform ── */}
      <div className="mods-topbar">
        <nav className="mods-sidenav">
          <div className="mods-sidenav-label">{t('mods.sidebarLabel')}</div>
          {CATEGORIES.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              className={`mods-navbtn ${category === id ? 'active' : ''}`}
              onClick={() => setCategory(id)}
            >
              <span className="mods-navbtn-icon"><Icon /></span>
              <span className="mods-navbtn-label">{t(labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="mods-main">

          {/* ══ MODS ══ */}
          {category === 'mods' && (
            <>
              <div className="mods-header">
                <div className="mods-header-left">
                  <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    {t('mods.titleMods')}
                  </h2>
                  <div className="platform-toggle">
                    <button className={`platform-btn ${platform==='modrinth'?'active':''}`} onClick={()=>{setPlatform('modrinth');setResults([])}}>
                      {/* Modrinth logo — círculo con muesca angular */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
                        <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 2a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8zm-1 3v5.27L7.76 9.6 6.7 11.3l4.06 2.34V18h2v-4.36l4.06-2.34-1.06-1.7L12.5 12.3V7z"/>
                      </svg>
                      Modrinth
                    </button>
                    <button className={`platform-btn ${platform==='curseforge'?'active':''}`} onClick={()=>{setPlatform('curseforge');setResults([])}}>
                      {/* CurseForge logo — llama con base */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
                        <path d="M12 2s-1.5 2-2 4.5c-.3 1.5-.1 2.8.5 3.8C9.3 9.8 8.5 8.7 8.5 7.5 7 9 6 11 6 13a6 6 0 0 0 12 0c0-3-1.5-5.5-3.5-7 .2 1.2-.2 2.5-1 3.3C13.8 7.8 13.5 5.5 12 2z"/>
                      </svg>
                      CurseForge
                    </button>
                  </div>
                </div>
                <div className="mods-tabs">
                  <button className={`tab-btn ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    {t('mods.tabSearch')}
                  </button>
                  <button className={`tab-btn ${tab==='installed'?'active':''}`} onClick={()=>setTab('installed')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    {t('mods.tabInstalled')}
                  </button>
                </div>
                {tab==='installed' && <button className="btn btn-ghost btn-sm" onClick={()=>window.eclipse.openModsFolder({gameDir})}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  {t('mods.openFolder')}
                </button>}
              </div>

              {tab === 'search' && (
                <div className="mods-search-panel">
                  <div className="mods-filters">
                    <input className="mods-search-input" placeholder={t('mods.searchIn', { platform: platform==='modrinth'?'Modrinth':'CurseForge' })} value={query} onChange={e=>setQuery(e.target.value)} autoFocus />
                    <input placeholder={t('mods.mcVersionPlaceholder')} value={mcVersion} onChange={e=>setMcVersion(e.target.value)} style={{width:110}} />
                    <select value={loader} onChange={e=>setLoader(e.target.value)} style={{width:100}}>
                      {LOADERS.map(l=><option key={l} value={l}>{l === 'any' ? t('mods.loaderAny') : l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                    </select>
                    <div className="per-page-ctrl">
                      <span className="per-page-label">{t('mods.perPageLabel')}</span>
                      <select value={perPage} onChange={e=>{
                        const n = Number(e.target.value)
                        setPerPage(n); setPage(1)
                        // Reset popular arrays so the effect reloads them with the new limit
                        setPopular([]); setShaderPopular([]); setRpPopular([]); setMpPopular([])
                      }} style={{width:68}}>
                        {PER_PAGE_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Category chips */}
                  {platform === 'modrinth' && categories.length > 0 && (
                    <div className="cat-chips">
                      {categories.map(c => (
                        <button
                          key={c.name}
                          className={`cat-chip ${activeCategories.includes(c.name) ? 'active' : ''}`}
                          onClick={() => {
                            setActiveCategories(prev =>
                              prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name]
                            )
                            setPage(1)
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                      {activeCategories.length > 0 && (
                        <button className="cat-chip cat-chip-clear" onClick={() => setActiveCategories([])}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          {' '}{t('mods.clearFilters')}
                        </button>
                      )}
                    </div>
                  )}

                  {cfError && platform==='curseforge' && (
                    <div className="cf-error">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      {cfError}{!cfApiKey && t('mods.cfApiKeyHint')}
                    </div>
                  )}

                  {searching && <div className="mods-loading"><span className="big-spinner"/><span>{t('mods.searching')}</span></div>}

                  {!searching && !query.trim() && (
                    <PopularGrid items={popular} loading={loadingPopular} onOpen={mod => openMod({ ...mod, _src: 'modrinth' })} label={t('mods.labelMods')} source={platform === 'curseforge' ? 'CurseForge' : 'Modrinth'} total={popularTotal} page={popularPage} perPageCount={POPULAR_PER_PAGE} onPageChange={p => loadPopularMods(p)} />
                  )}

                  {!searching && results.length === 0 && query.trim() && !cfError && (
                    <div className="mods-empty">{t('mods.noResults', { query })}</div>
                  )}

                  {results.length > 0 && (
                    <div className="results-meta">
                      {totalHits > 0 && <span>{t('mods.resultsMeta', { total: fmtNum(totalHits), page, pages: totalPages })}</span>}
                    </div>
                  )}

                  <div className="mods-list">
                    {results.map(mod => (
                      <div key={mod._src+mod.project_id+mod.id} className="mod-card" onClick={()=>openMod(mod)}>
                        <div className="mod-icon">{modIcon(mod)}</div>
                        <div className="mod-info">
                          <div className="mod-name">{modTitle(mod)}</div>
                          <div className="mod-desc">{modDesc(mod)}</div>
                          <div className="mod-meta">
                            <span className="mod-tag"><IcDl />{fmtNum(modDl(mod))}</span>
                            {modCats(mod).map(c=><span key={c} className="mod-tag mod-tag-cat">{c}</span>)}
                            <span className={`mod-source-tag ${mod._src}`}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',verticalAlign:'middle',marginRight:3}}>
                                <circle cx="12" cy="12" r="10"/>
                              </svg>
                              {mod._src==='modrinth'?'Modrinth':'CF'}
                            </span>
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm">{t('mods.view')}</button>
                      </div>
                    ))}
                  </div>

                  {results.length > 0 && <Pagination total={totalPages} cur={page} onChange={handlePageChange} />}
                </div>
              )}

              {tab === 'installed' && (
                <div className="installed-panel"
                  onDragOver={e => {
                    e.preventDefault()
                    const items = [...(e.dataTransfer.items || [])]
                    const hasMrpack = items.some(i => i.kind === 'file')
                    // We'll detect the file type on drop; show banner for any file drag
                    setDraggingMrpack(hasMrpack)
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setDraggingMrpack(false)
                  }}
                  onDrop={async e => {
                    e.preventDefault()
                    setDraggingMrpack(false)
                    const allFiles = [...e.dataTransfer.files]
                    const mrpackFile = allFiles.find(f => f.name.endsWith('.mrpack'))
                    const jarFiles = allFiles.filter(f => f.name.endsWith('.jar'))
                    if (mrpackFile && gameDir) {
                      setMrpackInstalling(true)
                      setMrpackProgress({ done: 0, total: 0 })
                      window.eclipse.offModpackProgress?.()
                      window.eclipse.onModpackProgress(({ done, total }) => setMrpackProgress({ done, total }))
                      const res = await window.eclipse.installModpackLocal({ mrpackPath: mrpackFile.path, gameDir })
                      window.eclipse.offModpackProgress?.()
                      setMrpackInstalling(false)
                      if (res?.ok) {
                        notify?.({ message: t('mods.modpackInstalled', { installed: res.installed, total: res.total }), type: 'success' })
                        loadInstalled()
                      } else {
                        notify?.({ message: t('mods.modpackInstallError', { error: res?.error || t('mods.unknownError') }), type: 'error' })
                      }
                    } else if (jarFiles.length && gameDir) {
                      for (const f of jarFiles) {
                        await window.eclipse.installLocalMod({ srcPath: f.path, gameDir })
                      }
                      loadInstalled()
                    }
                  }}
                >
                  {draggingMrpack && (
                    <div className="mrpack-drop-banner">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                      </svg>
                      {t('mods.dropMrpack')}
                    </div>
                  )}
                  {mrpackInstalling && (
                    <div className="mrpack-installing-bar">
                      <span className="big-spinner" style={{width:14,height:14,borderWidth:2}}/>
                      {t('mods.installingModpackProgress', { done: mrpackProgress.done, total: mrpackProgress.total })}
                    </div>
                  )}
                  {/* Profile selector */}
                  <div className="profile-bar">
                    <button className={`profile-chip ${!activeProfile ? 'active' : ''}`} onClick={() => setActiveProfile(null)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                      {t('mods.allProfiles', { count: installed.length })}
                    </button>
                    {profiles.map(p => (
                      <div key={p.id} style={{display:'flex',gap:2,alignItems:'center'}}>
                        <button className={`profile-chip ${activeProfile === p.id ? 'active' : ''}`} onClick={() => setActiveProfile(p.id)}>
                          <IcLayers2 /> {p.name} ({(p.mods || []).length})
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => applyProfile(p)} title={t('mods.applyProfile', { count: (p.mods||[]).length })}><IcPlay size={11} /></button>
                        <button className="btn btn-ghost btn-sm" title={t('mods.deleteProfile')} style={{color:'#f87171'}} onClick={async () => {
                          const next = profiles.filter(pr => pr.id !== p.id)
                          setProfiles(next)
                          if (activeProfile === p.id) setActiveProfile(null)
                          await window.eclipse.saveProfiles(next)
                        }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ))}
                    {showNewProfile ? (
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input autoFocus placeholder={t('mods.profileNamePlaceholder')} value={newProfileName} onChange={e=>setNewProfileName(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newProfileName.trim()) {
                              const p = { id: Date.now().toString(), name: newProfileName.trim(), mods: [] }
                              const next = [...profiles, p]
                              setProfiles(next)
                              await window.eclipse.saveProfiles(next)
                              setShowNewProfile(false); setNewProfileName('')
                            }
                            if (e.key === 'Escape') { setShowNewProfile(false); setNewProfileName('') }
                          }}
                          style={{width:160}}
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewProfile(false); setNewProfileName('') }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowNewProfile(true)}>{t('mods.addProfile')}</button>
                    )}
                    <input className="tag-input" style={{width:110,fontSize:12}} placeholder={t('mods.newProfilePlaceholder')} value={profileName} onChange={e => setProfileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveProfile()} />
                    <button className="btn btn-ghost btn-sm" onClick={saveProfile}><IcSave2 /></button>
                    <button className="btn btn-ghost btn-sm" disabled={checkingUpdates} onClick={async () => {
                      setCheckingUpdates(true)
                      setUpdateResults({})
                      const res = await window.eclipse.checkModUpdates({ gameDir, mcVersion, loader: loader === 'any' ? '' : loader })
                      const map = {}
                      res.forEach(r => { map[r.file] = r })
                      setUpdateResults(map)
                      const count = Object.values(map).filter(r => r.hasUpdate).length
                      if (count > 0) try { localStorage.setItem('eclipse-mod-updates', String(count)) } catch {}
                      setCheckingUpdates(false)
                    }}>
                      {checkingUpdates ? <><span className="big-spinner" style={{width:12,height:12,borderWidth:2}}/> {t('mods.checking')}</> : t('mods.checkUpdates')}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <button
                      className={`btn btn-ghost btn-sm ${showFavsOnly ? 'active' : ''}`}
                      onClick={() => setShowFavsOnly(p => !p)}
                    >{t('mods.favoritesOnly')}</button>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    <input className="console-filter" placeholder={t('mods.filterInstalledPlaceholder')} value={modSearch} onChange={e => setModSearch(e.target.value)} />
                    <select className="mod-sort-select" value={modSort} onChange={e => setModSort(e.target.value)} title={t('mods.sortTitle')}>
                      <option value="name">{t('mods.sortAZ')}</option>
                      <option value="enabled">{t('mods.sortEnabledFirst')}</option>
                    </select>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}}
                      disabled={installed.length === 0}
                      onClick={async () => {
                        const visible = installed.filter(m =>
                          (!showFavsOnly || m.fav) &&
                          (!modSearch.trim() || m.file.toLowerCase().includes(modSearch.toLowerCase()))
                        )
                        if (!visible.length) return
                        const confirmMsg = modSearch.trim() || showFavsOnly ? t('mods.confirmDeleteFiltered', { count: visible.length }) : t('mods.confirmDeleteAll')
                        if (!window.confirm(confirmMsg)) return
                        for (const m of visible) {
                          await window.eclipse.deleteMod({ gameDir, file: m.file }).catch(() => {})
                        }
                        loadInstalled()
                      }}
                      title={t('mods.deleteAllTitle')}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}>
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      {t('mods.deleteAll')}
                    </button>
                  </div>
                  {loadingInst && <div className="mods-loading"><span className="big-spinner"/><span>{t('mods.loading')}</span></div>}
                  {!loadingInst && installed.length === 0 && (
                    <div className="mods-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.4}}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p>{t('mods.noModsInstalled')}</p>
                      <p style={{fontSize:11,opacity:.5}}>{t('mods.dragJarHint')}</p>
                    </div>
                  )}
                  <div className="installed-list">
                    {(activeProfile
                      ? installed.filter(m => {   // #fix: handle both string[] and {file}[] profile formats
                          const mods = profiles.find(p => p.id === activeProfile)?.mods || []
                          return mods.some(pm => typeof pm === 'string' ? pm === m.name : pm.file === m.file)
                        })
                      : installed
                    ).filter(m => !showFavsOnly || favorites.includes(m.file))
                     .filter(m => !modSearch || m.name.toLowerCase().includes(modSearch.toLowerCase()))
                     .sort((a, b) => modSort === 'enabled' ? (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0) : a.name.localeCompare(b.name))
                     .map(mod => (
                      <div key={mod.file} className={`installed-card ${mod.enabled?'':'disabled'} ${deletingMod[mod.file]==='eating'?'bin-eating':''} ${deletingMod[mod.file]==='collapsing'?'bin-collapsing':''}`}>
                        <div className="installed-icon"><IcPuzzle size={18} /></div>
                        <div className="installed-info bin-label">
                          <div className="installed-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="mod-dot" style={{ background: mod.enabled ? '#22c55e' : '#6b7280' }} />
                            {mod.name.replace(/\.(jar|disabled)$/i, '').replace(/-[\d]+(\.\d+)*(-[a-zA-Z0-9]+)*$/, '')}
                            {updateResults[mod.file]?.hasUpdate && (
                              <span className="mod-update-badge">{t('mods.updateAvailable')}</span>
                            )}
                            <button
                              className={`fav-btn ${favorites.includes(mod.file) ? 'fav-btn--active' : ''}`}
                              onClick={e => { e.stopPropagation(); toggleFav(mod.file) }}
                              title={t('mods.favorite')}
                            >⭐</button>
                          </div>
                          <div className="installed-status">{mod.enabled?<span className="status-on">{t('mods.statusEnabled')}</span>:<span className="status-off">{t('mods.statusDisabled')}</span>}</div>
                        </div>
                        <div className="installed-actions">
                          {updateResults[mod.file]?.hasUpdate && (
                            <button
                              className="btn btn-primary btn-sm update-badge"
                              disabled={updatingMod[mod.file]}
                              onClick={async () => {
                                const upd = updateResults[mod.file]
                                setUpdatingMod(prev => ({ ...prev, [mod.file]: true }))
                                await window.eclipse.updateMod({ gameDir, oldFile: mod.file, fileUrl: upd.latestUrl, newFileName: upd.latestFile })
                                setUpdatingMod(prev => ({ ...prev, [mod.file]: false }))
                                setUpdateResults(prev => { const n = {...prev}; delete n[mod.file]; return n })
                                loadInstalled()
                              }}
                            >
                              {updatingMod[mod.file] ? '...' : t('mods.update')}
                            </button>
                          )}
                          {activeProfile && profiles.find(p=>p.id===activeProfile)?.mods?.some(pm=>pm.file===mod.file) && (
                            <button className="btn btn-ghost btn-sm" title={t('mods.removeFromProfile')} onClick={async () => {
                              const next = profiles.map(p => p.id === activeProfile
                                ? { ...p, mods: (p.mods || []).filter(pm => pm.file !== mod.file) }
                                : p)
                              setProfiles(next)
                              await window.eclipse.saveProfiles(next)
                            }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> {t('mods.profile')}</button>
                          )}
                          {activeProfile && !profiles.find(p=>p.id===activeProfile)?.mods?.some(pm=>pm.file===mod.file) && (
                            <button className="btn btn-primary btn-sm" onClick={async () => {
                              const next = profiles.map(p => p.id === activeProfile
                                ? { ...p, mods: [...(p.mods||[]), { file: mod.file, name: mod.name }] }
                                : p)
                              setProfiles(next)
                              await window.eclipse.saveProfiles(next)
                            }}>{t('mods.addProfile')}</button>
                          )}
                          <button className={`btn btn-sm ${mod.enabled?'btn-ghost':'btn-primary'}`} onClick={()=>toggleMod(mod)}>{mod.enabled ? <IcPause2 size={11}/> : <IcPlay size={11}/>}</button>
                          <button
                            className={`bin-btn ${deletingMod[mod.file]==='eating'?'bin-btn--chomping':''}`}
                            onClick={()=>!deletingMod[mod.file]&&deleteMod(mod)}
                            title={t('mods.delete')}
                            disabled={!!deletingMod[mod.file]}
                          >
                            <span className="bin-icon"><IcTrash /></span>
                            <svg className="bin-ring" viewBox="0 0 36 36" width="36" height="36">
                              <circle className="bin-ring-track" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"/>
                              <circle className="bin-ring-fill" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"
                                strokeDasharray="94.25" strokeDashoffset="94.25"
                                style={deletingMod[mod.file]==='eating'?{strokeDashoffset:0}:{}}
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ SHADERS ══ */}
          {category === 'shaders' && (
            <div className="mods-content-wrap">
              <div className="mods-header">
                <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  {t('mods.titleShaders')}
                </h2>
                <div className="mods-tabs">
                  <button className={`tab-btn ${shaderTab==='search'?'active':''}`} onClick={()=>setShaderTab('search')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    {t('mods.tabSearch')}
                  </button>
                  <button className={`tab-btn ${shaderTab==='installed'?'active':''}`} onClick={()=>{setShaderTab('installed');loadShaders()}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    {t('mods.tabInstalled')}
                  </button>
                </div>
              </div>
              {shaderTab === 'search' && (
                <div className="mods-search-panel">
                  <div className="mods-filters">
                    <input className="mods-search-input" placeholder={t('mods.searchShadersPlaceholder')} value={shaderQuery} onChange={e=>setShaderQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchShaders()} />
                    <button className="btn btn-primary btn-sm" onClick={searchShaders} disabled={shaderSearching}>{shaderSearching?'...':t('mods.search')}</button>
                  </div>
                  {!shaderQuery.trim() && <PopularGrid items={shaderPopular} label={t('mods.labelShaders')} onInstall={installShader} installingMap={installingShader} />}
                  <div className="mods-list">
                    {shaderResults.map(hit => (
                      <div key={hit.project_id} className="mod-card" onClick={()=>openMod({...hit,_src:'modrinth'})}>
                        <div className="mod-icon">{hit.icon_url?<img src={hit.icon_url} alt=""/>:<IcStar2 size={18} />}</div>
                        <div className="mod-info">
                          <div className="mod-name">{hit.title}</div>
                          <div className="mod-desc">{hit.description}</div>
                          <div className="mod-meta"><span className="mod-tag"><IcDl />{fmtNum(hit.downloads)}</span></div>
                        </div>
                        <button className="btn btn-primary btn-sm" disabled={installingShader[hit.project_id]} onClick={e=>{e.stopPropagation();installShader(hit)}}>{installingShader[hit.project_id]?'...':t('mods.install')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {shaderTab === 'installed' && (
                <div className="installed-panel">
                  {installedShaders.length===0&&<div className="mods-empty"><IcStar2 size={36} /><p>{t('mods.noShadersInstalled')}</p></div>}
                  <div className="installed-list">
                    {installedShaders.map(s=>(
                      <div key={s.file} className={`installed-card ${deletingShader[s.file]==='eating'?'bin-eating':''} ${deletingShader[s.file]==='collapsing'?'bin-collapsing':''}`}>
                        <div className="installed-icon"><IcStar2 size={18} /></div>
                        <div className="installed-info bin-label"><div className="installed-name">{s.name}</div></div>
                        <button className={`bin-btn ${deletingShader[s.file]==='eating'?'bin-btn--chomping':''}`} disabled={!!deletingShader[s.file]}
                          onClick={()=>!deletingShader[s.file]&&deleteWithAnimation(s.file, setDeletingShader, async()=>{await window.eclipse.deleteShader({gameDir,file:s.file});loadShaders()})}>
                          <span className="bin-icon"><IcTrash /></span>
                          <svg className="bin-ring" viewBox="0 0 36 36" width="36" height="36">
                            <circle className="bin-ring-track" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"/>
                            <circle className="bin-ring-fill" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5" strokeDasharray="94.25" strokeDashoffset="94.25" style={deletingShader[s.file]==='eating'?{strokeDashoffset:0}:{}}/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ RESOURCE PACKS ══ */}
          {category === 'resourcepacks' && (
            <div className="mods-content-wrap">
              <div className="mods-header">
                <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {t('mods.titleResourcePacks')}
                </h2>
                <div className="mods-tabs">
                  <button className={`tab-btn ${rpTab==='search'?'active':''}`} onClick={()=>setRpTab('search')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    {t('mods.tabSearch')}
                  </button>
                  <button className={`tab-btn ${rpTab==='installed'?'active':''}`} onClick={()=>{setRpTab('installed');loadRPs()}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    {t('mods.tabInstalled')}
                  </button>
                </div>
              </div>
              {rpTab === 'search' && (
                <div className="mods-search-panel">
                  <div className="mods-filters">
                    <input className="mods-search-input" placeholder={t('mods.searchRPsPlaceholder')} value={rpQuery} onChange={e=>setRpQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchRPs()} />
                    <button className="btn btn-primary btn-sm" onClick={searchRPs} disabled={rpSearching}>{rpSearching?'...':t('mods.search')}</button>
                  </div>
                  {!rpQuery.trim() && <PopularGrid items={rpPopular} label={t('mods.labelResourcePacks')} onInstall={installRP} installingMap={installingRP} />}
                  <div className="mods-list">
                    {rpResults.map(hit=>(
                      <div key={hit.project_id} className="mod-card">
                        <div className="mod-icon">{hit.icon_url?<img src={hit.icon_url} alt=""/>:<IcImage size={18} />}</div>
                        <div className="mod-info">
                          <div className="mod-name">{hit.title}</div>
                          <div className="mod-desc">{hit.description}</div>
                          <div className="mod-meta"><span className="mod-tag"><IcDl />{fmtNum(hit.downloads)}</span></div>
                        </div>
                        <button className="btn btn-primary btn-sm" disabled={installingRP[hit.project_id]} onClick={()=>installRP(hit)}>{installingRP[hit.project_id]?'...':t('mods.install')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rpTab === 'installed' && (
                <div className="installed-panel">
                  {installedRPs.length===0&&<div className="mods-empty"><IcImage size={36} /><p>{t('mods.noRPsInstalled')}</p></div>}
                  <div className="installed-list">
                    {installedRPs.map(r=>(
                      <div key={r.file} className={`installed-card ${deletingRP[r.file]==='eating'?'bin-eating':''} ${deletingRP[r.file]==='collapsing'?'bin-collapsing':''}`}>
                        <div className="installed-icon"><IcImage size={18} /></div>
                        <div className="installed-info bin-label"><div className="installed-name">{r.name}</div></div>
                        <button className={`bin-btn ${deletingRP[r.file]==='eating'?'bin-btn--chomping':''}`} disabled={!!deletingRP[r.file]}
                          onClick={()=>!deletingRP[r.file]&&deleteWithAnimation(r.file, setDeletingRP, async()=>{await window.eclipse.deleteResourcePack({gameDir,file:r.file});loadRPs()})}>
                          <span className="bin-icon"><IcTrash /></span>
                          <svg className="bin-ring" viewBox="0 0 36 36" width="36" height="36">
                            <circle className="bin-ring-track" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"/>
                            <circle className="bin-ring-fill" cx="18" cy="18" r="15" fill="none" strokeWidth="2.5" strokeDasharray="94.25" strokeDashoffset="94.25" style={deletingRP[r.file]==='eating'?{strokeDashoffset:0}:{}}/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ SCREENSHOTS ══ */}
          {category === 'screenshots' && (
            <div className="mods-content-wrap">
              <div className="mods-header">
                <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  {t('mods.titleScreenshots')}
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={loadScreenshots}>{t('mods.refresh')}</button>
              </div>
              <div className="mods-search-panel">
                {loadingShots && <div className="mods-loading"><span className="big-spinner"/></div>}
                {!loadingShots && screenshots.length===0 && <div className="mods-empty"><IcCamera size={48} /><p>{t('mods.noScreenshots', { path: `${gameDir}/screenshots` })}</p></div>}
                <div className="screenshots-grid">
                  {screenshots.map(s=>(
                    <div key={s.path} className="screenshot-card" onClick={()=>{ setFullscreenShot(s); setLightboxIdx(screenshots.indexOf(s)) }} title={s.name}>
                      <img src={`file://${s.path}`} alt={s.name} className="screenshot-img" onError={e=>e.target.style.display='none'} />
                      <div className="screenshot-name">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ MODPACKS ══ */}
          {category === 'modpacks' && (
            <div className="mods-content-wrap">
              <div className="mods-header">
                <h2 style={{display:'flex',alignItems:'center',gap:8}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  {t('mods.titleModpacks')}
                </h2>
              </div>
              <div className="mods-search-panel">
                <div className="mods-filters">
                  <input className="mods-search-input" placeholder={t('mods.searchModpacksPlaceholder')} value={mpQuery} onChange={e=>setMpQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchModpacks()} />
                  <select value={mpLoader} onChange={e=>setMpLoader(e.target.value)} style={{width:115}}>
                    {['fabric','forge','quilt','neoforge','any'].map(l=><option key={l} value={l}>{l === 'any' ? t('mods.loaderAny') : l}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={searchModpacks} disabled={mpSearching}>{mpSearching?'...':t('mods.search')}</button>
                </div>
                {!mpQuery.trim() && <PopularGrid items={mpPopular} label={t('mods.labelModpacks')} onOpen={hit=>openMod({...hit, _src:'modrinth'})} />}
                {mpInstalling && (
                  <div className="mp-progress" style={{padding:'8px 12px',background:'var(--accent-dim)',borderRadius:8,marginBottom:8,fontSize:13}}>
                    {t('mods.installingProgress', { done: mpProgress.done, total: mpProgress.total })}
                    <div style={{height:4,background:'var(--border)',borderRadius:2,marginTop:4}}>
                      <div style={{height:'100%',background:'var(--accent)',borderRadius:2,width:`${mpProgress.total ? (mpProgress.done/mpProgress.total)*100 : 0}%`,transition:'width 0.3s'}} />
                    </div>
                  </div>
                )}
                <div className="mods-list">
                  {mpResults.map(hit=>(
                    <div key={hit.project_id} className="mod-card" onClick={()=>openMod({...hit, _src:'modrinth'})}>
                      <div className="mod-icon">{hit.icon_url?<img src={hit.icon_url} alt=""/>:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}</div>
                      <div className="mod-info">
                        <div className="mod-name">{hit.title}</div>
                        <div className="mod-desc">{hit.description}</div>
                        <div className="mod-meta">
                          {hit.categories?.slice(0,2).map(c=><span key={c} className="mod-tag mod-tag-cat">{c}</span>)}
                          <span className="mod-tag"><IcDl />{fmtNum(hit.downloads)}</span>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();openMod({...hit,_src:'modrinth'})}}>{t('mods.viewVersions')}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {fullscreenShot && (
        <div
          className="lightbox-overlay"
          onClick={() => setFullscreenShot(null)}
        >
          <div className="lightbox-panel" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">{fullscreenShot.name}</span>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.copyScreenshot({ filePath: fullscreenShot.path })} title={t('mods.copyImage')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => window.eclipse.openScreenshot({ filePath: fullscreenShot.path })} title={t('mods.openInViewer')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setFullscreenShot(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="lightbox-img-wrap">
              <button
                className="lightbox-nav lightbox-nav--prev"
                onClick={() => setLightboxIdx(i => { const p = Math.max(i-1,0); setFullscreenShot(screenshots[p]); return p })}
                disabled={lightboxIdx === 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <img src={`file://${fullscreenShot.path}`} alt={fullscreenShot.name} className="lightbox-img" />
              <button
                className="lightbox-nav lightbox-nav--next"
                onClick={() => setLightboxIdx(i => { const n = Math.min(i+1, screenshots.length-1); setFullscreenShot(screenshots[n]); return n })}
                disabled={lightboxIdx === screenshots.length - 1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div className="lightbox-footer">
              {lightboxIdx + 1} / {screenshots.length}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={()=>{setModal(null);setModalDeps([]);setSelectedVersionId(null)}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="mod-icon-lg">{modIcon(modal)}</div>
              <div style={{flex:1,minWidth:0}}>
                <h3>{modTitle(modal)}</h3>
                <p>{modDesc(modal)}</p>
              </div>
              <button className="modal-close" onClick={()=>{setModal(null);setModalDeps([]);setSelectedVersionId(null)}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {loadingFiles && <div className="mods-loading"><span className="big-spinner"/><span>{t('mods.loadingVersions')}</span></div>}
              {!loadingFiles && modalFiles.length===0 && <div className="mods-empty">{t('mods.noCompatibleVersions')}</div>}
              {modalFiles.map(file => {
                const inst = installing[file.id]
                const versionMismatch = mcVersion && file.gameVersions?.length > 0 && !file.gameVersions.includes(mcVersion)
                const loaderMismatch  = loader !== 'any' && file.loaders?.length > 0 && !file.loaders.includes(loader)
                const hasMismatch = versionMismatch || loaderMismatch
                return (
                  <div key={file.id} className={`version-row-item${hasMismatch?' version-row-conflict':''}`} onMouseEnter={() => file._src === 'modrinth' && fetchDeps(file.id)}>
                    <div className="version-info">
                      <div className="version-name" style={{display:'flex',alignItems:'center',gap:6}}>
                        {file.name}
                        {hasMismatch && (
                          <span className="conflict-badge" title={[versionMismatch&&t('mods.mcVersionUnsupported', { version: mcVersion }),loaderMismatch&&t('mods.loaderUnsupported', { loader })].filter(Boolean).join(' · ')}>
                            {t('mods.incompatible')}
                          </span>
                        )}
                      </div>
                      <div className="version-tags">
                        {file.gameVersions.map(v=><span key={v} className={`mod-tag${mcVersion&&v===mcVersion?' mod-tag-match':''}`}>{v}</span>)}
                        {file.loaders.map(l=><span key={l} className={`mod-tag mod-tag-cat${loader!=='any'&&l===loader?' mod-tag-match':''}`}>{l}</span>)}
                      </div>
                      {file.changelog && (
                        <details className="version-changelog">
                          <summary>{t('mods.changelog')}</summary>
                          <pre className="version-changelog-body">{file.changelog}</pre>
                        </details>
                      )}
                    </div>
                    {category === 'modpacks' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={mpInstalling}
                        onClick={() => handleInstallModpack(file.id)}
                      >
                        {mpInstalling ? `${mpProgress.done}/${mpProgress.total}...` : <><IcDl size={13}/>{t('mods.installModpack')}</>}
                      </button>
                    ) : (
                      <LiquidButton size="sm" loading={inst?.loading??false} progress={inst?.progress??0} done={inst?.done??false}
                        idleLabel={t('mods.install')} doneLabel={t('mods.installed')} onClick={()=>installFile(file)} disabled={!!inst} />
                    )}
                  </div>
                )
              })}
              {modalDeps.length > 0 && (
                <div className="deps-panel">
                  <span className="deps-title">{t('mods.requires')}</span>
                  {modalDeps.map(d => (
                    <span key={d.id} className="dep-chip">
                      {d.icon_url && <img src={d.icon_url} alt="" style={{width:14,height:14,borderRadius:3,objectFit:'cover'}} />}
                      {d.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M'
  if (n >= 1_000)     return (n/1_000).toFixed(1)+'K'
  return String(n)
}
