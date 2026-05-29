const { recorderApi } = window

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let stream: MediaStream | null = null
let selectedDeviceId: string | null = null

recorderApi.onSetDevice((deviceId) => {
  selectedDeviceId = deviceId || null
  // Zruš cachovaný stream, ať se příště použije nové zařízení
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
  console.log('Mikrofon nastaven:', selectedDeviceId || 'výchozí')
})

async function getStream(): Promise<MediaStream> {
  if (stream) return stream
  const audio: MediaTrackConstraints | boolean = selectedDeviceId
    ? { deviceId: { exact: selectedDeviceId } }
    : true
  stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })
  return stream
}

recorderApi.onStartRecording(async () => {
  try {
    const s = await getStream()
    audioChunks = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''

    mediaRecorder = new MediaRecorder(s, mimeType ? { mimeType } : {})

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType })
      recorderApi.sendAudioData(await blob.arrayBuffer())
    }

    mediaRecorder.start(100) // 100ms chunky
    console.log('Nahrávání spuštěno, formát:', mediaRecorder.mimeType)
    recorderApi.sendRecordingStarted()
  } catch (err) {
    const e = err as Error
    console.error('Chyba přístupu k mikrofonu:', e)
    recorderApi.sendRecordingError({
      code: e?.name || 'RecordStartError',
      message: e?.message || 'Neznámá chyba při startu nahrávání'
    })
  }
})

recorderApi.onStopRecording(() => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
})
