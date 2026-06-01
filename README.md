# YapTap

Push-to-talk dictation for developers. Hold a shortcut or pedal, say what you want to write, and YapTap transcribes your speech with AI and inserts the result into the active application.

YapTap is voice input designed for people who write technical text. Instead of dictating into a dedicated window, you hold push-to-talk, speak naturally, and the finished text is inserted directly where your cursor is.

The main difference from regular transcription is context. YapTap can pass a custom prompt, a list of domain-specific words, and optionally screen context to the transcription step. When you dictate variable names, API endpoints, domain terms, or text based on what is open on your monitor, the model gets useful hints before the transcription itself starts.

## What The App Can Do

- **Global push-to-talk**: recording starts by holding a shortcut, not by clicking into a window.
- **Alternative pedal control**: supports gamepad/steering wheel pedals through the Gamepad API, including automatic gas/brake detection or manual axis/button selection.
- **AI transcription via OpenAI**: audio is recorded as WebM/Opus and sent to `gpt-4o-transcribe`.
- **Insertion into the active application**: the result is inserted through the system clipboard and `Ctrl/Cmd+V`; the original clipboard contents are restored afterwards.
- **Screen context**: an optional screenshot is sent to an OpenAI-compatible multimodal LLM endpoint, which extracts keywords and terms for more accurate transcription.
- **Custom transcription prompt**: you can explain to the model what project, language, or domain you are working in.
- **Custom vocabulary**: specific words, names, abbreviations, and technical terms are appended to the transcription prompt.
- **AI post-processing**: the finished transcript can be sent to another OpenAI-compatible model for grammar, punctuation, formatting, or style transformations.
- **External data in post-processing**: the prompt can contain `{{data}}`, which is replaced with text downloaded from a custom URL. Useful for pulling in recently opened IDE files or database table and column names.
- **Audio ducking**: system volume is temporarily lowered to the configured level while recording.
- **Recording status overlay**: a red indicator shows active recording, and a blue spinner shows transcription.
- **Tray menu**: quick access to settings, the current hotkey, quitting the app, and macOS permission repair.
- **Start on login**: the app can start automatically when the system starts.
- **macOS Accessibility flow**: the app checks permissions for global keys and text insertion and can open the correct system settings page.
- **Resilient recorder process**: the hidden recording window is restored after a crash, and microphone/pedal configuration is sent again.

## Workflow

1. YapTap runs in the tray and listens for the global hotkey or pedal state.
2. Holding the shortcut/pedal starts the hidden recorder renderer and shows the overlay.
3. Optionally, a screenshot is captured and a multimodal LLM extracts transcription context from it.
4. Releasing the shortcut/pedal sends the audio to OpenAI transcription.
5. Optionally, the result is further adjusted by the post-processing model.
6. The finished text is inserted into the active application and the original clipboard is restored.

## App Settings

### Recording

- **Microphone**: the default system microphone or a specific input device from `navigator.mediaDevices`.
- **Keyboard shortcut**: platform-specific variants such as `Ctrl+Win`, `Ctrl+Space`, `Alt+Space`, `Shift+Space`, `F8`, `F9`, `F10`, `F12`; on macOS, `Ctrl+Win` is displayed as `Ctrl+Cmd`.
- **Game pedal**: enables or disables pedal control.
- **Pedal device**: the first available gamepad or a specific detected device.
- **Pedal input**: automatic mode prefers gas/brake; alternatively, you can select a specific `button:n` or `axis:n`.
- **Music ducking**: a `0-100%` slider for system volume during recording.

### Transcription

- **Input language**: Czech, English, Slovak, German, or automatic mode.
- **OpenAI API key**: stored in settings or loaded from `OPENAI_API_KEY`.
- **Transcription prompt**: persistent transcription context, such as technologies, project, domain, or dictation style.
- **Custom vocabulary**: a list of terms that should be preferred during transcription.

### Screen Context

- **Enable screenshot context reader**: this feature is opt-in, and screenshots are not captured unless it is enabled.
- **API endpoint**: an OpenAI-compatible `/v1/chat/completions` endpoint or its base URL.
- **Model**: the default value is `google/gemma-4-e4b`, but the field is fully configurable.
- **API key**: optional Bearer token for the endpoint.
- **Screen reader prompt**: instructions for what the model should extract from the screenshot. The default prompt specifically looks for keywords, variable names, and important terms.

### Post-Processing

- **Enable AI transcript editing**: the finished text is sent to another model after transcription.
- **API endpoint**: an OpenAI-compatible chat-completions endpoint.
- **Model**: optional model name; when empty, the request does not send it.
- **API key**: optional Bearer token.
- **External data URL**: YapTap downloads text with `GET` and inserts it into the prompt.
- **Prompt**: system instruction for editing the text. The `{{data}}` placeholder is replaced with data from the external URL.

### Application

- **Start at system login**: stored through `app.setLoginItemSettings`.

## Tech Stack

- **Electron 33**: tray app, windows, IPC, clipboard, and system integration.
- **electron-vite**: build for the main/preload/renderer processes.
- **React 18 + Tailwind CSS**: settings UI.
- **TypeScript**: shared types across the main, preload, and renderer processes.
- **uiohook-napi**: global push-to-talk hotkey.
- **Web Audio / MediaRecorder**: microphone recording in the hidden renderer.
- **OpenAI SDK**: transcription through `gpt-4o-transcribe`.
- **screenshot-desktop**: opt-in screenshot for context.
- **loudness**: temporary system volume ducking.
- **@jitsi/robotjs**: system-level text insertion.

## Project Structure

```text
src/
  shared/    # shared types, shortcuts, default configuration
  main/      # Electron main process
    index.ts         # lifecycle, IPC, app startup
    config.ts        # loading/saving configuration
    shortcuts.ts     # shortcut definitions and mapping
    hotkey.ts        # push-to-talk logic + pedal state
    recording.ts     # ducking, prompt, screenshot, transcription, post-processing, paste
    windows.ts       # overlay, recorder, and settings windows
    tray.ts          # tray icon and menu
    accessibility.ts # macOS Accessibility flow
  preload/   # contextBridge API for settings/overlay/recorder
  renderer/
    settings/  # React settings UI
    overlay/   # recording/transcription indicator
    recorder/  # hidden Web Audio recorder + pedal polling
```

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run typecheck  # type checking for both node and web parts
npm run build      # typecheck + electron-vite build into out/
npm run start      # preview the build
npm run package    # build + electron-builder
```

## Configuration

The OpenAI API key for transcription can be entered in the app settings or through `.env`:

```bash
OPENAI_API_KEY=
```

Application configuration is stored as `config.json` in the Electron `userData` directory. Temporary audio files and the context screenshot are stored in the system temp directory and deleted after processing.

## Platform Notes

- On macOS, the app needs Accessibility permissions for global keys and text insertion.
- The tray menu on macOS includes an item for repairing/opening keyboard permissions.
- Background throttling is disabled for the recorder and overlay so recording and status IPC messages do not respond with a delay.
- Native modules are not bundled by electron-vite, so they are externalized through `externalizeDepsPlugin`.
