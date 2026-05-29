# yaptap

Push-to-talk hlasový vstup s AI transkripcí. Drž klávesovou zkratku, mluv, a přepsaný
text se vloží do aktivního okna. Postaveno na Electronu + React + Tailwind + TypeScript
přes [electron-vite](https://electron-vite.org/).

## Jak to funguje
1. Globální hotkey (push-to-talk) je odchytáván přes `uiohook-napi` – drž zkratku pro nahrávání.
2. Skrytý *recorder* renderer nahrává mikrofon přes Web Audio API (WebM/Opus).
3. Volitelně se pořídí screenshot a lokální LLM z něj vytáhne kontext pro přesnější přepis.
4. Audio se pošle do OpenAI (`gpt-4o-transcribe`) a výsledný text se vloží přes schránku + Ctrl/Cmd+V.
5. Během nahrávání/přepisu se zobrazuje malý overlay indikátor a hlasitost systému se ztlumí (ducking).

## Stack
- **Electron** + **electron-vite** — shell, dev server, bundling main/preload/renderer
- **React 18** + **Tailwind CSS** — okno nastavení
- **TypeScript** napříč všemi procesy
- `uiohook-napi` (globální zkratky), `@jitsi/robotjs` (vkládání textu),
  `loudness` (ducking), `screenshot-desktop`, `openai`

## Struktura
```
src/
  shared/    # sdílené typy a data (AppConfig, zkratky) – bez nativních importů
  main/      # hlavní proces, rozdělený do modulů:
    index.ts         # životní cyklus aplikace + IPC
    config.ts        # načítání/ukládání konfigurace
    shortcuts.ts     # definice zkratek + mapování na uiohook klávesy
    hotkey.ts        # push-to-talk přes uiohook
    recording.ts     # ducking, screenshot+LLM prompt, transkripce, vložení textu
    windows.ts       # overlay / recorder / settings okna
    tray.ts          # ikona v liště
    accessibility.ts # oprávnění Accessibility na macOS
  preload/   # contextBridge API pro každé okno (settings/overlay/recorder)
  renderer/
    settings/  # React UI nastavení
    overlay/   # indikátor nahrávání
    recorder/  # skrytý Web Audio recorder
```

## Spuštění
```bash
npm install
npm run dev        # spustí aplikaci s HMR
npm run typecheck  # kontrola typů všech procesů
npm run build      # typecheck + bundle do out/
npm run package    # build + electron-builder
```

## Konfigurace
OpenAI API klíč nastav v okně **Nastavení** (tray → Nastavení…), nebo přes proměnnou
`OPENAI_API_KEY` v souboru `.env` (viz `.env.example`). Konfigurace se ukládá do
`config.json` v `userData` adresáři aplikace.
