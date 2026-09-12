type LastTranscript = {
  text: string
  createdAt: string
}

let lastTranscript: LastTranscript | null = null

export function setLastTranscript(text: string): void {
  lastTranscript = {
    text,
    createdAt: new Date().toISOString()
  }
}

export function getLastTranscript(): LastTranscript | null {
  return lastTranscript
}
