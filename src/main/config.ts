import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { getEffectiveShortcut } from './shortcuts'
import { DEFAULT_CONFIG, type AppConfig } from '../shared/types'

export type { AppConfig }

let config: AppConfig = { ...DEFAULT_CONFIG }

export function getConfig(): AppConfig {
  return config
}

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function loadConfig(): void {
  try {
    if (existsSync(configPath())) {
      config = { ...config, ...JSON.parse(readFileSync(configPath(), 'utf8')) }
    }
  } catch {
    /* ignore – použij výchozí konfiguraci */
  }
  config.shortcut = getEffectiveShortcut(config.shortcut)
  applyLoginSettings()
}

export function saveConfig(): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2))
}

export function updateConfig(patch: Partial<AppConfig>): void {
  config = { ...config, ...patch }
  config.shortcut = getEffectiveShortcut(config.shortcut)
  saveConfig()
  applyLoginSettings()
}

export function applyLoginSettings(): void {
  app.setLoginItemSettings({
    openAtLogin: !!config.openAtLogin,
    path: app.getPath('exe'),
    openAsHidden: true // pouze macOS
  })
}
