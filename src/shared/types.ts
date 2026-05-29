// Sdílené typy a data používané v main, preload i renderer procesech.
// Nesmí obsahovat žádné importy nativních/electron modulů.

export type Shortcut =
  | "Ctrl+Win"
  | "Ctrl+Space"
  | "Ctrl+M"
  | "Cmd+M"
  | "Alt+Space"
  | "Shift+Space"
  | "F8"
  | "F9"
  | "F10"
  | "F12";

export interface AppConfig {
  deviceId: string | null;
  openAtLogin: boolean;
  duckingVolume: number;
  language: string;
  shortcut: Shortcut;
  apiKey: string;
  llmUrl: string;
  screenshotApiKey: string;
  screenshotEnabled: boolean;
  screenshotModel: string;
  fixedPrompt: string;
  customWords: string;
  llmPrompt: string;
  postProcessEnabled: boolean;
  postProcessUrl: string;
  postProcessApiKey: string;
  postProcessModel: string;
  postProcessPrompt: string;
  postProcessFetchUrl: string;
}

export interface ShortcutOption {
  value: Shortcut;
  label: string;
  macLabel?: string;
  platforms: NodeJS.Platform[];
}

export const SHORTCUT_OPTIONS: ShortcutOption[] = [
  {
    value: "Ctrl+Win",
    label: "Ctrl + Win",
    macLabel: "Ctrl + Cmd",
    platforms: ["win32", "linux", "darwin"],
  },
  {
    value: "Ctrl+Space",
    label: "Ctrl + Mezerník",
    platforms: ["win32", "linux"],
  },
  { value: "Ctrl+M", label: "Ctrl + M", platforms: ["win32", "linux"] },
  {
    value: "Alt+Space",
    label: "Alt + Mezerník",
    macLabel: "Option + Mezerník",
    platforms: ["win32", "linux", "darwin"],
  },
  {
    value: "Shift+Space",
    label: "Shift + Mezerník",
    platforms: ["win32", "linux", "darwin"],
  },
  { value: "F8", label: "F8", platforms: ["win32", "linux", "darwin"] },
  { value: "F9", label: "F9", platforms: ["win32", "linux", "darwin"] },
  { value: "F10", label: "F10", platforms: ["win32", "linux", "darwin"] },
  { value: "F12", label: "F12", platforms: ["win32", "linux", "darwin"] },
];

export const LANGUAGES = [
  { value: "cs", label: "Čeština" },
  { value: "en", label: "Angličtina" },
  { value: "sk", label: "Slovenština" },
  { value: "de", label: "Němčina" },
  { value: "auto", label: "Automaticky" },
];

export const DEFAULT_CONFIG: AppConfig = {
  deviceId: null,
  openAtLogin: false,
  duckingVolume: 5,
  language: "cs",
  shortcut: "Ctrl+Win",
  apiKey: "",
  llmUrl: "http://10.0.0.232:1234",
  screenshotApiKey: "",
  screenshotEnabled: false,
  screenshotModel: "google/gemma-4-e4b",
  fixedPrompt: "",
  customWords: "",
  llmPrompt:
    "Extrahuj z obrázku klíčové slova, názvy proměnných a důležité termíny. " +
    "Bude to krátký kontext pro speak-to-text model. Max 350 tokenů.",
  postProcessEnabled: false,
  postProcessUrl: "http://10.0.0.232:1234",
  postProcessApiKey: "",
  postProcessModel: "",
  postProcessPrompt:
    "Uprav následující přepsaný text: oprav gramatiku, interpunkci a překlepy. " +
    "Zachovej původní význam i jazyk. Vrať pouze upravený text bez jakéhokoli komentáře.",
  postProcessFetchUrl: "",
};
