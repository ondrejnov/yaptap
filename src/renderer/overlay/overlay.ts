const { classList } = document.body

window.overlayApi.onRecordingStart(() => {
  classList.remove('transcribing')
  classList.add('active')
})

window.overlayApi.onRecordingStop(() => {
  classList.remove('active')
})

window.overlayApi.onTranscribing(() => {
  classList.remove('active')
  classList.add('transcribing')
})
