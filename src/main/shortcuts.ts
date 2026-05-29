import { UiohookKey } from 'uiohook-napi'
import { SHORTCUT_OPTIONS, type Shortcut } from '../shared/types'

const DEFAULT_SHORTCUT: Shortcut = 'Ctrl+Win'

export function getSupportedShortcuts(): Shortcut[] {
  return SHORTCUT_OPTIONS.filter((o) => o.platforms.includes(process.platform)).map((o) => o.value)
}

export function getEffectiveShortcut(shortcut: Shortcut): Shortcut {
  return getSupportedShortcuts().includes(shortcut) ? shortcut : DEFAULT_SHORTCUT
}

export function getShortcutLabel(shortcut: Shortcut): string {
  if (process.platform === 'darwin') {
    if (shortcut === 'Ctrl+Win') return 'Ctrl+Cmd'
    if (shortcut === 'Alt+Space') return 'Option+Mezerník'
  }
  return shortcut
}

/** Mapuje zkratku na uiohook keycody, které musí být současně stisknuté. */
export function getTargetKeys(shortcut: Shortcut): number[] {
  const map: Record<Shortcut, number[]> = {
    'Ctrl+Win': [UiohookKey.Ctrl, UiohookKey.Meta],
    'Ctrl+Space': [UiohookKey.Ctrl, UiohookKey.Space],
    'Ctrl+M': [UiohookKey.Ctrl, UiohookKey.M],
    'Cmd+M': [UiohookKey.Meta, UiohookKey.M],
    'Alt+Space': [UiohookKey.Alt, UiohookKey.Space],
    'Shift+Space': [UiohookKey.Shift, UiohookKey.Space],
    F8: [UiohookKey.F8],
    F9: [UiohookKey.F9],
    F10: [UiohookKey.F10],
    F12: [UiohookKey.F12]
  }
  return map[shortcut] || map[DEFAULT_SHORTCUT]
}

/** Sloučí levou/pravou variantu modifikátorů na jeden keycode. */
export function normalizeKey(keycode: number): number {
  if (keycode === UiohookKey.CtrlRight) return UiohookKey.Ctrl
  if (keycode === UiohookKey.MetaRight) return UiohookKey.Meta
  if (keycode === UiohookKey.AltRight) return UiohookKey.Alt
  if (keycode === UiohookKey.ShiftRight) return UiohookKey.Shift
  return keycode
}
