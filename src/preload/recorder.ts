import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onSetDevice: (cb: (deviceId: string | null) => void): void =>
    void ipcRenderer.on('set-device', (_e, deviceId: string | null) => cb(deviceId)),
  onSetPedalConfig: (cb: (config: { enabled: boolean; gamepadId: string | null; input: string }) => void): void =>
    void ipcRenderer.on('set-pedal-config', (_e, config) => cb(config)),
  onStartRecording: (cb: () => void): void => void ipcRenderer.on('start-recording', () => cb()),
  onStopRecording: (cb: () => void): void => void ipcRenderer.on('stop-recording', () => cb()),
  sendRecorderReady: (): void => ipcRenderer.send('recorder-ready'),
  sendAudioData: (buffer: ArrayBuffer): void => ipcRenderer.send('audio-data', buffer),
  sendRecordingStarted: (): void => ipcRenderer.send('recording-started'),
  sendPedalState: (pressed: boolean): void => ipcRenderer.send('pedal-state', pressed),
  sendRecordingError: (err: { code: string; message: string }): void => ipcRenderer.send('recording-error', err)
}

contextBridge.exposeInMainWorld('recorderApi', api)

export type RecorderApi = typeof api
