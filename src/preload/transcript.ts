import { contextBridge, ipcRenderer } from 'electron'

type LastTranscript = {
  text: string
  createdAt: string
}

const api = {
  getLastTranscript: (): Promise<LastTranscript | null> => ipcRenderer.invoke('get-last-transcript'),
  copyLastTranscript: (): Promise<boolean> => ipcRenderer.invoke('copy-last-transcript')
}

contextBridge.exposeInMainWorld('transcriptApi', api)

export type TranscriptApi = typeof api
