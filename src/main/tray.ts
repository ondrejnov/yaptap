import { app, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { getConfig } from './config'
import { getShortcutLabel } from './shortcuts'
import { openSettings } from './windows'
import { checkMacAccessibility } from './accessibility'

let tray: Tray | null = null

/** Cesta k assetům – v devu z rootu projektu, v produkci z resources. */
function assetPath(file: string): string {
  const base = app.isPackaged ? process.resourcesPath : join(__dirname, '../../assets')
  return join(base, file)
}

function trayIcon(active: boolean): Electron.NativeImage {
  return nativeImage.createFromPath(assetPath(active ? 'tray-active.png' : 'tray-idle.png'))
}

function idleTooltip(): string {
  return `yaptap – drž ${getShortcutLabel(getConfig().shortcut)} pro nahrávání`
}

export function createTray(): void {
  tray = new Tray(trayIcon(false))
  updateTrayMenu()
}

export function updateTrayMenu(): void {
  if (!tray) return
  const shortcut = getShortcutLabel(getConfig().shortcut)
  tray.setToolTip(idleTooltip())

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'yaptap', enabled: false },
    { type: 'separator' },
    { label: `Hotkey: ${shortcut} (držet)`, enabled: false },
    { type: 'separator' },
    ...(process.platform === 'darwin'
      ? [{ label: 'Opravit oprávnění kláves (Mac)', click: (): void => void checkMacAccessibility(true) }]
      : []),
    { label: 'Nastavení…', click: (): void => openSettings() },
    { type: 'separator' },
    { label: 'Ukončit', click: (): void => app.exit(0) }
  ]

  tray.setContextMenu(Menu.buildFromTemplate(template))
}

export function setTrayActive(active: boolean): void {
  if (!tray) return
  tray.setImage(trayIcon(active))
  tray.setToolTip(active ? '🔴 Nahrávám…' : idleTooltip())
}

export function setTrayError(message: string): void {
  if (!tray) return
  tray.setToolTip(`❌ ${message}`)
  setTimeout(() => tray?.setToolTip(idleTooltip()), 3000)
}
