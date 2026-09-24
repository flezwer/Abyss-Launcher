const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('eclipse', {
  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),

  // Accounts
  loadAccounts: () => ipcRenderer.invoke('accounts:load'),
  saveAccounts: (accounts) => ipcRenderer.invoke('accounts:save', accounts),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  // Game
  launchGame: (opts) => ipcRenderer.invoke('game:launch', opts),
  onGameLog:  (cb) => ipcRenderer.on('game:log', (_, msg) => cb(msg)),
  onProgress: (cb) => ipcRenderer.on('game:progress', (_, data) => cb(data)),
  onClose:    (cb) => ipcRenderer.on('game:close', (_, code) => cb(code)),
  offGameLog:  () => ipcRenderer.removeAllListeners('game:log'),
  offProgress: () => ipcRenderer.removeAllListeners('game:progress'),
  offClose:    () => ipcRenderer.removeAllListeners('game:close'),

  // Versions
  fetchVersions: () => ipcRenderer.invoke('versions:fetch'),

  // Mods (Modrinth)
  modrinthPopular: (opts) => ipcRenderer.invoke('modrinth:popular', opts),
  searchMods:    (opts) => ipcRenderer.invoke('mods:search', opts),
  modVersions:   (opts) => ipcRenderer.invoke('mods:versions', opts),
  installMod:    (opts) => ipcRenderer.invoke('mods:install', opts),
  listMods:      (opts) => ipcRenderer.invoke('mods:list', opts),
  toggleMod:     (opts) => ipcRenderer.invoke('mods:toggle', opts),
  deleteMod:     (opts) => ipcRenderer.invoke('mods:delete', opts),
  openModsFolder:(opts) => ipcRenderer.invoke('mods:openFolder', opts),
  installLocalMod:(opts) => ipcRenderer.invoke('mods:installLocal', opts),

  // Mods (CurseForge)
  cfSearch:   (opts) => ipcRenderer.invoke('cf:search', opts),
  cfFiles:    (opts) => ipcRenderer.invoke('cf:files', opts),
  cfInstall:  (opts) => ipcRenderer.invoke('cf:install', opts),

  // Java
  detectJava: () => ipcRenderer.invoke('java:detect'),
  javaCurrentMajor: (opts) => ipcRenderer.invoke('java:currentMajor', opts),
  javaAutoInstall: (opts) => ipcRenderer.invoke('java:autoInstall', opts),
  onJavaInstallProgress: (cb) => ipcRenderer.on('java:installProgress', (_, data) => cb(data)),
  offJavaInstallProgress: () => ipcRenderer.removeAllListeners('java:installProgress'),

  // System
  systemRam: () => ipcRenderer.invoke('system:ram'),

  // Minecraft News
  minecraftNews: () => ipcRenderer.invoke('minecraft:news'),

  // Instances
  loadInstances: () => ipcRenderer.invoke('instances:load'),
  saveInstances: (instances) => ipcRenderer.invoke('instances:save', instances),

  // Shaders
  searchShaders:  (opts) => ipcRenderer.invoke('shaders:search', opts),
  installShader:  (opts) => ipcRenderer.invoke('shaders:install', opts),
  listShaders:    (opts) => ipcRenderer.invoke('shaders:list', opts),
  deleteShader:   (opts) => ipcRenderer.invoke('shaders:delete', opts),

  // Resource packs
  searchResourcePacks:  (opts) => ipcRenderer.invoke('resourcepacks:search', opts),
  installResourcePack:  (opts) => ipcRenderer.invoke('resourcepacks:install', opts),
  listResourcePacks:    (opts) => ipcRenderer.invoke('resourcepacks:list', opts),
  deleteResourcePack:   (opts) => ipcRenderer.invoke('resourcepacks:delete', opts),

  // Screenshots
  listScreenshots: (opts) => ipcRenderer.invoke('screenshots:list', opts),
  openScreenshot:  (opts) => ipcRenderer.invoke('screenshots:open', opts),

  // Modpacks
  searchModpacks:   (opts) => ipcRenderer.invoke('modpacks:search', opts),
  modpackVersions:  (opts) => ipcRenderer.invoke('modpacks:versions', opts),

  // Profiles
  loadProfiles: () => ipcRenderer.invoke('profiles:load'),
  saveProfiles: (profiles) => ipcRenderer.invoke('profiles:save', profiles),

  // Modrinth tags
  modrinthCategories: () => ipcRenderer.invoke('modrinth:categories'),

  // Dependencies
  modDependencies: (opts) => ipcRenderer.invoke('mods:dependencies', opts),

  // Updates
  checkModUpdates: (opts) => ipcRenderer.invoke('mods:checkUpdates', opts),
  updateMod: (opts) => ipcRenderer.invoke('mods:update', opts),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Export / Import
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: (data) => ipcRenderer.invoke('settings:import', { data }),

  // System stats
  systemStats: () => ipcRenderer.invoke('system:stats'),

  // Playtime
  loadPlaytime: () => ipcRenderer.invoke('playtime:load'),

  // Servers
  pingServer: (opts) => ipcRenderer.invoke('servers:ping', opts),

  // Worlds
  listWorlds:  (opts) => ipcRenderer.invoke('worlds:list', opts),
  backupWorld: (opts) => ipcRenderer.invoke('worlds:backup', opts),
  deleteWorld: (opts) => ipcRenderer.invoke('worlds:delete', opts),
  openWorld:   (opts) => ipcRenderer.invoke('worlds:open', opts),

  // Skins
  saveSkin: (opts) => ipcRenderer.invoke('skin:save', opts),
  getSkin:  (opts) => ipcRenderer.invoke('skin:get', opts),

  // Instances export/import
  exportInstance: (opts) => ipcRenderer.invoke('instances:export', opts),
  importInstance: (data) => ipcRenderer.invoke('instances:import', { data }),

  // Favorites
  loadFavorites: () => ipcRenderer.invoke('favorites:load'),
  saveFavorites: (favs) => ipcRenderer.invoke('favorites:save', favs),

  // Launcher update check
  checkLauncherUpdate: () => ipcRenderer.invoke('launcher:checkUpdate'),

  // Discord Rich Presence
  discordSetActivity: (opts) => ipcRenderer.invoke('discord:setActivity', opts),
  discordClear: () => ipcRenderer.invoke('discord:clear'),

  // Instance export mrpack
  exportInstanceMrpack: (opts) => ipcRenderer.invoke('instances:exportMrpack', opts),

  // Instance clone
  cloneInstance: (opts) => ipcRenderer.invoke('instances:clone', opts),
  backupInstanceFull: (opts) => ipcRenderer.invoke('instances:backupFull', opts),

  // Stats
  getStats: () => ipcRenderer.invoke('stats:get'),

  // Notes
  loadNotes: () => ipcRenderer.invoke('notes:load'),
  saveNotes: (notes) => ipcRenderer.invoke('notes:save', { notes }),

  // Themes
  loadThemes: () => ipcRenderer.invoke('themes:load'),
  saveThemes: (themes) => ipcRenderer.invoke('themes:save', themes),

  // OS Notifications
  osNotify: (opts) => ipcRenderer.invoke('notify:os', opts),

  // Modpack installer
  installModpack: (opts) => ipcRenderer.invoke('modpack:install', opts),
  installModpackLocal: (opts) => ipcRenderer.invoke('modpack:installLocal', opts),
  onModpackProgress: (cb) => ipcRenderer.on('modpack:progress', (_, data) => cb(data)),
  offModpackProgress: () => ipcRenderer.removeAllListeners('modpack:progress'),

  // Backups
  openBackupsDir: () => ipcRenderer.invoke('backups:openDir'),

  // Profile export
  exportProfile: (opts) => ipcRenderer.invoke('profile:export', opts),

  // Fabric
  fabricLoaders: (opts) => ipcRenderer.invoke('fabric:loaders', opts),

  // Java scanner
  scanJavas: () => ipcRenderer.invoke('java:scan'),

  // Logs export
  exportLogs: (opts) => ipcRenderer.invoke('logs:export', opts),

  // Crash analyzer
  crashLatest: (opts) => ipcRenderer.invoke('crash:latest', opts),

  // Screenshot copy
  copyScreenshot: (opts) => ipcRenderer.invoke('screenshots:copy', opts),

  // Game repair
  repairGame: (opts) => ipcRenderer.invoke('game:repair', opts),

  // Microsoft auth
  msAuthStart:   () => ipcRenderer.invoke('auth:ms:start'),
  msAuthPoll:    () => ipcRenderer.invoke('auth:ms:poll'),
  msAuthRefresh: (opts) => ipcRenderer.invoke('auth:ms:refresh', opts),
  onAccountsUpdated: (cb) => ipcRenderer.on('accounts:updated', (_, accounts) => cb(accounts)),
})
