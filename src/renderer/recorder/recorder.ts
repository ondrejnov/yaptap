const { recorderApi } = window

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let stream: MediaStream | null = null
let selectedDeviceId: string | null = null
let pedalEnabled = false
let pedalGamepadId: string | null = null
let pedalInput = 'auto'
let pedalPressed = false

const axisBaselines = new Map<string, number>()
const GAS_PREFERRED_INPUTS = ['button:7', 'axis:2', 'axis:1', 'axis:5', 'button:6']

function inputValue(gamepad: Gamepad, input: string): number | null {
  const [type, rawIndex] = input.split(':')
  const index = Number(rawIndex)
  if (!Number.isInteger(index)) return null
  if (type === 'button') return gamepad.buttons[index]?.value ?? null
  if (type === 'axis') return gamepad.axes[index] ?? null
  return null
}

function isInputPressed(gamepad: Gamepad, input: string): boolean {
  const value = inputValue(gamepad, input)
  if (value === null) return false

  if (input.startsWith('button:')) {
    const index = Number(input.slice('button:'.length))
    return !!gamepad.buttons[index]?.pressed || value >= 0.5
  }

  const key = `${gamepad.id}:${input}`
  if (!axisBaselines.has(key)) axisBaselines.set(key, value)
  return Math.abs(value - axisBaselines.get(key)!) >= 0.45
}

function candidateInputs(gamepad: Gamepad): string[] {
  const available = new Set<string>()
  gamepad.buttons.forEach((_button, index) => available.add(`button:${index}`))
  gamepad.axes.forEach((_axis, index) => available.add(`axis:${index}`))

  const preferred = GAS_PREFERRED_INPUTS.filter((input) => available.has(input))
  const rest = [...available].filter((input) => !GAS_PREFERRED_INPUTS.includes(input))
  return [...preferred, ...rest]
}

function selectedGamepad(): Gamepad | null {
  const gamepads = navigator.getGamepads().filter((g): g is Gamepad => !!g)
  return gamepads.find((g) => !pedalGamepadId || g.id === pedalGamepadId) ?? null
}

function pollPedal(): void {
  const gamepad = pedalEnabled ? selectedGamepad() : null
  const pressed = !!gamepad && (pedalInput === 'auto'
    ? candidateInputs(gamepad).some((input) => isInputPressed(gamepad, input))
    : isInputPressed(gamepad, pedalInput))

  if (pressed !== pedalPressed) {
    pedalPressed = pressed
    recorderApi.sendPedalState(pressed)
  }
}

recorderApi.onSetDevice((deviceId) => {
  selectedDeviceId = deviceId || null
  // Zruš cachovaný stream, ať se příště použije nové zařízení
  resetStream()
  console.log('Mikrofon nastaven:', selectedDeviceId || 'výchozí')
})

recorderApi.onSetPedalConfig((config) => {
  pedalEnabled = config.enabled
  pedalGamepadId = config.gamepadId || null
  pedalInput = config.input || 'auto'
  axisBaselines.clear()
  if (!pedalEnabled && pedalPressed) {
    pedalPressed = false
    recorderApi.sendPedalState(false)
  }
  console.log('Pedál nastaven:', pedalEnabled ? `${pedalGamepadId || 'libovolný'} / ${pedalInput}` : 'vypnuto')
})

setInterval(pollPedal, 16)

function isRecordingActive(): boolean {
  return !!mediaRecorder && mediaRecorder.state !== 'inactive'
}

function resetStream(): void {
  if (!stream) return
  stream.getTracks().forEach((t) => t.stop())
  stream = null
}

function hasUsableAudioTrack(s: MediaStream): boolean {
  return s.active && s.getAudioTracks().some((track) => track.readyState === 'live')
}

function watchStream(s: MediaStream): void {
  s.getTracks().forEach((track) => {
    track.onended = () => {
      if (stream === s) stream = null
    }
  })
}

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  if (!isRecordingActive()) resetStream()
})

async function getStream(): Promise<MediaStream> {
  if (stream && hasUsableAudioTrack(stream)) return stream
  resetStream()
  const audio: MediaTrackConstraints | boolean = selectedDeviceId
    ? { deviceId: { exact: selectedDeviceId } }
    : true
  stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })
  watchStream(stream)
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

recorderApi.sendRecorderReady()
