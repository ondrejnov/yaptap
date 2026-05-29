import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // Native moduly (uiohook-napi, robotjs, …) nesmí být bundlovány
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/preload/settings.ts'),
          overlay: resolve(__dirname, 'src/preload/overlay.ts'),
          recorder: resolve(__dirname, 'src/preload/recorder.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/renderer/settings/index.html'),
          overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
          recorder: resolve(__dirname, 'src/renderer/recorder/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
