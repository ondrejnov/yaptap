import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onSetDevice: (cb: (deviceId: string | null) => void): void =>
    void ipcRenderer.on('set-device', (_e, deviceId: string | null) => cb(deviceId)),
  onStartRecording: (cb: () => void): void => void ipcRenderer.on('start-recording', () => cb()),
  onStopRecording: (cb: () => void): void => void ipcRenderer.on('stop-recording', () => cb()),
  sendAudioData: (buffer: ArrayBuffer): void => ipcRenderer.send('audio-data', buffer),
  sendRecordingStarted: (): void => ipcRenderer.send('recording-started'),
  sendRecordingError: (err: { code: string; message: string }): void => ipcRenderer.send('recording-error', err)
}

contextBridge.exposeInMainWorld('recorderApi', api)

export type RecorderApi = typeof api
