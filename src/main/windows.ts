import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { getConfig } from './config'
import type { PedalInput } from '../shared/types'

type RendererName = 'settings' | 'overlay' | 'recorder'

let overlayWindow: BrowserWindow | null = null
let recorderWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let shuttingDown = false
let recorderReady = false
const recorderReadyCallbacks: Array<() => void> = []

export function setShuttingDown(value: boolean): void {
  shuttingDown = value
}

/** Načte HTML daného rendereru – dev server v devu, soubor v produkci. */
function loadRenderer(win: BrowserWindow, name: RendererName): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/${name}/index.html`)
  } else {
    void win.loadFile(join(__dirname, `../renderer/${name}/index.html`))
  }
}

function preloadPath(name: RendererName): string {
  // electron-vite emituje preloady jako ESM (.mjs) kvůli "type": "module"
  return join(__dirname, `../preload/${name}.mjs`)
}

function windowIconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(__dirname, '../../assets/icon.ico')
}

// ─── Pomocné funkce ──────────────────────────────────────────────────────────
export function isWindowUsable(win: BrowserWindow | null): win is BrowserWindow {
  return !!(win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed())
}

export function safeSend(win: BrowserWindow | null, channel: string, ...args: unknown[]): boolean {
  try {
    if (!isWindowUsable(win)) return false
    win.webContents.send(channel, ...args)
    return true
  } catch (e) {
    console.error(`IPC send selhal (${channel}):`, (e as Error).message)
    return false
  }
}

export function sendRecorderConfig(): void {
  if (!recorderReady) return
  const config = getConfig()
  safeSend(recorderWindow, 'set-device', config.deviceId)
  safeSend(recorderWindow, 'set-pedal-config', {
    enabled: config.pedalEnabled,
    gamepadId: config.pedalGamepadId,
    input: config.pedalInput as PedalInput
  })
}

export function isRecorderReady(): boolean {
  return recorderReady && isWindowUsable(recorderWindow)
}

export function onRecorderReady(cb: () => void): void {
  if (isRecorderReady()) {
    cb()
    return
  }
  recorderReadyCallbacks.push(cb)
}

export function markRecorderReady(): void {
  recorderReady = true
  sendRecorderConfig()
  const callbacks = recorderReadyCallbacks.splice(0)
  callbacks.forEach((cb) => cb())
}

// ─── Overlay okno (indikátor nahrávání) ──────────────────────────────────────
export function createOverlay(): void {
  if (isWindowUsable(overlayWindow)) return

  overlayWindow = new BrowserWindow({
    width: 70,
    height: 70,
    icon: windowIconPath(),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath('overlay'),
      sandbox: false, // nutné pro ESM preload
      // Renderer nesmí být uspán, jinak se IPC zpráva zpracuje pozdě
      backgroundThrottling: false
    }
  })

  loadRenderer(overlayWindow, 'overlay')

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
  overlayWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Overlay renderer zhasnul:', details.reason)
    overlayWindow = null
    if (!shuttingDown) setTimeout(() => createOverlay(), 300)
  })
}

export function ensureOverlay(): BrowserWindow | null {
  if (!isWindowUsable(overlayWindow)) createOverlay()
  return overlayWindow
}

export function getOverlay(): BrowserWindow | null {
  return overlayWindow
}

export function showOverlay(): void {
  const win = ensureOverlay()
  if (!isWindowUsable(win)) return
  // Přepočítej pozici vždy před zobrazením (různé DPI, vzdálené plochy)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  win.setPosition(width - 90, height - 90)
  win.showInactive() // nekrade focus na macOS ani Windows
  win.setAlwaysOnTop(true, 'pop-up-menu')
}

export function hideOverlay(): void {
  if (!isWindowUsable(overlayWindow)) return
  try {
    overlayWindow.hide()
  } catch (e) {
    console.error('Chyba při skrývání overlay:', (e as Error).message)
  }
}

// ─── Recorder okno (skrytý renderer pro Web Audio API) ───────────────────────
export function createRecorderWindow(): void {
  if (isWindowUsable(recorderWindow)) return
  recorderReady = false

  recorderWindow = new BrowserWindow({
    show: false,
    icon: windowIconPath(),
    webPreferences: {
      preload: preloadPath('recorder'),
      sandbox: false, // nutné pro ESM preload
      backgroundThrottling: false
    }
  })

  loadRenderer(recorderWindow, 'recorder')

  recorderWindow.on('closed', () => {
    console.warn('Recorder window zavřeno, obnovuji…')
    recorderWindow = null
    recorderReady = false
    if (!shuttingDown) setTimeout(() => createRecorderWindow(), 300)
  })
  recorderWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Recorder renderer zhasnul:', details.reason)
    recorderWindow = null
    recorderReady = false
    if (!shuttingDown) setTimeout(() => createRecorderWindow(), 300)
  })
}

export function ensureRecorder(): BrowserWindow | null {
  if (!isWindowUsable(recorderWindow)) createRecorderWindow()
  return recorderWindow
}

export function getRecorder(): BrowserWindow | null {
  return recorderWindow
}

// ─── Settings okno ───────────────────────────────────────────────────────────
export function openSettings(): void {
  if (isWindowUsable(settingsWindow)) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 820,
    height: 620,
    icon: windowIconPath(),
    minWidth: 720,
    minHeight: 520,
    title: 'Nastavení – yaptap',
    resizable: true,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath('settings'),
      sandbox: false // nutné pro ESM preload
    }
  })
  settingsWindow.setMenu(null)
  loadRenderer(settingsWindow, 'settings')
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}
