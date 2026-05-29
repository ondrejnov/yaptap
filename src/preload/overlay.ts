import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onRecordingStart: (cb: () => void): void => void ipcRenderer.on('recording-start', () => cb()),
  onRecordingStop: (cb: () => void): void => void ipcRenderer.on('recording-stop', () => cb()),
  onTranscribing: (cb: () => void): void => void ipcRenderer.on('transcribing', () => cb())
}

contextBridge.exposeInMainWorld('overlayApi', api)

export type OverlayApi = typeof api
