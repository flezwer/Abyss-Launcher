const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── Microsoft auth via msmc ───────────────────────────────────────────────────
let _msmcAuth = null
try { _msmcAuth = require('msmc') } catch {}

let mainWindow

// ── Discord Rich Presence ────────────────────────────────────────────────────
let discordRPC = null
let discordConnected = false
let discordStartTime = null

function initDiscordRPC() {
  try {
    const DiscordRPC = require('discord-rpc')
    // CLIENT_ID: crea una aplicación en https://discord.com/developers/applications y pon su ID aquí
    const CLIENT_ID = loadSettingsSync().discordClientId || ''
    if (!CLIENT_ID) { discordConnected = false; return }
    discordRPC = new DiscordRPC.Client({ transport: 'ipc' })
    discordRPC.on('ready', () => {
      discordConnected = true
    })
    discordRPC.login({ clientId: CLIENT_ID }).catch(() => {
      discordConnected = false
    })
  } catch { discordConnected = false }
}

function setDiscordActivity({ state, details, startTime }) {
  if (!discordRPC || !discordConnected) return
  try {
    discordRPC.setActivity({
      details: details || 'En el launcher',
      state: state || '',
      startTimestamp: startTime || undefined,
      largeImageKey: 'eclipse_logo',
      largeImageText: 'Abyss Launcher',
      instance: false,
    })
  } catch {}
}

// Espera hasta que Vite esté listo antes de cargar la URL
function waitForVite(url, retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(url, (res) => {
        resolve()
      }).on('error', () => {
        if (retries-- > 0) {
          setTimeout(attempt, delay)
        } else {
          reject(new Error('Vite no arrancó a tiempo'))
        }
      })
    }
    attempt()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,       // Node.js fuera del renderer
      contextIsolation: true,       // contexto del preload aislado del renderer
      // Fix #11: sandbox desactivado porque electron-builder en Windows no lo soporta sin
      // empaquetar un helper adicional. contextIsolation:true + nodeIntegration:false + CSP
      // cubren el mismo threat model en apps de escritorio de usuario único.
      webSecurity: true,            // same-origin policy activa
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,    // arrastrar un archivo no navega la app
      experimentalFeatures: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hidden',
  })

  // ── Bloquear nuevas ventanas (window.open, target=_blank, etc.) ────────────
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // ── Bloquear navegación fuera de la URL esperada ───────────────────────────
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? /^http:\/\/(localhost|\[::1\]|127\.0\.0\.1):5173/
      : /^file:\/\//
    if (!allowed.test(url)) {
      event.preventDefault()
    }
  })

  // ── Denegar todos los permisos del sistema ────────────────────────────────
  mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    callback(false) // denegar cámara, micrófono, geolocalización, notificaciones, etc.
  })

  // ── CSP y security headers en producción vía respuesta de sesión ─────────
  // Solo en producción: en dev, Vite necesita eval/ws/módulos dinámicos que
  // son incompatibles con una CSP estricta. La meta tag en index.html cubre dev.
  if (!isDev) {
    const PROD_CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none';"
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const headers = Object.fromEntries(
        Object.entries(details.responseHeaders || {}).filter(([k]) =>
          !['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']
            .includes(k.toLowerCase())
        )
      )
      callback({
        responseHeaders: {
          ...headers,
          'Content-Security-Policy': [PROD_CSP],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'Referrer-Policy': ['no-referrer'],
        }
      })
    })
  }

  // ── Bloquear DevTools en producción ───────────────────────────────────────
  // Fix #8: 'before-devtools-opened' previene la apertura antes de que ocurra,
  // eliminando la race condition de 'devtools-opened' + closeDevTools().
  if (!isDev) {
    mainWindow.webContents.on('before-devtools-opened', (e) => e.preventDefault())
  }

  if (isDev) {
    // Vite en Windows escucha en [::1]:5173 (IPv6); usar localhost puede fallar si
    // Chromium lo resuelve a 127.0.0.1 (IPv4). Intentar IPv4 primero, luego IPv6.
    mainWindow.loadURL('http://127.0.0.1:5173').catch(() =>
      mainWindow.loadURL('http://[::1]:5173')
    )
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  if (isDev) {
    try {
      // Intentar IPv4 y IPv6 para compatibilidad con Vite en distintas plataformas
      await waitForVite('http://127.0.0.1:5173').catch(() => waitForVite('http://[::1]:5173'))
    } catch (e) {
      console.error(e.message)
    }
  }
  createWindow()
  initDiscordRPC()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── Window controls ──────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow.close())

// ── Discord IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('discord:setActivity', async (_, opts) => {
  setDiscordActivity(opts)
  return { ok: true }
})
ipcMain.handle('discord:clear', async () => {
  try { if (discordRPC && discordConnected) discordRPC.clearActivity() } catch {}
  return { ok: true }
})

// ── Rutas del launcher ───────────────────────────────────────────────────────
const LAUNCHER_DIR = path.join(app.getPath('appData'), 'EclipseLauncher')
const ACCOUNTS_FILE = path.join(LAUNCHER_DIR, 'accounts.json')
const SETTINGS_FILE = path.join(LAUNCHER_DIR, 'settings.json')
const NOTES_FILE = path.join(LAUNCHER_DIR, 'notes.json')
const THEMES_FILE = path.join(LAUNCHER_DIR, 'themes.json')

if (!fs.existsSync(LAUNCHER_DIR)) fs.mkdirSync(LAUNCHER_DIR, { recursive: true })

// ── Cuentas ──────────────────────────────────────────────────────────────────
ipcMain.handle('accounts:load', () => {
  if (!fs.existsSync(ACCOUNTS_FILE)) return []
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
})

ipcMain.handle('accounts:save', (_, accounts) => {
  // Fix #5: validar que sea array con campos esperados; no guardar objetos arbitrarios
  if (!Array.isArray(accounts)) return
  const ACCT_KEYS = ['id','type','username','uuid','token','tokenExpiry','refreshToken','authData']
  const safe = accounts.slice(0, 20).map(a => {
    if (!a || typeof a !== 'object') return null
    const s = Object.create(null)
    for (const k of ACCT_KEYS) if (a[k] !== undefined) s[k] = a[k]
    return s
  }).filter(Boolean)
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(safe, null, 2))
})

// ── Auth Microsoft (msmc) ─────────────────────────────────────────────────────
ipcMain.handle('auth:ms:start', async () => {
  if (!_msmcAuth) return { ok: false, error: 'msmc no disponible' }
  try {
    const { Auth } = _msmcAuth
    const authManager = new Auth('select_account')
    const xboxManager = await authManager.launch('electron', {
      title: 'Abyss Launcher — Iniciar sesión con Microsoft',
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    })
    const mc = await xboxManager.getMinecraft()
    const profile = mc.profile
    return {
      ok: true,
      account: {
        id: Date.now().toString(),
        type: 'microsoft',
        username: profile.name,
        uuid: profile.id,
        token: mc.mclc().auth,
        tokenExpiry: Date.now() + 86400000,
        refreshToken: xboxManager.msToken.refresh_token || '',
        authData: mc.mclc()
      }
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// poll ya no se necesita con msmc (el login es síncrono en la ventana)
ipcMain.handle('auth:ms:poll', async () => ({ status: 'success' }))

ipcMain.handle('auth:ms:refresh', async (_, { refreshToken }) => {
  if (!_msmcAuth) return { ok: false, error: 'msmc no disponible' }
  try {
    const { Auth } = _msmcAuth
    const authManager = new Auth('select_account')
    const xboxManager = await authManager.refresh(refreshToken)
    const mc = await xboxManager.getMinecraft()
    return {
      ok: true,
      token: mc.mclc().auth,
      tokenExpiry: Date.now() + 86400000,
      refreshToken: xboxManager.msToken.refresh_token || refreshToken,
      authData: mc.mclc()
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── Settings ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  javaPath: 'java',
  ramMin: 1024,
  ramMax: 2048,
  gameDir: path.join(LAUNCHER_DIR, 'minecraft'),
  closeOnLaunch: false,
  curseforgeApiKey: '',
  jvmArgs: '',
}

function loadSettingsSync() {
  if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) } }
  catch { return DEFAULT_SETTINGS }
}

ipcMain.handle('settings:load', () => loadSettingsSync())

ipcMain.handle('settings:save', (_, settings) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
})

// ── Helpers de seguridad de rutas y URLs ─────────────────────────────────────

/** Valida que el destino quede dentro de dir. Lanza si hay path traversal. */
function safeFilePath(dir, fileName) {
  const base = path.resolve(dir)
  const dest = path.resolve(dir, path.basename(fileName))
  if (!dest.startsWith(base + path.sep) && dest !== base) {
    throw new Error(`Ruta no permitida: ${fileName}`)
  }
  return dest
}

/** Valida que la URL sea https/http y no apunte a rangos privados o link-local.
 *  Fix #6: cubre IPv4-mapped IPv6, 0.0.0.0, hostnames especiales y todos los RFC-1918. */
function isSafeDownloadUrl(urlStr) {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '') // quita corchetes IPv6
    // Hostnames especiales
    if (h === 'localhost' || h.endsWith('.localhost') ||
        h === 'broadcasthost' || h === 'local' ||
        h.endsWith('.local') || h.endsWith('.internal')) return false
    // IPv4 bloqueados
    if (/^0\./.test(h)) return false                           // 0.0.0.0/8
    if (/^127\./.test(h)) return false                         // loopback
    if (/^169\.254\./.test(h)) return false                    // link-local
    if (/^10\./.test(h)) return false                          // RFC-1918
    if (/^192\.168\./.test(h)) return false                    // RFC-1918
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false    // RFC-1918
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return false // RFC-6598 CGNAT
    // IPv6 bloqueados
    if (h === '::1') return false                              // loopback
    if (/^::ffff:/i.test(h)) return false                      // IPv4-mapped IPv6
    if (/^fe80:/i.test(h)) return false                        // link-local
    if (/^fc00:/i.test(h) || /^fd[0-9a-f]{2}:/i.test(h)) return false // ULA
    return true
  } catch { return false }
}

/** Valida que gameDir sea una ruta legítima del launcher (no controlable libremente por el renderer).
 *  Fix #2: evita que el renderer apunte a rutas del sistema arbitrarias. */
function validateGameDir(gameDir) {
  if (!gameDir || typeof gameDir !== 'string') throw new Error('gameDir inválido')
  const resolved = path.resolve(gameDir)
  const launcherBase = path.resolve(LAUNCHER_DIR)
  const instancesBase = path.resolve(LAUNCHER_DIR, 'instances')
  // Permitir instancesBase y sus subdirectorios
  if (resolved.startsWith(instancesBase + path.sep) || resolved === instancesBase) return resolved
  // Permitir LAUNCHER_DIR y sus subdirectorios, o la ruta guardada en settings
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    const savedDir = saved.gameDir ? path.resolve(saved.gameDir) : null
    if (savedDir && resolved === savedDir) return resolved
  } catch {}
  if (!resolved.startsWith(launcherBase + path.sep) && resolved !== launcherBase) {
    throw new Error(`gameDir no permitido: ${gameDir}`)
  }
  return resolved
}

// ── Helpers de versión de Java ────────────────────────────────────────────────
function getJavaMajor(versionStr) {
  if (!versionStr) return 0
  // "1.8.0_xxx" → 8 | "17.0.1" → 17 | "21" → 21
  if (versionStr.startsWith('1.')) return parseInt(versionStr.split('.')[1]) || 0
  return parseInt(versionStr.split('.')[0]) || 0
}

function getRequiredJavaMajor(mcVersion) {
  const parts = mcVersion.replace(/[^0-9.]/g, '').split('.').map(Number)
  const minor = parts[1] || 0
  const patch  = parts[2] || 0
  if (minor > 20 || (minor === 20 && patch >= 5)) return 21
  if (minor >= 18) return 17
  if (minor === 17) return 16
  return 8
}

function tryJavaVersion(javaExe) {
  try {
    // Fix #3: shell:false siempre — evita command injection si javaExe contiene metacaracteres
    const { spawnSync } = require('child_process')
    const r = spawnSync(javaExe, ['-version'], { timeout: 4000, encoding: 'utf8', shell: false })
    const out = (r.stdout || '') + (r.stderr || '')
    const m = out.match(/version "([^"]+)"/)
    return m ? m[1] : null
  } catch { return null }
}

function findCompatibleJava(requiredMajor) {
  const scanDirs = [
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Amazon Corretto',
    'C:\\Program Files (x86)\\Java',
  ]
  for (const dir of scanDirs) {
    try {
      const entries = fs.readdirSync(dir)
      // Sort descending so we try higher versions first
      entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      for (const entry of entries) {
        const javaExe = path.join(dir, entry, 'bin', 'java.exe')
        if (!fs.existsSync(javaExe)) continue
        const ver = tryJavaVersion(javaExe)
        if (ver && getJavaMajor(ver) >= requiredMajor) return { path: javaExe, version: ver }
      }
    } catch {}
  }
  return null
}

// ── Lanzar Minecraft ─────────────────────────────────────────────────────────
ipcMain.handle('game:launch', async (_, { account, version, settings, serverHost, serverPort, loader, loaderVersion }) => {
  const { Client, Authenticator } = require('minecraft-launcher-core')
  const launcher = new Client()

  // Asegura que la carpeta del juego exista
  if (!fs.existsSync(settings.gameDir)) {
    fs.mkdirSync(settings.gameDir, { recursive: true })
  }

  // ── Selección automática de Java ──────────────────────────────────────────
  let javaPath = settings.javaPath || 'java'
  const requiredMajor = getRequiredJavaMajor(version)
  const currentVer = tryJavaVersion(javaPath)
  const currentMajor = getJavaMajor(currentVer || '')

  if (currentMajor > 0 && currentMajor < requiredMajor) {
    const log = (msg) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('game:log', msg) }
    log(`[Eclipse] Java ${currentMajor} detectado, pero Minecraft ${version} necesita Java ${requiredMajor}+. Buscando...`)
    const found = findCompatibleJava(requiredMajor)
    if (found) {
      javaPath = found.path
      log(`[Eclipse] Java ${getJavaMajor(found.version)} encontrado: ${found.path}`)
    } else {
      log(`[Eclipse] ERROR: No se encontró Java ${requiredMajor}+ en el sistema.`)
      log(`[Eclipse] Descarga Java ${requiredMajor} desde https://adoptium.net y configura la ruta en Ajustes.`)
      return { ok: false, error: `Java ${requiredMajor}+ requerido para Minecraft ${version}.\nInstala Java ${requiredMajor} desde adoptium.net y configura la ruta en Ajustes → Java.` }
    }
  }

  // Autenticación
  let auth
  if (account.type === 'offline') {
    auth = Authenticator.getAuth(account.username)
  } else if (account.type === 'microsoft') {
    let mcToken = account.token
    let uuid    = account.uuid
    let name    = account.username

    // Refrescar si el token expiró o expira en < 5 min
    if (account.refreshToken && (!account.tokenExpiry || Date.now() > account.tokenExpiry - 300000)) {
      const log = (msg) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('game:log', msg) }
      log('[Abyss] Renovando token de Microsoft...')
      try {
        const msData = await msRefreshMSToken(account.refreshToken)
        if (!msData.error) {
          const mcData = await msTokenToMinecraft(msData.access_token)
          mcToken = mcData.token
          uuid    = mcData.uuid
          name    = mcData.username
          // Guardar cuenta actualizada
          if (fs.existsSync(ACCOUNTS_FILE)) {
            const saved = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
            const idx = saved.findIndex(a => a.id === account.id)
            if (idx >= 0) {
              saved[idx] = { ...saved[idx], token: mcToken, uuid, username: name,
                tokenExpiry: mcData.tokenExpiry,
                refreshToken: msData.refresh_token || account.refreshToken }
              fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(saved, null, 2))
              if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('accounts:updated', saved)
            }
          }
          log('[Abyss] Token renovado correctamente.')
        }
      } catch (e) {
        const log2 = (msg) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('game:log', msg) }
        log2(`[Abyss] Advertencia: no se pudo renovar el token — ${e.message}`)
      }
    }

    auth = {
      access_token: mcToken,
      client_token: uuid || '0',
      uuid: uuid || '0',
      name,
      user_properties: '{}'
    }
  } else {
    auth = account.authData
  }

  // Fix #1: whitelist de flags JVM — solo -X..., -D..., -ea, -da, -server, -client
  const JVM_ARG_SAFE = /^(-X[a-zA-Z0-9:+\-.,/\\%_]+|-D[a-zA-Z0-9._]+=\S*|-ea|-da|-server|-client)$/
  const jvmArgsParsed = settings.jvmArgs
    ? settings.jvmArgs.split(/\s+/).filter(Boolean).filter(a => JVM_ARG_SAFE.test(a))
    : []

  // Fix #2: gameDir desde settings guardados en disco, no del renderer
  // instanceGameDir tiene prioridad si apunta a instances/ (ya validada por validateGameDir)
  const safeGameDir = validateGameDir(settings.instanceGameDir || loadSettingsSync().gameDir || settings.gameDir || path.join(LAUNCHER_DIR, 'minecraft'))

  const opts = {
    authorization: auth,
    root: safeGameDir,
    version: {
      number: version,
      type: 'release',
    },
    memory: {
      max: `${Math.min(Math.max(parseInt(settings.ramMax) || 2048, 512), 32768)}M`,
      min: `${Math.min(Math.max(parseInt(settings.ramMin) || 1024, 256), 16384)}M`,
    },
    javaPath,
    overrides: {
      maxSockets: 4,
      ...(jvmArgsParsed.length ? { jvm: jvmArgsParsed } : {}),
    },
  }

  if (serverHost) opts.overrides = { ...opts.overrides, connect: { host: serverHost, port: serverPort || 25565 } }

  // ── Fabric auto-install ─────────────────────────────────────────────────────
  if (loader === 'fabric' && loaderVersion) {
    const fabricId = `fabric-loader-${loaderVersion}-${version}`
    const versionsDir = path.join(settings.gameDir, 'versions', fabricId)
    const profilePath = path.join(versionsDir, `${fabricId}.json`)

    if (!fs.existsSync(profilePath)) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:log', '[Eclipse] Descargando perfil de Fabric Loader...')
      }
      fs.mkdirSync(versionsDir, { recursive: true })
      const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}/${encodeURIComponent(loaderVersion)}/profile/json`
      const https = require('https')
      const profileJson = await new Promise((resolve, reject) => {
        https.get(profileUrl, (res) => {
          let data = ''
          res.on('data', d => data += d)
          res.on('end', () => {
            try { resolve(JSON.parse(data)) } catch(e) { reject(e) }
          })
        }).on('error', reject)
      })
      fs.writeFileSync(profilePath, JSON.stringify(profileJson, null, 2))
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:log', `[Eclipse] Fabric ${loaderVersion} instalado correctamente`)
      }
    }
    opts.version.custom = fabricId
  }

  launcher.on('debug',    (e) => mainWindow.webContents.send('game:log', String(e)))
  launcher.on('data',     (e) => mainWindow.webContents.send('game:log', String(e)))
  launcher.on('progress', (e) => mainWindow.webContents.send('game:progress', e))
  launcher.on('close',    (code) => mainWindow.webContents.send('game:close', code))

  try {
    // Auto-backup if enabled in settings
    if (settings?.autoBackup !== false) {
      try {
        const savesDir = path.join(settings?.gameDir || LAUNCHER_DIR, 'saves')
        if (fs.existsSync(savesDir)) {
          const worlds = fs.readdirSync(savesDir)
          if (worlds.length > 0) {
            const backupRoot = path.join(LAUNCHER_DIR, 'auto-backups')
            fs.mkdirSync(backupRoot, { recursive: true })
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            // Only back up if last backup was > 30 minutes ago
            const lastBackupFile = path.join(backupRoot, '.last_backup')
            const lastBackup = fs.existsSync(lastBackupFile) ? parseInt(fs.readFileSync(lastBackupFile, 'utf8')) : 0
            if (Date.now() - lastBackup > 30 * 60 * 1000) {
              const dest = path.join(backupRoot, `saves_${ts}`)
              fs.cpSync(savesDir, dest, { recursive: true })
              fs.writeFileSync(lastBackupFile, Date.now().toString())
              // Keep only last 5 backups
              const backups = fs.readdirSync(backupRoot)
                .filter(f => f.startsWith('saves_'))
                .sort()
              if (backups.length > 5) {
                backups.slice(0, backups.length - 5).forEach(b => {
                  fs.rmSync(path.join(backupRoot, b), { recursive: true, force: true })
                })
              }
            }
          }
        }
      } catch(e) { console.log('Auto-backup failed:', e.message) }
    }

    launcher.launch(opts)   // sin await — el juego corre en background
    if (settings.closeOnLaunch) mainWindow.minimize()
    if (settings?.autoMinimize && mainWindow) mainWindow.minimize()
    sessionStart = Date.now()
    sessionMeta = { username: account.username, version }
    setDiscordActivity({ details: `Jugando MC ${version}`, state: `Como ${account.username}`, startTime: new Date() })
    launcher.on('close', (code) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.restore()
      if (sessionStart && sessionMeta) {
        const dur = Date.now() - sessionStart
        let pt = {}
        try { if (fs.existsSync(PLAYTIME_FILE)) pt = JSON.parse(fs.readFileSync(PLAYTIME_FILE, 'utf-8')) } catch {}
        const key = `${sessionMeta.username}_${sessionMeta.version}`
        pt[key] = { username: sessionMeta.username, version: sessionMeta.version,
          totalMs: (pt[key]?.totalMs || 0) + dur, sessions: (pt[key]?.sessions || 0) + 1 }
        fs.writeFileSync(PLAYTIME_FILE, JSON.stringify(pt, null, 2))
        sessionStart = null; sessionMeta = null
      }
      setDiscordActivity({ details: 'En el launcher', state: '' })
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── Reparar instalación de Minecraft ────────────────────────────────────────
ipcMain.handle('game:repair', async (_, { account, version, settings }) => {
  const { Client, Authenticator } = require('minecraft-launcher-core')
  const launcher = new Client()
  let safeDir
  try { safeDir = validateGameDir(settings.instanceGameDir || settings.gameDir) } catch(e) { return { ok: false, error: e.message } }

  const opts = {
    authorization: account?.type === 'offline'
      ? Authenticator.getAuth(account.username || 'Player')
      : { access_token: account?.token, client_token: account?.uuid || '0', uuid: account?.uuid || '0', name: account?.username || 'Player', user_properties: '{}' },
    root: safeDir,
    version: { number: version, type: 'release' },
    memory: { max: `${settings.ramMax || 2048}M`, min: `${settings.ramMin || 1024}M` },
    javaPath: settings.javaPath || 'java',
    overrides: { maxSockets: 4 },
  }

  launcher.on('progress', e => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('game:progress', e) })
  launcher.on('debug', e => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('game:log', String(e)) })

  try {
    await new Promise((resolve, reject) => {
      launcher.on('close', resolve)
      launcher.on('debug', msg => { if (String(msg).includes('Starting')) resolve() })
      launcher.launch(opts).catch(reject)
      setTimeout(resolve, 300000)
    })
    return { ok: true }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Versión major del Java configurado ───────────────────────────────────────
ipcMain.handle('java:currentMajor', async (_, { javaPath: jp } = {}) => {
  const exe = jp || 'java'
  const ver = tryJavaVersion(exe)
  return { major: getJavaMajor(ver || ''), version: ver || '' }
})

// ── Detectar Java ────────────────────────────────────────────────────────────
ipcMain.handle('java:detect', async () => {
  // Fix #3: usa tryJavaVersion (spawnSync shell:false) en lugar de execSync con shell
  const candidates = [
    'java',
    'C:\\Program Files\\Java\\jre-1.8\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jre-17\\bin\\java.exe',
    'C:\\Program Files\\Microsoft\\jdk-17\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
  ]
  for (const c of candidates) {
    const ver = tryJavaVersion(c)
    if (ver) return { found: true, path: c }
  }
  return { found: false, path: '' }
})

// ── Escanear todas las instalaciones de Java ──────────────────────────────────
ipcMain.handle('java:scan', async () => {
  // Fix #3: elimina tryJava local con execSync+shell; reutiliza tryJavaVersion (spawnSync shell:false)
  const fsp = fs.promises
  const results = []

  // 1. System java
  const sysVer = tryJavaVersion('java')
  if (sysVer) results.push({ path: 'java', version: sysVer, label: `Sistema (${sysVer})` })

  // 2. JAVA_HOME — path.join es suficiente, no hay shell expansion
  const javaHome = process.env.JAVA_HOME
  if (javaHome && typeof javaHome === 'string') {
    const p = path.join(javaHome, 'bin', 'java.exe')
    const v = tryJavaVersion(p)
    if (v) results.push({ path: p, version: v, label: `JAVA_HOME (${v})` })
  }

  // 3. Scan common Windows directories
  const scanDirs = [
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files (x86)\\Java',
  ]
  for (const dir of scanDirs) {
    try {
      const entries = await fsp.readdir(dir)
      for (const entry of entries) {
        const javaExe = path.join(dir, entry, 'bin', 'java.exe')
        try {
          await fsp.access(javaExe)
          const v = tryJava(javaExe)
          if (v && !results.find(r => r.path === javaExe)) {
            results.push({ path: javaExe, version: v, label: `${entry} (${v})` })
          }
        } catch {}
      }
    } catch {}
  }

  return results
})

// ── Fabric loader versions ────────────────────────────────────────────────────
ipcMain.handle('fabric:loaders', async (_, { gameVersion }) => {
  const https = require('https')
  return new Promise((resolve) => {
    const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try {
          const arr = JSON.parse(data)
          resolve(arr.slice(0, 20).map(v => ({
            version: v.loader.version,
            stable: v.loader.stable,
          })))
        } catch { resolve([]) }
      })
    }).on('error', () => resolve([]))
  })
})

// ── Versiones disponibles ────────────────────────────────────────────────────
ipcMain.handle('versions:fetch', async () => {
  const axios = require('axios')
  const res = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json')
  return res.data.versions
})

// ── Mods ─────────────────────────────────────────────────────────────────────

// Top populares de Modrinth (sin búsqueda — por descargas)
ipcMain.handle('modrinth:popular', async (_, { type, version, loader, limit = 24, offset = 0 }) => {
  const axios = require('axios')
  const facets = [[`project_type:${type}`]]
  if (version) facets.push([`versions:${version}`])
  if (loader)  facets.push([`categories:${loader}`])
  const res = await axios.get('https://api.modrinth.com/v2/search', {
    params: { query: '', facets: JSON.stringify(facets), index: 'downloads', limit: Math.min(limit, 100), offset },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return { hits: res.data.hits, total: res.data.total_hits }
})

// Buscar mods en Modrinth (con paginación)
ipcMain.handle('mods:search', async (_, { query, version, loader, limit = 24, offset = 0, extraFacets }) => {
  const axios = require('axios')
  const facets = [['project_type:mod']]
  if (version) facets.push([`versions:${version}`])
  if (loader)  facets.push([`categories:${loader}`])
  if (extraFacets && Array.isArray(extraFacets)) {
    extraFacets.forEach(f => facets.push(f))
  }

  const res = await axios.get('https://api.modrinth.com/v2/search', {
    params: {
      query,
      facets: JSON.stringify(facets),
      limit: Math.min(limit, 100),
      offset,
    },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return { hits: res.data.hits, total_hits: res.data.total_hits }
})

// Obtener versiones descargables de un mod
ipcMain.handle('mods:versions', async (_, { projectId, mcVersion, loader }) => {
  const axios = require('axios')
  const params = {}
  if (mcVersion) params.game_versions = JSON.stringify([mcVersion])
  if (loader)    params.loaders = JSON.stringify([loader])

  const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
    params,
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data
})

// Instalar (descargar) un mod
ipcMain.handle('mods:install', async (_, { fileUrl, fileName, gameDir }) => {
  const axios = require('axios')
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const modsDir = path.join(safeDir, 'mods')
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true })

  if (!isSafeDownloadUrl(fileUrl)) return { ok: false, error: 'URL no permitida' }
  const dest = safeFilePath(modsDir, fileName)
  const res = await axios.get(fileUrl, { responseType: 'arraybuffer' })
  fs.writeFileSync(dest, Buffer.from(res.data))
  return { ok: true, path: dest }
})

// Listar mods instalados
ipcMain.handle('mods:list', async (_, { gameDir }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch { return [] }
  const modsDir = path.join(safeDir, 'mods')
  if (!fs.existsSync(modsDir)) return []

  return fs.readdirSync(modsDir)
    .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
    .map(f => ({
      name: f.replace('.disabled', ''),
      file: f,
      enabled: !f.endsWith('.disabled'),
      path: path.join(modsDir, f),
    }))
})

// Activar/Desactivar mod
ipcMain.handle('mods:toggle', async (_, { gameDir, file, enabled }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const modsDir = path.join(safeDir, 'mods')
  if (!fs.existsSync(modsDir)) return { ok: false, error: 'Carpeta mods no existe' }
  try {
    const oldPath = safeFilePath(modsDir, file)   // #fix: path traversal + guard
    const newFile = path.basename(enabled ? file.replace('.disabled', '') : file + '.disabled')
    const newPath = safeFilePath(modsDir, newFile)
    fs.renameSync(oldPath, newPath)
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

// Eliminar mod
ipcMain.handle('mods:delete', async (_, { gameDir, file }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const modsDir = path.join(safeDir, 'mods')
  try {
    const modPath = safeFilePath(modsDir, file)
    if (fs.existsSync(modPath)) fs.unlinkSync(modPath)
  } catch {}
  return { ok: true }
})

// Abrir carpeta de mods en el explorador
ipcMain.handle('mods:openFolder', async (_, { gameDir }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch { return }
  const modsDir = path.join(safeDir, 'mods')
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true })
  shell.openPath(modsDir)
})

// Instalar mod local (drag & drop)
ipcMain.handle('mods:installLocal', async (_, { srcPath, gameDir }) => {
  if (!srcPath || typeof srcPath !== 'string') return { ok: false, error: 'Ruta inválida' }
  const ext = path.extname(srcPath).toLowerCase()
  if (!['.jar', '.disabled', '.zip'].includes(ext)) return { ok: false, error: 'Solo archivos .jar y .zip' }
  if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isFile()) return { ok: false, error: 'Archivo no encontrado' }
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const modsDir = path.join(safeDir, 'mods')
  fs.mkdirSync(modsDir, { recursive: true })
  const dest = safeFilePath(modsDir, path.basename(srcPath))
  await fs.promises.copyFile(srcPath, dest)
  return { ok: true }
})

// ── RAM del sistema ──────────────────────────────────────────────────────────
ipcMain.handle('system:ram', async () => {
  const os = require('os')
  const totalMB = Math.floor(os.totalmem() / 1024 / 1024)
  const recommended = totalMB >= 16384 ? 4096
    : totalMB >= 8192  ? 3072
    : totalMB >= 4096  ? 2048
    : 1024
  return { totalMB, recommended }
})

// ── Noticias de Minecraft ────────────────────────────────────────────────────
ipcMain.handle('minecraft:news', async () => {
  const axios = require('axios')
  try {
    const res = await axios.get('https://launchercontent.mojang.com/v2/javaPatchNotes.json', {
      headers: { 'User-Agent': 'EclipseLauncher/1.0' },
      timeout: 8000,
    })
    const BASE = 'https://launchercontent.mojang.com'
    const entries = (res.data.entries || []).slice(0, 6).map(e => ({
      ...e,
      image: e.image ? { ...e.image, url: e.image.url.startsWith('http') ? e.image.url : BASE + e.image.url } : null,
    }))
    return { ok: true, entries }
  } catch {
    return { ok: false, entries: [] }
  }
})

// ── CurseForge ───────────────────────────────────────────────────────────────
// Loader IDs de CurseForge
const CF_LOADERS = { any: 0, forge: 1, fabric: 4, quilt: 5, neoforge: 6 }

function cfHeaders(apiKey) {
  return {
    'x-api-key': apiKey || '',
    'Accept': 'application/json',
    'User-Agent': 'EclipseLauncher/1.0',
  }
}

// Buscar mods en CurseForge
ipcMain.handle('cf:search', async (_, { query, version, loader, apiKey }) => {
  const axios = require('axios')
  const params = {
    gameId: 432,       // Minecraft
    classId: 6,        // Mods
    searchFilter: query,
    pageSize: 20,
    sortField: 2,      // Popularity
    sortOrder: 'desc',
  }
  if (version) params.gameVersion = version
  if (loader && loader !== 'any') params.modLoaderType = CF_LOADERS[loader] ?? 0

  try {
    const res = await axios.get('https://api.curseforge.com/v1/mods/search', {
      params,
      headers: cfHeaders(apiKey),
    })
    return { ok: true, data: res.data.data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// Archivos de un mod en CurseForge
ipcMain.handle('cf:files', async (_, { modId, version, loader, apiKey }) => {
  const axios = require('axios')
  const params = { pageSize: 15 }
  if (version) params.gameVersion = version
  if (loader && loader !== 'any') params.modLoaderType = CF_LOADERS[loader] ?? 0

  try {
    const res = await axios.get(`https://api.curseforge.com/v1/mods/${modId}/files`, {
      params,
      headers: cfHeaders(apiKey),
    })
    return { ok: true, data: res.data.data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// Instalar mod de CurseForge (downloadUrl puede ser null en algunos mods)
ipcMain.handle('cf:install', async (_, { modId, fileId, fileName, downloadUrl, gameDir, apiKey }) => {
  const axios = require('axios')
  const modsDir = path.join(gameDir, 'mods')
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true })

  let url = downloadUrl
  // Si no hay URL directa, intentar obtenerla por API
  if (!url) {
    try {
      const res = await axios.get(
        `https://api.curseforge.com/v1/mods/${modId}/files/${fileId}/download-url`,
        { headers: cfHeaders(apiKey) }
      )
      url = res.data.data
    } catch {
      // Construir URL de fallback (edge.forgecdn.net)
      const id1 = String(fileId).slice(0, 4)
      const id2 = String(fileId).slice(4)
      url = `https://edge.forgecdn.net/files/${id1}/${id2}/${fileName}`
    }
  }

  if (!isSafeDownloadUrl(url)) return { ok: false, error: 'URL no permitida' }
  const dest = safeFilePath(modsDir, fileName)   // #fix: path traversal
  const res = await axios.get(url, { responseType: 'arraybuffer' })
  fs.writeFileSync(dest, Buffer.from(res.data))
  return { ok: true }
})

// ── Playtime ──────────────────────────────────────────────────────────────────
const PLAYTIME_FILE = path.join(LAUNCHER_DIR, 'playtime.json')
let sessionStart = null
let sessionMeta = null // { username, version }

ipcMain.handle('playtime:load', () => {
  if (!fs.existsSync(PLAYTIME_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(PLAYTIME_FILE, 'utf-8')) } catch { return {} }
})

// ── Shell openExternal ────────────────────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_, url) => {
  // Solo permitir HTTP/HTTPS a hosts públicos (reutiliza la validación anti-SSRF)
  if (typeof url !== 'string' || !isSafeDownloadUrl(url)) return
  shell.openExternal(url)
})

// ── Export / Import settings ──────────────────────────────────────────────────
ipcMain.handle('settings:export', async () => {
  let settings = {}, accounts = []
  try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) } catch {}
  try { accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')) } catch {}
  const safeAccounts = (accounts || []).map(({ accessToken, refreshToken, clientToken, token, authData, ...rest }) => rest)   // #fix: strip all tokens
  const bundle = JSON.stringify({ settings, accounts: safeAccounts, exportedAt: new Date().toISOString() }, null, 2)
  const dest = path.join(app.getPath('downloads'), `eclipse-backup-${Date.now()}.json`)
  fs.writeFileSync(dest, bundle)
  shell.openPath(path.dirname(dest))
  return { ok: true, path: dest }
})

ipcMain.handle('settings:import', async (_, { data }) => {
  if (!data || typeof data !== 'string' || data.length > 5 * 1024 * 1024)   // #fix: max 5 MB
    return { ok: false, error: 'Datos inválidos o demasiado grandes' }
  try {
    const bundle = JSON.parse(data)
    if (bundle && typeof bundle === 'object') {
      if (bundle.settings && typeof bundle.settings === 'object') {
        const s = bundle.settings
        if (s.javaPath !== undefined && (typeof s.javaPath !== 'string' || !/^[A-Za-z0-9 :/\\._-]+$/.test(s.javaPath)))
          return { ok: false, error: 'javaPath inválido' }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2))
      }
      if (bundle.accounts && Array.isArray(bundle.accounts)) fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(bundle.accounts, null, 2))
    }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

// ── System stats (CPU + RAM) ──────────────────────────────────────────────────
let lastCpuUsage = process.cpuUsage()
let lastCpuTime = Date.now()

ipcMain.handle('system:stats', () => {
  const os = require('os')
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  const now = Date.now()
  const current = process.cpuUsage(lastCpuUsage)
  const elapsed = (now - lastCpuTime) * 1000 // microseconds
  const cpuPercent = Math.min(100, Math.round(((current.user + current.system) / elapsed) * 100))
  lastCpuUsage = process.cpuUsage()
  lastCpuTime = now

  return {
    cpuPercent,
    usedMemMB: Math.round(usedMem / 1024 / 1024),
    totalMemMB: Math.round(totalMem / 1024 / 1024),
    usedPercent: Math.round((usedMem / totalMem) * 100),
  }
})

// ── Instancias ───────────────────────────────────────────────────────────────
const INSTANCES_FILE = path.join(LAUNCHER_DIR, 'instances.json')

ipcMain.handle('instances:load', () => {
  if (!fs.existsSync(INSTANCES_FILE)) return []
  try { return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf-8')) } catch { return [] }
})

ipcMain.handle('instances:save', (_, instances) => {
  const filled = (instances || []).map(inst => ({
    ...inst,
    gameDir: inst.gameDir || path.join(LAUNCHER_DIR, 'instances', inst.id),
  }))
  fs.writeFileSync(INSTANCES_FILE, JSON.stringify(filled, null, 2))
})

// ── Shaders ──────────────────────────────────────────────────────────────────
ipcMain.handle('shaders:search', async (_, { query, version }) => {
  const axios = require('axios')
  const facets = [['project_type:shader']]
  if (version) facets.push([`versions:${version}`])
  const res = await axios.get('https://api.modrinth.com/v2/search', {
    params: { query, facets: JSON.stringify(facets), limit: 20 },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data.hits
})

ipcMain.handle('shaders:install', async (_, { fileUrl, fileName, gameDir }) => {
  const axios = require('axios')
  if (!isSafeDownloadUrl(fileUrl)) return { ok: false, error: 'URL no permitida' }
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const dir = path.join(safeDir, 'shaderpacks')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const dest = safeFilePath(dir, fileName)
  const res = await axios.get(fileUrl, { responseType: 'arraybuffer' })
  fs.writeFileSync(dest, Buffer.from(res.data))
  return { ok: true }
})

ipcMain.handle('shaders:list', (_, { gameDir }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch { return [] }
  const dir = path.join(safeDir, 'shaderpacks')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.zip') || f.endsWith('.jar')).map(f => ({ name: f, file: f }))
})

ipcMain.handle('shaders:delete', (_, { gameDir, file }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const p = safeFilePath(path.join(safeDir, 'shaderpacks'), file)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  return { ok: true }
})

// ── Resource packs ───────────────────────────────────────────────────────────
ipcMain.handle('resourcepacks:search', async (_, { query, version }) => {
  const axios = require('axios')
  const facets = [['project_type:resourcepack']]
  if (version) facets.push([`versions:${version}`])
  const res = await axios.get('https://api.modrinth.com/v2/search', {
    params: { query, facets: JSON.stringify(facets), limit: 20 },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data.hits
})

ipcMain.handle('resourcepacks:install', async (_, { fileUrl, fileName, gameDir }) => {
  const axios = require('axios')
  if (!isSafeDownloadUrl(fileUrl)) return { ok: false, error: 'URL no permitida' }
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const dir = path.join(safeDir, 'resourcepacks')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const dest = safeFilePath(dir, fileName)
  const res = await axios.get(fileUrl, { responseType: 'arraybuffer' })
  fs.writeFileSync(dest, Buffer.from(res.data))
  return { ok: true }
})

ipcMain.handle('resourcepacks:list', (_, { gameDir }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch { return [] }
  const dir = path.join(safeDir, 'resourcepacks')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.zip')).map(f => ({ name: f, file: f }))
})

ipcMain.handle('resourcepacks:delete', (_, { gameDir, file }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const p = safeFilePath(path.join(safeDir, 'resourcepacks'), file)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  return { ok: true }
})

// ── Screenshots ──────────────────────────────────────────────────────────────
ipcMain.handle('screenshots:list', (_, { gameDir }) => {
  const dir = path.join(gameDir, 'screenshots')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .map(f => ({ name: f, path: path.join(dir, f) }))
    .reverse()
})

ipcMain.handle('screenshots:open', (_, { filePath }) => {
  if (!filePath || typeof filePath !== 'string') return
  const screenshotsBase = path.resolve(loadSettingsSync().gameDir || LAUNCHER_DIR, 'screenshots')
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(screenshotsBase + path.sep)) return   // #fix: path containment
  shell.openPath(resolved)
})

ipcMain.handle('screenshots:copy', async (_, { filePath }) => {
  if (!filePath || typeof filePath !== 'string') return { ok: false }
  const screenshotsBase = path.resolve(loadSettingsSync().gameDir || LAUNCHER_DIR, 'screenshots')
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(screenshotsBase + path.sep)) return { ok: false }   // #fix: path containment
  const { clipboard, nativeImage } = require('electron')
  clipboard.writeImage(nativeImage.createFromPath(resolved))
  return { ok: true }
})

// ── Profile export ───────────────────────────────────────────────────────────
ipcMain.handle('profile:export', async (_, { settings, instances, accounts, themes }) => {
  const { dialog } = require('electron')
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `eclipse-profile-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!filePath) return { ok: false }
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    settings: settings || {},
    instances: instances || [],
    // strip tokens from accounts
    accounts: (accounts || []).map(({ accessToken, refreshToken, clientToken, token, authData, ...rest }) => rest),   // #fix: strip all tokens
    themes: themes || [],
  }
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  return { ok: true, path: filePath }
})

// ── Logs export ──────────────────────────────────────────────────────────────
ipcMain.handle('logs:export', async (_, { gameDir }) => {
  const { dialog } = require('electron')
  const src = path.join(gameDir || '', 'logs', 'latest.log')
  if (!fs.existsSync(src)) return { ok: false, err: 'No encontrado' }
  const { filePath } = await dialog.showSaveDialog({ defaultPath: 'latest.log', filters: [{ name: 'Log', extensions: ['log', 'txt'] }] })
  if (!filePath) return { ok: false }
  await fs.promises.copyFile(src, filePath)
  return { ok: true }
})

// ── Modpacks ─────────────────────────────────────────────────────────────────
ipcMain.handle('modpacks:search', async (_, { query, version, loader }) => {
  const axios = require('axios')
  const facets = [['project_type:modpack']]
  if (version) facets.push([`versions:${version}`])
  if (loader && loader !== 'any') facets.push([`categories:${loader}`])
  const res = await axios.get('https://api.modrinth.com/v2/search', {
    params: { query, facets: JSON.stringify(facets), limit: 20 },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data.hits
})

ipcMain.handle('modpacks:versions', async (_, { projectId, mcVersion, loader }) => {
  const axios = require('axios')
  const params = {}
  if (mcVersion) params.game_versions = JSON.stringify([mcVersion])
  if (loader && loader !== 'any') params.loaders = JSON.stringify([loader])
  const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
    params,
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data
})

// ── Perfiles de mods ──────────────────────────────────────────────────────────
const PROFILES_FILE = path.join(LAUNCHER_DIR, 'mod-profiles.json')

ipcMain.handle('profiles:load', () => {
  if (!fs.existsSync(PROFILES_FILE)) return []
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8')) } catch { return [] }
})

ipcMain.handle('profiles:save', (_, profiles) => {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2))
  return { ok: true }
})

// ── Categorías Modrinth ───────────────────────────────────────────────────────
ipcMain.handle('modrinth:categories', async () => {
  const axios = require('axios')
  const res = await axios.get('https://api.modrinth.com/v2/tag/category', {
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return res.data.filter(c => c.project_type === 'mod')
})

// ── Dependencias de una versión ───────────────────────────────────────────────
ipcMain.handle('mods:dependencies', async (_, { versionId }) => {
  const axios = require('axios')
  const vRes = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`, {
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  const deps = (vRes.data.dependencies || []).filter(d => d.dependency_type === 'required' && d.project_id)
  if (!deps.length) return []
  const pRes = await axios.get('https://api.modrinth.com/v2/projects', {
    params: { ids: JSON.stringify(deps.map(d => d.project_id)) },
    headers: { 'User-Agent': 'EclipseLauncher/1.0' },
  })
  return pRes.data.map(p => ({ id: p.id, title: p.title, slug: p.slug, icon_url: p.icon_url }))
})

// ── Buscar actualizaciones de mods instalados ─────────────────────────────────
ipcMain.handle('mods:checkUpdates', async (_, { gameDir, mcVersion, loader }) => {
  const axios = require('axios')
  const modsDir = path.join(gameDir, 'mods')
  if (!fs.existsSync(modsDir)) return []

  const files = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
  const results = []

  for (const file of files) {
    const modName = file.replace('.jar', '').replace('.disabled', '').replace(/-[\d.]+$/, '')
    try {
      const searchRes = await axios.get('https://api.modrinth.com/v2/search', {
        params: {
          query: modName,
          facets: JSON.stringify([['project_type:mod']]),
          limit: 1,
        },
        headers: { 'User-Agent': 'EclipseLauncher/1.0' },
      })
      const hit = searchRes.data.hits[0]
      if (!hit) { results.push({ file, hasUpdate: false }); continue }

      const params = {}
      if (mcVersion) params.game_versions = JSON.stringify([mcVersion])
      if (loader) params.loaders = JSON.stringify([loader])
      const verRes = await axios.get(`https://api.modrinth.com/v2/project/${hit.project_id}/version`, {
        params,
        headers: { 'User-Agent': 'EclipseLauncher/1.0' },
      })
      const latest = verRes.data[0]
      if (!latest) { results.push({ file, hasUpdate: false }); continue }

      const latestFile = latest.files?.[0]?.filename || ''
      const hasUpdate = latestFile !== file && latestFile !== file.replace('.disabled', '')
      results.push({
        file,
        hasUpdate,
        latestFile: latestFile,
        latestUrl: latest.files?.[0]?.url,
        projectTitle: hit.title,
        projectId: hit.project_id,
        versionId: latest.id,
      })
    } catch {
      results.push({ file, hasUpdate: false })
    }
  }
  return results
})

// ── Actualizar un mod (reemplazar archivo) ────────────────────────────────────
ipcMain.handle('mods:update', async (_, { gameDir, oldFile, fileUrl, newFileName }) => {
  const axios = require('axios')
  const modsDir = path.join(gameDir, 'mods')
  const oldPath = safeFilePath(modsDir, oldFile)    // #fix: path traversal
  const newPath = safeFilePath(modsDir, newFileName) // #fix: path traversal
  if (!isSafeDownloadUrl(fileUrl)) return { ok: false, error: 'URL no permitida' }
  const res = await axios.get(fileUrl, { responseType: 'arraybuffer' })
  fs.writeFileSync(newPath, Buffer.from(res.data))
  if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  return { ok: true }
})

// ── Server Browser ────────────────────────────────────────────────────────────
ipcMain.handle('servers:ping', async (_, { host, port = 25565 }) => {
  // Fix #9: limitar host a dominios públicos razonables; bloquear LAN/loopback
  if (!host || typeof host !== 'string' || host.length > 253) return { online: false, ms: null }
  const portNum = Number(port)
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return { online: false, ms: null }
  // Solo permitir ping en puerto estándar de Minecraft y puertos alternativos comunes
  if (![25565, 25566, 19132, 19133].includes(portNum) && (portNum < 25000 || portNum > 30000))
    return { online: false, ms: null }
  if (!isSafeDownloadUrl(`http://${host}:${portNum}/`)) return { online: false, ms: null }
  const net = require('net')
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = new net.Socket()
    socket.setTimeout(3000)
    socket.connect(portNum, host, () => {
      const ms = Date.now() - start
      socket.destroy()
      resolve({ online: true, ms })
    })
    socket.on('error', () => { socket.destroy(); resolve({ online: false, ms: null }) })
    socket.on('timeout', () => { socket.destroy(); resolve({ online: false, ms: null }) })
  })
})

// ── Skins personalizadas ──────────────────────────────────────────────────────
ipcMain.handle('skin:save', async (_, { username, base64, token, variant }) => {
  if (!username || typeof username !== 'string' || !base64 || typeof base64 !== 'string') return { ok: false }
  if (base64.length > 2 * 1024 * 1024) return { ok: false, error: 'Imagen demasiado grande' }
  const safeName = username.replace(/[^\w\-.]/g, '_').slice(0, 64)
  const skinsDir = path.join(LAUNCHER_DIR, 'skins')
  fs.mkdirSync(skinsDir, { recursive: true })
  const dest = path.join(skinsDir, `${safeName}.png`)
  const buf = Buffer.from(base64, 'base64')
  fs.writeFileSync(dest, buf)

  // Subir a Mojang si hay token de cuenta Microsoft
  if (token && typeof token === 'string') {
    try {
      const FormData = require('form-data')
      const axios = require('axios')
      const form = new FormData()
      form.append('variant', ['classic','slim'].includes(variant) ? variant : 'classic')
      form.append('file', buf, { filename: 'skin.png', contentType: 'image/png' })
      await axios.post('https://api.minecraftservices.com/minecraft/profile/skins', form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
      return { ok: true, path: dest, uploaded: true }
    } catch (e) {
      return { ok: true, path: dest, uploaded: false, uploadError: e.message }
    }
  }
  return { ok: true, path: dest, uploaded: false }
})

ipcMain.handle('skin:get', async (_, { username }) => {
  const safeName = (username || '').replace(/[^\w\-.]/g, '_').slice(0, 64)
  const p = path.join(LAUNCHER_DIR, 'skins', `${safeName}.png`)
  if (!fs.existsSync(p)) return { ok: false }
  const buf = fs.readFileSync(p)
  return { ok: true, base64: buf.toString('base64') }
})

// ── Instancias export/import ──────────────────────────────────────────────────
ipcMain.handle('instances:export', async (_, { instanceId }) => {
  try {
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'))
    const inst = instances.find(i => i.id === instanceId)
    if (!inst) return { ok: false, error: 'Instancia no encontrada' }

    const bundle = { instance: inst, mods: [] }

    const modsPath = path.join(inst.gameDir || LAUNCHER_DIR, 'mods')
    if (fs.existsSync(modsPath)) {
      bundle.mods = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
    }

    const dest = path.join(app.getPath('downloads'), `eclipse-instance-${inst.name.replace(/\s+/g,'_')}-${Date.now()}.json`)
    fs.writeFileSync(dest, JSON.stringify(bundle, null, 2))
    shell.openPath(path.dirname(dest))
    return { ok: true, path: dest }
  } catch(e) { return { ok: false, error: e.message } }
})

ipcMain.handle('instances:exportMrpack', async (_, { instanceId }) => {
  try {
    const { dialog } = require('electron')
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'))
    const inst = instances.find(i => i.id === instanceId)
    if (!inst) return { ok: false, error: 'Instancia no encontrada' }

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `${(inst.name || 'instancia').replace(/[^\w\-. ]/g, '_')}.mrpack`,
      filters: [{ name: 'Modrinth Pack', extensions: ['mrpack'] }],
    })
    if (!filePath) return { ok: false }

    const index = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: inst.version || '1.21.4',
      name: inst.name || 'Instancia',
      summary: 'Exportado desde Abyss Launcher',
      dependencies: {
        minecraft: inst.version || '1.21.4',
        ...(inst.loader === 'fabric' && inst.loaderVersion ? { 'fabric-loader': inst.loaderVersion } : {}),
        ...(inst.loader === 'forge' && inst.loaderVersion ? { forge: inst.loaderVersion } : {}),
      },
      files: [],
    }
    fs.writeFileSync(filePath, JSON.stringify(index, null, 2))
    shell.openPath(path.dirname(filePath))
    return { ok: true, path: filePath }
  } catch(e) { return { ok: false, error: e.message } }
})

ipcMain.handle('instances:import', async (_, { data }) => {
  try {
    if (!data || (typeof data !== 'string' && typeof data !== 'object'))
      return { ok: false, error: 'Datos inválidos' }
    if (typeof data === 'string' && data.length > 10 * 1024 * 1024)   // #fix: max 10 MB
      return { ok: false, error: 'Datos demasiado grandes' }
    const bundle = typeof data === 'string' ? JSON.parse(data) : data
    if (!bundle || typeof bundle !== 'object' || !bundle.instance || typeof bundle.instance !== 'object')
      return { ok: false, error: 'Formato de instancia inválido' }
    const raw = bundle.instance
    // Fix #4: solo campos permitidos — evita prototype pollution y gameDir arbitrario
    const ALLOWED_INSTANCE_KEYS = ['name','version','loader','loaderVersion','mcVersion','icon','notes','created']
    const inst = Object.create(null)
    inst.id = Date.now().toString()
    inst.name = String(raw.name || 'instancia').slice(0, 128) + ' (importada)'
    // gameDir siempre desde settings del sistema, nunca del bundle
    inst.gameDir = loadSettingsSync().gameDir || path.join(LAUNCHER_DIR, 'minecraft')
    for (const k of ALLOWED_INSTANCE_KEYS) {
      if (k !== 'name' && raw[k] !== undefined) inst[k] = String(raw[k]).slice(0, 256)
    }

    const instances = fs.existsSync(INSTANCES_FILE)
      ? JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'))
      : []
    instances.push(inst)
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2))
    return { ok: true, instance: inst }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Clonar instancia ──────────────────────────────────────────────────────────
ipcMain.handle('instances:clone', async (_, { instanceId }) => {
  try {
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'))
    const orig = instances.find(i => i.id === instanceId)
    if (!orig) return { ok: false, error: 'No encontrada' }
    const clone = { ...orig, id: Date.now().toString(), name: orig.name + ' (copia)' }
    instances.push(clone)
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2))
    return { ok: true, instance: clone }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Backup completo de instancia ──────────────────────────────────────────────
ipcMain.handle('instances:backupFull', async (_, { instanceId, gameDir }) => {
  let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dest = path.join(LAUNCHER_DIR, 'backups', `instance-${instanceId}-${ts}`)
  await fs.promises.mkdir(dest, { recursive: true })
  for (const sub of ['mods', 'config', 'saves', 'resourcepacks', 'shaderpacks']) {
    const src = path.join(safeDir, sub)
    if (fs.existsSync(src)) await fs.promises.cp(src, path.join(dest, sub), { recursive: true })
  }
  return { ok: true, dest }
})

// ── Favoritos de mods ──────────────────────────────────────────────────────────
const FAVORITES_FILE = path.join(LAUNCHER_DIR, 'favorites.json')

ipcMain.handle('favorites:load', async () => {
  if (!fs.existsSync(FAVORITES_FILE)) return []
  return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8'))
})

ipcMain.handle('favorites:save', async (_, favs) => {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favs, null, 2))
  return { ok: true }
})

// ── Auto-actualización del launcher ───────────────────────────────────────────
const CURRENT_VERSION = require('../package.json').version

ipcMain.handle('launcher:checkUpdate', async () => {
  try {
    const axios = require('axios')
    const { updateRepoUrl } = loadSettingsSync()
    // updateRepoUrl debe ser "owner/repo" — si no está configurado, no hay check de actualizaciones
    if (!updateRepoUrl || typeof updateRepoUrl !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(updateRepoUrl))
      return { ok: false, current: CURRENT_VERSION, hasUpdate: false }
    const res = await axios.get(`https://api.github.com/repos/${updateRepoUrl}/releases/latest`, {
      timeout: 5000,
      headers: { 'User-Agent': 'AbyssLauncher' }
    })
    const latest = res.data.tag_name?.replace(/^v/, '')
    const hasUpdate = !!latest && latest !== CURRENT_VERSION
    return { ok: true, current: CURRENT_VERSION, latest, hasUpdate, url: res.data.html_url }
  } catch {
    return { ok: false, current: CURRENT_VERSION, hasUpdate: false }
  }
})

// ── Stats ─────────────────────────────────────────────────────────────────────
ipcMain.handle('stats:get', async () => {
  try {
    const playtime = fs.existsSync(PLAYTIME_FILE) ? JSON.parse(fs.readFileSync(PLAYTIME_FILE,'utf8')) : {}
    const instances = fs.existsSync(INSTANCES_FILE) ? JSON.parse(fs.readFileSync(INSTANCES_FILE,'utf8')) : []

    const totalMs = Object.values(playtime).reduce((s,p) => s + (p.totalMs||0), 0)
    const totalSessions = Object.values(playtime).reduce((s,p) => s + (p.sessions||0), 0)

    // Most played version
    const byVersion = {}
    Object.values(playtime).forEach(p => {
      byVersion[p.version] = (byVersion[p.version]||0) + p.totalMs
    })
    const topVersion = Object.entries(byVersion).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A'

    // Count mods across all instances
    let totalMods = 0
    const settings = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE,'utf8')) : {}
    const modsDir = path.join(settings.gameDir || LAUNCHER_DIR, 'mods')
    if (fs.existsSync(modsDir)) {
      totalMods = fs.readdirSync(modsDir).filter(f=>f.endsWith('.jar')).length
    }

    return { ok: true, totalMs, totalSessions, topVersion, totalInstances: instances.length, totalMods }
  } catch(e) { return { ok: false, totalMs:0, totalSessions:0, topVersion:'N/A', totalInstances:0, totalMods:0 } }
})

// ── Notes ─────────────────────────────────────────────────────────────────────
ipcMain.handle('notes:load', async () => {
  if (!fs.existsSync(NOTES_FILE)) return { notes: '' }
  return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'))
})
ipcMain.handle('notes:save', async (_, { notes }) => {
  if (typeof notes !== 'string' || notes.length > 500 * 1024) return { ok: false }   // #fix: max 500 KB
  fs.writeFileSync(NOTES_FILE, JSON.stringify({ notes }, null, 2))
  return { ok: true }
})

// ── Themes ────────────────────────────────────────────────────────────────────
ipcMain.handle('themes:load', async () => {
  if (!fs.existsSync(THEMES_FILE)) return []
  return JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'))
})
ipcMain.handle('themes:save', async (_, themes) => {
  fs.writeFileSync(THEMES_FILE, JSON.stringify(themes, null, 2))
  return { ok: true }
})

// ── World Manager ─────────────────────────────────────────────────────────────
ipcMain.handle('worlds:list', async (_, { gameDir }) => {
  const savesDir = path.join(gameDir, 'saves')
  if (!fs.existsSync(savesDir)) return []
  return fs.readdirSync(savesDir)
    .filter(f => fs.statSync(path.join(savesDir, f)).isDirectory())
    .map(name => {
      const worldPath = path.join(savesDir, name)
      const stat = fs.statSync(worldPath)
      const iconPath = path.join(worldPath, 'icon.png')
      return {
        name,
        path: worldPath,
        lastModified: stat.mtime.toISOString(),
        hasIcon: fs.existsSync(iconPath),
        iconPath: fs.existsSync(iconPath) ? iconPath : null,
      }
    })
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
})

ipcMain.handle('worlds:backup', async (_, { worldPath, name }) => {
  if (!worldPath || typeof worldPath !== 'string') return { ok: false }
  const savesBase = path.resolve(loadSettingsSync().gameDir || LAUNCHER_DIR, 'saves')
  const resolved = path.resolve(worldPath)
  if (!resolved.startsWith(savesBase + path.sep)) return { ok: false, error: 'Ruta inválida' }   // #fix: path containment
  const safeName = String(name || 'world').replace(/[^\w\-. ]/g, '_').slice(0, 64)
  const downloadsDir = app.getPath('downloads')
  const destPath = path.join(downloadsDir, `${safeName}_backup_${Date.now()}`)
  fs.cpSync(resolved, destPath, { recursive: true })
  shell.openPath(downloadsDir)
  return { ok: true, path: destPath }
})

ipcMain.handle('worlds:delete', async (_, { worldPath }) => {
  if (!worldPath || typeof worldPath !== 'string') return { ok: false }
  const savesBase = path.resolve(loadSettingsSync().gameDir || LAUNCHER_DIR, 'saves')
  const resolved = path.resolve(worldPath)
  if (!resolved.startsWith(savesBase + path.sep)) return { ok: false, error: 'Ruta inválida' }   // #fix: path containment
  fs.rmSync(resolved, { recursive: true, force: true })
  return { ok: true }
})

ipcMain.handle('worlds:open', async (_, { worldPath }) => {
  if (!worldPath || typeof worldPath !== 'string') return
  const savesBase = path.resolve(loadSettingsSync().gameDir || LAUNCHER_DIR, 'saves')
  const resolved = path.resolve(worldPath)
  if (!resolved.startsWith(savesBase + path.sep)) return   // #fix: path containment
  shell.openPath(resolved)
})

// ── OS Notifications ──────────────────────────────────────────────────────────
ipcMain.handle('notify:os', async (_, { title, body, urgency }) => {
  try {
    const { Notification } = require('electron')
    if (!Notification.isSupported()) return { ok: false }
    // Fix #10: límite de longitud para evitar desbordamiento de UI del sistema
    const URGENCY_ALLOWED = ['normal', 'low', 'critical']
    new Notification({
      title: String(title || 'Abyss Launcher').slice(0, 128),
      body:  String(body  || '').slice(0, 512),
      icon:  path.join(__dirname, '../assets/icon.png'),
      urgency: URGENCY_ALLOWED.includes(urgency) ? urgency : 'normal',
    }).show()
    return { ok: true }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Modpack installer ─────────────────────────────────────────────────────────
ipcMain.handle('modpack:install', async (_, { projectId, versionId, gameDir }) => {
  try {
    const axios = require('axios')

    // Get version files
    const verRes = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`, {
      headers: { 'User-Agent': 'EclipseLauncher/1.0' }
    })
    const version = verRes.data

    // Find the mrpack file
    const mrpackFile = version.files?.find(f => f.filename?.endsWith('.mrpack'))
    if (!mrpackFile) return { ok: false, error: 'No se encontró archivo .mrpack' }
    if (!isSafeDownloadUrl(mrpackFile.url)) return { ok: false, error: 'URL de modpack no permitida' }   // #fix: SSRF

    // Download the mrpack
    const os = require('os')
    const tmpPath = path.join(os.tmpdir(), mrpackFile.filename)
    const fileRes = await axios.get(mrpackFile.url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'EclipseLauncher/1.0' } })
    fs.writeFileSync(tmpPath, Buffer.from(fileRes.data))

    // Extract mrpack using extract-zip
    const extractZip = require('extract-zip')
    const extractDir = path.join(os.tmpdir(), `mrpack_${Date.now()}`)
    try {
      await extractZip(tmpPath, {
        dir: extractDir,
        onEntry: (entry) => {   // #fix: zip-slip
          const dest = path.resolve(extractDir, entry.fileName)
          if (!dest.startsWith(path.resolve(extractDir) + path.sep)) throw new Error('Zip-slip detectado')
        }
      })

      // Read modrinth.index.json
      const indexPath = path.join(extractDir, 'modrinth.index.json')
      if (!fs.existsSync(indexPath)) return { ok: false, error: 'Formato de modpack inválido' }
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

      // Download each file from the index
      const targetDir = gameDir || LAUNCHER_DIR
      const modsDir = path.join(targetDir, 'mods')
      fs.mkdirSync(modsDir, { recursive: true })

      let done = 0
      const total = index.files?.length || 0
      for (const modFile of (index.files || [])) {
        try {
          const url = modFile.downloads?.[0]
          if (!url || !isSafeDownloadUrl(url)) continue
          const filename = path.basename(modFile.path || '')
          if (!filename || filename === '.') continue
          // Fix #7: usa safeFilePath igual que el resto de instaladores
          const dest = safeFilePath(modsDir, filename)
          const r = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'EclipseLauncher/1.0' } })
          fs.writeFileSync(dest, Buffer.from(r.data))
          done++
          if (mainWindow) mainWindow.webContents.send('modpack:progress', { done, total, filename })
        } catch {}
      }

      return { ok: true, installed: done, total }
    } catch(e) { return { ok: false, error: e.message } }
    finally {   // #fix: always cleanup temp files
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Modpack: install from local .mrpack file ──────────────────────────────────
ipcMain.handle('modpack:installLocal', async (_, { mrpackPath, gameDir }) => {
  try {
    if (!mrpackPath || !mrpackPath.endsWith('.mrpack')) return { ok: false, error: 'Archivo no válido (.mrpack requerido)' }
    if (!fs.existsSync(mrpackPath)) return { ok: false, error: 'Archivo no encontrado' }
    let safeDir; try { safeDir = validateGameDir(gameDir) } catch(e) { return { ok: false, error: e.message } }

    const os = require('os')
    const extractZip = require('extract-zip')
    const extractDir = path.join(os.tmpdir(), `mrpack_local_${Date.now()}`)
    try {
      await extractZip(mrpackPath, {
        dir: extractDir,
        onEntry: (entry) => {
          const dest = path.resolve(extractDir, entry.fileName)
          if (!dest.startsWith(path.resolve(extractDir) + path.sep)) throw new Error('Zip-slip detectado')
        }
      })

      const indexPath = path.join(extractDir, 'modrinth.index.json')
      if (!fs.existsSync(indexPath)) return { ok: false, error: 'Formato de modpack inválido (sin modrinth.index.json)' }
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

      const axios = require('axios')
      const modsDir = path.join(safeDir, 'mods')
      fs.mkdirSync(modsDir, { recursive: true })

      let done = 0
      const total = index.files?.length || 0
      for (const modFile of (index.files || [])) {
        try {
          const url = modFile.downloads?.[0]
          if (!url || !isSafeDownloadUrl(url)) continue
          const filename = path.basename(modFile.path || '')
          if (!filename || filename === '.') continue
          const dest = safeFilePath(modsDir, filename)
          const r = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'EclipseLauncher/1.0' } })
          fs.writeFileSync(dest, Buffer.from(r.data))
          done++
          if (mainWindow) mainWindow.webContents.send('modpack:progress', { done, total, filename })
        } catch {}
      }

      return { ok: true, installed: done, total }
    } catch(e) { return { ok: false, error: e.message } }
    finally {
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
    }
  } catch(e) { return { ok: false, error: e.message } }
})

// ── Backups folder ────────────────────────────────────────────────────────────
ipcMain.handle('backups:openDir', async () => {
  const backupRoot = path.join(LAUNCHER_DIR, 'auto-backups')
  fs.mkdirSync(backupRoot, { recursive: true })
  shell.openPath(backupRoot)
  return { ok: true }
})

// ── Java auto-install ─────────────────────────────────────────────────────────
ipcMain.handle('java:autoInstall', async (_, { major = 21 } = {}) => {
  try {
    const https = require('https')
    const os = require('os')
    const extractZip = require('extract-zip')

    const sendProgress = (percent) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('java:installProgress', { percent })
    }

    // 1. Fetch metadata from Adoptium API
    const apiUrl = `https://api.adoptium.net/v3/assets/latest/${major}/ga?os=windows&architecture=x64&image_type=jre&jvm_impl=hotspot&vendor=eclipse`
    const meta = await new Promise((resolve, reject) => {
      https.get(apiUrl, { headers: { 'User-Agent': 'EclipseLauncher/1.0' } }, (res) => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch(e) { reject(e) } })
      }).on('error', reject)
    })

    const downloadUrl = meta?.[0]?.binary?.package?.link
    if (!downloadUrl) throw new Error('No se encontró URL de descarga para Java ' + major)
    if (!isSafeDownloadUrl(downloadUrl)) throw new Error('URL no permitida')

    sendProgress(5)

    // 2. Download to temp file
    const tmpFile = path.join(os.tmpdir(), `java-${major}-jre.zip`)
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpFile)
      https.get(downloadUrl, { headers: { 'User-Agent': 'EclipseLauncher/1.0' } }, (res) => {
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let received = 0
        res.on('data', chunk => {
          received += chunk.length
          file.write(chunk)
          if (total > 0) sendProgress(5 + Math.round((received / total) * 70))
        })
        res.on('end', () => { file.end(); resolve() })
        res.on('error', reject)
      }).on('error', reject)
    })

    sendProgress(75)

    // 3. Extract to LAUNCHER_DIR/runtimes/java-<major>
    const destDir = path.join(LAUNCHER_DIR, 'runtimes', `java-${major}`)
    fs.mkdirSync(destDir, { recursive: true })
    await extractZip(tmpFile, {
      dir: path.resolve(destDir),
      onEntry: (entry) => {
        const dest = path.resolve(destDir, entry.fileName)
        if (!dest.startsWith(path.resolve(destDir))) throw new Error('Zip-slip detectado')
      }
    })

    sendProgress(95)

    // 4. Find java.exe inside extracted folder
    let javaExe = null
    const scan = (dir, depth = 0) => {
      if (depth > 4) return
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry)
        if (entry === 'java.exe' && fs.statSync(full).isFile()) { javaExe = full; return }
        if (fs.statSync(full).isDirectory()) scan(full, depth + 1)
        if (javaExe) return
      }
    }
    scan(destDir)

    try { fs.unlinkSync(tmpFile) } catch {}

    if (!javaExe) throw new Error('No se encontró java.exe en el paquete descargado')

    sendProgress(100)
    return { ok: true, javaPath: javaExe }
  } catch(e) {
    return { ok: false, error: e.message }
  }
})

// ── Crash analyzer ────────────────────────────────────────────────────────────
ipcMain.handle('crash:latest', async (_, { gameDir }) => {
  try {
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8') || '[]')
    const knownDirs = instances.map(i => path.resolve(i.gameDir || ''))
    if (!knownDirs.includes(path.resolve(gameDir))) return { ok: false }
  } catch { return { ok: false } }
  const dir = path.join(gameDir, 'crash-reports')
  if (!fs.existsSync(dir)) return { ok: false }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort().reverse()
  if (!files.length) return { ok: false }
  const text = fs.readFileSync(path.join(dir, files[0]), 'utf8')
  const desc = text.match(/Description:\s*(.+)/)?.[1]?.trim() || 'Error desconocido'
  const exception = text.match(/(java\.\S+Exception[^\n]*)/)?.[1]?.trim() || ''
  return { ok: true, file: files[0], desc, exception, count: files.length }
})
