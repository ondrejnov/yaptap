import { BrowserWindow, dialog } from 'electron'
import { uIOhook } from 'uiohook-napi'
import { getConfig } from './config'
import { getTargetKeys, normalizeKey } from './shortcuts'
import { getIsRecording, setIsRecording, startRecording, stopRecording } from './recording'

const activeKeys = new Set<number>()

function isSettingsFocused(): boolean {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (!focusedWindow) return false

  return focusedWindow.webContents.getURL().includes('/settings/')
}

export function registerHotkey(): void {
  try {
    uIOhook.on('keydown', (e) => {
      if (isSettingsFocused()) return

      activeKeys.add(normalizeKey(e.keycode))
      const targetKeys = getTargetKeys(getConfig().shortcut)
      if (targetKeys.every((k) => activeKeys.has(k)) && !getIsRecording()) {
        setIsRecording(true)
        startRecording()
      }
    })

    uIOhook.on('keyup', (e) => {
      activeKeys.delete(normalizeKey(e.keycode))
      const targetKeys = getTargetKeys(getConfig().shortcut)
      if (!targetKeys.every((k) => activeKeys.has(k)) && getIsRecording()) {
        setIsRecording(false)
        activeKeys.clear() // Reset – předchází zaseknutí po zmeškaném keyup eventu
        stopRecording()
      }
    })

    uIOhook.start()
    console.log('Hotkey registrován (push-to-talk)')
  } catch (e) {
    console.error('Chyba při registraci hotkey (uiohook-napi):', e)
    dialog.showErrorBox(
      'Chyba klávesové zkratky',
      `Nepodařilo se načíst modul pro globální zkratky.\n\n${(e as Error).message}\n\nZkuste přeinstalovat aplikaci nebo restartovat počítač.`
    )
  }
}

export function clearActiveKeys(): void {
  activeKeys.clear()
}
