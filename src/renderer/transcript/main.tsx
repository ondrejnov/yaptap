import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'

type LastTranscript = {
  text: string
  createdAt: string
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function App(): JSX.Element {
  const [transcript, setTranscript] = useState<LastTranscript | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void window.transcriptApi.getLastTranscript().then(setTranscript)
  }, [])

  async function copyTranscript(): Promise<void> {
    const ok = await window.transcriptApi.copyLastTranscript()
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="flex min-h-full flex-col bg-slate-50 p-5 text-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Poslední transkript</h1>
          <p className="mt-1 text-sm text-slate-500">
            {transcript ? formatCreatedAt(transcript.createdAt) : 'Zatím není uložený žádný transkript.'}
          </p>
        </div>
        <button
          type="button"
          disabled={!transcript}
          onClick={() => void copyTranscript()}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {copied ? 'Zkopírováno' : 'Zkopírovat'}
        </button>
      </div>

      <textarea
        readOnly
        value={transcript?.text ?? ''}
        placeholder="Po první úspěšné transkripci se text zobrazí tady."
        className="min-h-0 flex-1 resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
