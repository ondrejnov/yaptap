/// <reference types="vite/client" />

import type { AppConfig } from '../shared/types'

declare global {
  interface Window {
    settingsApi: {
      platform: NodeJS.Platform
      getConfig: () => Promise<AppConfig>
      saveSettings: (config: Partial<AppConfig>) => Promise<void>
    }
    overlayApi: {
      onRecordingStart: (cb: () => void) => void
      onRecordingStop: (cb: () => void) => void
      onTranscribing: (cb: () => void) => void
    }
    recorderApi: {
      onSetDevice: (cb: (deviceId: string | null) => void) => void
      onStartRecording: (cb: () => void) => void
      onStopRecording: (cb: () => void) => void
      sendAudioData: (buffer: ArrayBuffer) => void
      sendRecordingStarted: () => void
      sendRecordingError: (err: { code: string; message: string }) => void
    }
  }
}

export {}
