# YapTap

Push-to-talk diktování pro vývojáře. Podrž zkratku nebo pedál, řekni, co chceš napsat, YapTap řeč přepíše pomocí AI a vloží výsledek do aktivní aplikace.

YapTap je hlasový vstup navržený pro lidi, kteří píšou technický text. Místo diktování do speciálního okna držíš push-to-talk, mluvíš přirozeně a hotový text se vloží přímo tam, kde máš kurzor.

Hlavní rozdíl proti běžné transkripci je kontext. YapTap umí přepisu předat vlastní prompt, seznam specifických slov a volitelně i kontext z obrazovky. Když diktuješ názvy proměnných, API endpointy, doménové termíny nebo text podle toho, co máš otevřené na monitoru, model dostane nápovědu ještě před samotným přepisem.

## Co Aplikace Umí

- **Globální push-to-talk**: nahrávání se spouští podržením zkratky, ne kliknutím do okna.
- **Alternativní ovládání pedálem**: podporuje gamepad/volant pedály přes Gamepad API, včetně automatické detekce plynu/brzdy nebo ruční volby osy/tlačítka.
- **AI transkripce přes OpenAI**: audio se nahrává jako WebM/Opus a posílá na `gpt-4o-transcribe`.
- **Vložení do aktivní aplikace**: výsledek se vloží přes systémovou schránku a `Ctrl/Cmd+V`; původní obsah schránky se následně obnoví.
- **Kontext z obrazovky**: volitelný screenshot se pošle do OpenAI-kompatibilního multimodálního LLM endpointu, který vytáhne klíčová slova a termíny pro přesnější přepis.
- **Vlastní prompt pro transkripci**: můžeš modelu vysvětlit, v jakém projektu, jazyce nebo doménové oblasti pracuješ.
- **Vlastní slovník**: specifická slova, jména, zkratky a technické termíny se připojí k promptu pro přepis.
- **AI post-processing**: hotový přepis lze poslat do dalšího OpenAI-kompatibilního modelu na opravu gramatiky, interpunkce, formátování nebo transformaci stylu.
- **Externí data v post-processingu**: prompt může obsahovat `{{data}}`, který se nahradí textem staženým z vlastní URL. Vhodné pro dotažení posledních otevřených souborů z IDE, jména databázých tabulek a sloupců.
- **Audio ducking**: během nahrávání se systémová hlasitost dočasně sníží na nastavenou úroveň.
- **Overlay stav nahrávání**: červený indikátor ukazuje aktivní nahrávání, modrý spinner přepis.
- **Tray menu**: rychlý přístup k nastavení, aktuální hotkey, ukončení aplikace a macOS opravě oprávnění.
- **Start po přihlášení**: aplikaci lze spouštět automaticky po startu systému.
- **macOS Accessibility flow**: aplikace kontroluje oprávnění pro globální klávesy a vkládání textu a umí otevřít správné systémové nastavení.
- **Odolný recorder proces**: skryté okno pro nahrávání se při pádu obnoví a konfigurace mikrofonu/pedálu se posílá znovu.

## Jak Vypadá Workflow

1. YapTap běží v tray a poslouchá globální hotkey nebo stav pedálu.
2. Při podržení zkratky/pedálu se spustí skrytý recorder renderer a ukáže se overlay.
3. Volitelně se pořídí screenshot a multimodální LLM z něj vytáhne kontext pro přepis.
4. Po puštění zkratky/pedálu se audio pošle do OpenAI transkripce.
5. Volitelně se výsledek ještě upraví přes post-processing model.
6. Hotový text se vloží do aktivní aplikace a původní schránka se obnoví.

## Nastavení V Aplikaci

### Nahrávání

- **Mikrofon**: výchozí systémový mikrofon nebo konkrétní vstupní zařízení z `navigator.mediaDevices`.
- **Klávesová zkratka**: dostupné varianty podle platformy, např. `Ctrl+Win`, `Ctrl+Space`, `Alt+Space`, `Shift+Space`, `F8`, `F9`, `F10`, `F12`; na macOS se `Ctrl+Win` zobrazuje jako `Ctrl+Cmd`.
- **Herní pedál**: zapnutí/vypnutí pedálového ovládání.
- **Zařízení pedálu**: první dostupný gamepad nebo konkrétní detekované zařízení.
- **Vstup pedálu**: automatický režim preferuje plyn/brzdu, případně lze vybrat konkrétní `button:n` nebo `axis:n`.
- **Ztlumení hudby**: slider `0-100 %` pro systémovou hlasitost během nahrávání.

### Přepis

- **Jazyk vstupu**: čeština, angličtina, slovenština, němčina nebo automatický režim.
- **OpenAI API klíč**: uložený v nastavení nebo načtený z `OPENAI_API_KEY`.
- **Prompt pro transkripci**: trvalý kontext pro přepis, např. technologie, projekt, doména nebo styl diktování.
- **Vlastní slovíčka**: seznam termínů, které se mají při přepisu preferovat.

### Kontext Z Obrazovky

- **Zapnutí screenshot context readeru**: funkce je opt-in a bez zapnutí se screenshoty nepořizují.
- **API endpoint**: OpenAI-kompatibilní `/v1/chat/completions` endpoint nebo jeho base URL.
- **Model**: výchozí hodnota je `google/gemma-4-e4b`, ale pole je plně konfigurovatelné.
- **API klíč**: volitelný Bearer token pro endpoint.
- **Prompt pro screen reader**: instrukce, co má model ze screenshotu vytáhnout. Výchozí prompt cíleně hledá klíčová slova, názvy proměnných a důležité termíny.

### Post-Processing

- **Zapnutí AI úpravy přepisu**: hotový text se pošle do dalšího modelu až po transkripci.
- **API endpoint**: OpenAI-kompatibilní chat-completions endpoint.
- **Model**: volitelný název modelu; když je prázdný, request ho neposílá.
- **API klíč**: volitelný Bearer token.
- **Externí data URL**: YapTap stáhne text přes `GET` a vloží ho do promptu.
- **Prompt**: systémová instrukce pro úpravu textu. Placeholder `{{data}}` se nahradí daty z externí URL.

### Aplikace

- **Spustit při startu systému**: ukládá se přes `app.setLoginItemSettings`.


## Technický Stack

- **Electron 33**: tray aplikace, okna, IPC, clipboard, systémová integrace.
- **electron-vite**: build main/preload/renderer procesu.
- **React 18 + Tailwind CSS**: UI nastavení.
- **TypeScript**: sdílené typy mezi main, preload a renderer procesy.
- **uiohook-napi**: globální push-to-talk hotkey.
- **Web Audio / MediaRecorder**: nahrávání mikrofonu ve skrytém rendereru.
- **OpenAI SDK**: transkripce přes `gpt-4o-transcribe`.
- **screenshot-desktop**: opt-in screenshot pro kontext.
- **loudness**: dočasné ztlumení systémové hlasitosti.
- **@jitsi/robotjs**: systémové vložení textu.

## Struktura Projektu

```text
src/
  shared/    # sdílené typy, shortcuty, výchozí konfigurace
  main/      # Electron main proces
    index.ts         # lifecycle, IPC, start aplikace
    config.ts        # načítání/ukládání konfigurace
    shortcuts.ts     # definice a mapování zkratek
    hotkey.ts        # push-to-talk logika + pedal state
    recording.ts     # ducking, prompt, screenshot, transkripce, post-processing, paste
    windows.ts       # overlay, recorder a settings okna
    tray.ts          # tray ikona a menu
    accessibility.ts # macOS Accessibility flow
  preload/   # contextBridge API pro settings/overlay/recorder
  renderer/
    settings/  # React UI nastavení
    overlay/   # indikátor nahrávání/přepisu
    recorder/  # skrytý Web Audio recorder + pedal polling
```

## Spuštění Pro Vývoj

```bash
npm install
npm run dev
```

Užitečné příkazy:

```bash
npm run typecheck  # kontrola typů pro node i web část
npm run build      # typecheck + electron-vite build do out/
npm run start      # preview buildu
npm run package    # build + electron-builder
```

## Konfigurace

OpenAI API klíč pro transkripci lze zadat v nastavení aplikace nebo přes `.env`:

```bash
OPENAI_API_KEY=
```

Konfigurace aplikace se ukládá jako `config.json` do Electron `userData` adresáře. Dočasné audio soubory a screenshot pro kontext se ukládají do systémového temp adresáře a po zpracování se mažou.

## Platformní Poznámky

- Na macOS aplikace potřebuje Accessibility oprávnění kvůli globálním klávesám a vkládání textu.
- Tray menu na macOS obsahuje položku pro opravu/otevření oprávnění kláves.
- Recorder a overlay mají vypnuté background throttling, aby nahrávání a stavové IPC zprávy nereagovaly se zpožděním.
- Native moduly se v electron-vite nebundlují, proto jsou externalizované přes `externalizeDepsPlugin`.
