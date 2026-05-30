import { BrowserWindow, dialog, systemPreferences } from 'electron'
import { uIOhook } from 'uiohook-napi'
import { getConfig } from './config'
import { getTargetKeys, normalizeKey } from './shortcuts'
import { getIsRecording, setIsRecording, startRecording, stopRecording } from './recording'

const activeKeys = new Set<number>()

// Dorazil od startu aspoň jeden vstupní event? Slouží k detekci tiše selhaného tapu.
let gotAnyInput = false
let tapWatchdog: NodeJS.Timeout | null = null

function isSettingsFocused(): boolean {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (!focusedWindow) return false

  return focusedWindow.webContents.getURL().includes('/settings/')
}

/**
 * Na macOS může event tap potichu selhat, i když systém hlásí udělené oprávnění
 * Zpřístupnění (typicky u lokálního nepodepsaného buildu: po přebuildování se změní
 * cdhash → TCC tap zablokuje, ale `uIOhook.start()` nevyhodí žádnou chybu). Watchdog
 * ověří, že do pár sekund dorazil aspoň jeden vstup (stačí pohyb myši, ten chodí
 * neustále). Pokud ne, tap nejede – upozorníme uživatele s návodem na nápravu.
 */
function armTapWatchdog(): void {
  if (process.platform !== 'darwin') return
  if (tapWatchdog) clearTimeout(tapWatchdog)

  tapWatchdog = setTimeout(() => {
    tapWatchdog = null
    if (gotAnyInput) return

    console.error(
      'uiohook: do 15 s nedorazil žádný vstupní event – event tap zřejmě potichu selhal ' +
        '(macOS hlásí oprávnění, ale tap je kvůli změně podpisu/cdhash zablokovaný).'
    )
    void dialog.showMessageBox({
      type: 'warning',
      title: 'Klávesové zkratky nereagují',
      message:
        'yaptap nedostává žádné klávesové události, přestože macOS hlásí udělené oprávnění Zpřístupnění.\n\n' +
        'U lokálního (nepodepsaného) buildu se to stává po každém přebuildování – systém má v seznamu starou verzi aplikace.\n\n' +
        'Řešení: Nastavení systému → Soukromí a zabezpečení → Zpřístupnění → odeberte yaptap tlačítkem „−" a přidejte jej znovu „+". Poté aplikaci úplně ukončete (přes tray / Cmd+Q) a spusťte znovu.',
      buttons: ['OK']
    })
  }, 15000)
}

export function registerHotkey(): void {
  try {
    if (process.platform === 'darwin') {
      console.log(
        'uiohook: isTrustedAccessibilityClient =',
        systemPreferences.isTrustedAccessibilityClient(false)
      )
    }

    // První jakýkoli vstup (klávesa i pohyb myši) = potvrzení, že tap reálně běží.
    uIOhook.on('input', () => {
      if (gotAnyInput) return
      gotAnyInput = true
      if (tapWatchdog) {
        clearTimeout(tapWatchdog)
        tapWatchdog = null
      }
      console.log('uiohook: event tap aktivní (první vstup přijat).')
    })

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
    armTapWatchdog()
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
