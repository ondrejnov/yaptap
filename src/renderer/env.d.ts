/// <reference types="vite/client" />

import type { AppConfig, DynamicContextConfig, DynamicContextResult } from '../shared/types'

declare global {
  interface Window {
    settingsApi: {
      platform: NodeJS.Platform
      getConfig: () => Promise<AppConfig>
      testDynamicContext: (config: DynamicContextConfig) => Promise<DynamicContextResult>
      saveSettings: (config: Partial<AppConfig>) => Promise<void>
    }
    overlayApi: {
      onRecordingStart: (cb: () => void) => void
      onRecordingStop: (cb: () => void) => void
      onTranscribing: (cb: () => void) => void
    }
    transcriptApi: {
      getLastTranscript: () => Promise<{ text: string; createdAt: string } | null>
      copyLastTranscript: () => Promise<boolean>
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
