import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig } from '../shared/types'

const api = {
  platform: process.platform as NodeJS.Platform,
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveSettings: (config: Partial<AppConfig>): Promise<void> => ipcRenderer.invoke('save-settings', config)
}

contextBridge.exposeInMainWorld('settingsApi', api)

export type SettingsApi = typeof api
