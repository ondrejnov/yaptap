import { app, globalShortcut, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { getConfig, loadConfig, updateConfig, type AppConfig } from './config'
import { createTray, updateTrayMenu } from './tray'
import { createOverlay, createRecorderWindow, safeSend, getRecorder, setShuttingDown } from './windows'
import { registerHotkey, clearActiveKeys } from './hotkey'
import { checkMacAccessibility } from './accessibility'
import { handleAudioData, handleRecordingError } from './recording'

// macOS: ANGLE can spam stderr with `EGL Driver message (Error)
// eglQueryDeviceAttribEXT`. This app does not need GPU acceleration, so disable it
// before any Electron runtime paths/windows are touched.
if (process.platform === 'darwin') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
}

// ─── Runtime cache cesty ──────────────────────────────────────────────────────
function configureRuntimePaths(): void {
  try {
    const cachePath = join(app.getPath('temp'), 'yaptap-cache')
    const sessionDataPath = join(cachePath, 'session-data')
    mkdirSync(cachePath, { recursive: true })
    mkdirSync(sessionDataPath, { recursive: true })
    app.setPath('cache', cachePath)
    app.setPath('sessionData', sessionDataPath)
    app.commandLine.appendSwitch('disk-cache-dir', cachePath)
  } catch (e) {
    console.warn('Nepodařilo se nastavit sessionData path:', (e as Error).message)
  }
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
  app.commandLine.appendSwitch('disable-http-cache')

}

configureRuntimePaths()

// ─── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.platform === 'darwin' && !app.isPackaged) {
    try {
      app.dock?.setIcon(nativeImage.createFromPath(join(__dirname, '../../assets/icon.png')))
    } catch (e) {
      console.error('Chyba při nastavení dock ikony:', e)
    }
  }

  loadConfig()
  createTray()
  createOverlay()
  createRecorderWindow()

  // Počkej, až jsou okna ready, pak registruj hotkey
  setTimeout(() => {
    if (checkMacAccessibility()) {
      registerHotkey()
    } else {
      console.warn('Hotkey neregistrován: chybí oprávnění Accessibility.')
    }
  }, 1000)
})

// Tray app – samotná registrace listeneru potlačí výchozí ukončení po zavření oken
app.on('window-all-closed', () => {
  /* nezavírat – běží v tray */
})

app.on('will-quit', () => {
  setShuttingDown(true)
  globalShortcut.unregisterAll()
})

process.on('uncaughtException', (err) => console.error('Neodchycená chyba v hlavním procesu:', err))
process.on('unhandledRejection', (reason) => console.error('Neodchycený promise reject:', reason))

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => getConfig())

ipcMain.handle('save-settings', (_event, newConfig: Partial<AppConfig>) => {
  updateConfig(newConfig)
  updateTrayMenu()
  safeSend(getRecorder(), 'set-device', getConfig().deviceId)
})

ipcMain.on('audio-data', (_event, arrayBuffer: ArrayBuffer) => {
  void handleAudioData(arrayBuffer)
})

ipcMain.on('recording-error', (_event, err: { code?: string; message?: string }) => {
  clearActiveKeys()
  handleRecordingError(err)
})

ipcMain.on('recording-started', () => {
  /* recorder potvrdil start – zatím bez akce */
})
