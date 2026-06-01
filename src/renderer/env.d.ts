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
      onSetPedalConfig: (cb: (config: { enabled: boolean; gamepadId: string | null; input: string }) => void) => void
      onStartRecording: (cb: () => void) => void
      onStopRecording: (cb: () => void) => void
      sendRecorderReady: () => void
      sendAudioData: (buffer: ArrayBuffer) => void
      sendRecordingStarted: () => void
      sendPedalState: (pressed: boolean) => void
      sendRecordingError: (err: { code: string; message: string }) => void
    }
  }
}

export {}
