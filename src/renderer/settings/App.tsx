import { useEffect, useState } from "react";
import {
  LANGUAGES,
  SHORTCUT_OPTIONS,
  type AppConfig,
} from "../../shared/types";

type TabId =
  | "recording"
  | "transcription"
  | "context"
  | "postprocessing"
  | "app";

interface MicDevice {
  deviceId: string;
  label: string;
}

// ─── Sdílené UI prvky ──────────────────────────────────────────────────────────
function Row({
  children,
  column = false,
}: {
  children: React.ReactNode;
  column?: boolean;
}): JSX.Element {
  return (
    <div
      className={`flex border-b border-slate-100 py-3 last:border-b-0 ${
        column
          ? "flex-col items-start gap-1.5"
          : "items-center justify-between gap-4"
      }`}
    >
      {children}
    </div>
  );
}

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}): JSX.Element {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-slate-700">
      {children}
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mb-6">
      <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
      {description && (
        <p className="mt-0.5 text-[12px] text-slate-400">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const inputClass =
  "w-[220px] rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const textareaClass =
  "w-full resize-y rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-slate-300"}`}
    >
      <span
        className={`absolute bottom-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

// ─── Hlavní komponenta ──────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const platform = window.settingsApi.platform;
  const isMac = platform === "darwin";

  const [tab, setTab] = useState<TabId>("recording");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const [status, setStatus] = useState("Čekám na přístup…");
  const [statusError, setStatusError] = useState(false);
  const [ready, setReady] = useState(false);

  const shortcutOptions = SHORTCUT_OPTIONS.filter((o) =>
    o.platforms.includes(platform),
  );

  useEffect(() => {
    void (async () => {
      const cfg = await window.settingsApi.getConfig();
      setConfig(cfg);
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        tmp.getTracks().forEach((t) => t.stop());
        const all = await navigator.mediaDevices.enumerateDevices();
        const inputs = all
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Mikrofon ${i + 1}`,
          }));
        setDevices(inputs);
        setStatus(
          `Nalezeno ${inputs.length} mikrofon${inputs.length === 1 ? "" : inputs.length < 5 ? "y" : "ů"}`,
        );
        setStatusError(false);
        setReady(true);
      } catch (err) {
        setStatus(`Chyba: ${(err as Error).message}`);
        setStatusError(true);
      }
    })();
  }, []);

  function update<K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K],
  ): void {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(): Promise<void> {
    if (!config) return;
    await window.settingsApi.saveSettings(config);
    window.close();
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-slate-500">
        Načítám nastavení…
      </div>
    );
  }

  const nav: { id: TabId; label: string; icon: string }[] = [
    { id: "recording", label: "Nahrávání", icon: "🎙" },
    { id: "transcription", label: "Přepis", icon: "✍️" },
    { id: "context", label: "Kontext z obrazovky", icon: "🖼" },
    { id: "postprocessing", label: "Post processing", icon: "✨" },
    { id: "app", label: "Aplikace", icon: "⚙️" },
  ];

  const activeNav = nav.find((n) => n.id === tab)!;

  return (
    <div className="flex h-screen bg-white text-slate-800">
      {/* ─── Sidebar ─── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-lg"></span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-800">
            YapTap
          </span>
        </div>
        <nav className="flex-1 px-2">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition ${
                tab === n.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <span className="text-[15px] leading-none">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 text-[11px] text-slate-400">
          Push-to-talk · AI transkripce
        </div>
      </aside>

      {/* ─── Obsah ─── */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center border-b border-slate-200 px-7 py-4">
          <h1 className="flex items-center gap-2 text-[16px] font-semibold text-slate-800">
            <span>{activeNav.icon}</span>
            {activeNav.label}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-7 py-5">
          {tab === "recording" && (
            <>
              <Section
                title="Mikrofon"
                description="Vstupní zařízení použité pro nahrávání řeči."
              >
                <Row column>
                  <select
                    id="mic-select"
                    disabled={!ready}
                    value={config.deviceId ?? ""}
                    onChange={(e) => update("deviceId", e.target.value || null)}
                    className={`${inputClass} w-full max-w-md`}
                  >
                    <option value="">Výchozí (systémový mikrofon)</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className={`mt-1 text-[11px] ${statusError ? "text-red-500" : "text-slate-400"}`}
                  >
                    {status}
                  </div>
                </Row>
              </Section>

              <Section
                title="Ovládání"
                description="Jak spustit a co se stane během nahrávání."
              >
                <Row>
                  <Label htmlFor="shortcut">Klávesová zkratka</Label>
                  <select
                    id="shortcut"
                    value={config.shortcut}
                    onChange={(e) =>
                      update(
                        "shortcut",
                        e.target.value as AppConfig["shortcut"],
                      )
                    }
                    className={inputClass}
                  >
                    {shortcutOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {isMac ? o.macLabel || o.label : o.label}
                      </option>
                    ))}
                  </select>
                </Row>

                <Row>
                  <Label htmlFor="ducking">Ztlumit hudbu</Label>
                  <div className="flex items-center gap-2.5">
                    <input
                      id="ducking"
                      type="range"
                      min={0}
                      max={100}
                      value={config.duckingVolume}
                      onChange={(e) =>
                        update("duckingVolume", parseInt(e.target.value, 10))
                      }
                      className="w-[150px]"
                    />
                    <span className="w-8 text-right text-[13px]">
                      {config.duckingVolume}%
                    </span>
                  </div>
                </Row>
              </Section>
            </>
          )}

          {tab === "transcription" && (
            <>
              <Section
                title="Jazyk a přístup"
                description="Jak se zvuk převádí na text přes OpenAI."
              >
                <Row>
                  <Label htmlFor="lang">Jazyk vstupu</Label>
                  <select
                    id="lang"
                    value={config.language}
                    onChange={(e) => update("language", e.target.value)}
                    className={inputClass}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Row>

                <Row>
                  <Label htmlFor="api-key">OpenAI API Klíč</Label>
                  <input
                    id="api-key"
                    type="password"
                    placeholder="sk-…"
                    value={config.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    className={inputClass}
                  />
                </Row>
              </Section>

              <Section
                title="Kontext přepisu"
                description="Pomocný kontext pro přesnější přepis řeči."
              >
                <Row column>
                  <Label htmlFor="fixed-prompt">Prompt pro transkripci</Label>
                  <textarea
                    id="fixed-prompt"
                    rows={4}
                    placeholder="Kontext pro přepis, např. 'Programuji v TypeScriptu, React, Node.js…'"
                    value={config.fixedPrompt}
                    onChange={(e) => update("fixedPrompt", e.target.value)}
                    className={textareaClass}
                  />
                </Row>

                <Row column>
                  <Label htmlFor="custom-words">Vlastní slovíčka</Label>
                  <textarea
                    id="custom-words"
                    rows={3}
                    placeholder="Specifická slova, jména nebo zkratky oddělené čárkou…"
                    value={config.customWords}
                    onChange={(e) => update("customWords", e.target.value)}
                    className={textareaClass}
                  />
                </Row>
              </Section>
            </>
          )}

          {tab === "context" && (
            <Section
              title="Screenshot context reader"
              description="AI model čte obrazovku a doplňuje kontext pro přepis."
            >
              <Row>
                <Label htmlFor="screenshot-enabled">Zapnout</Label>
                <Toggle
                  checked={config.screenshotEnabled}
                  onChange={(v) => update("screenshotEnabled", v)}
                />
              </Row>

              {config.screenshotEnabled && (
                <>
                  <Row>
                    <Label htmlFor="llm-url">API endpoint</Label>
                    <input
                      id="llm-url"
                      type="text"
                      placeholder="http://10.0.0.232:1234"
                      value={config.llmUrl}
                      onChange={(e) => update("llmUrl", e.target.value)}
                      className={inputClass}
                    />
                  </Row>
                  <Row>
                    <Label htmlFor="screenshot-api-key">API klíč</Label>
                    <input
                      id="screenshot-api-key"
                      type="password"
                      placeholder="Volitelné (sk-…)"
                      value={config.screenshotApiKey}
                      onChange={(e) =>
                        update("screenshotApiKey", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Row>
                  <Row>
                    <Label htmlFor="screenshot-model">Model</Label>
                    <input
                      id="screenshot-model"
                      type="text"
                      placeholder="google/gemma-4-e4b"
                      value={config.screenshotModel}
                      onChange={(e) =>
                        update("screenshotModel", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Row>
                  <Row column>
                    <Label htmlFor="llm-prompt">Prompt pro screen reader</Label>
                    <textarea
                      id="llm-prompt"
                      rows={3}
                      value={config.llmPrompt}
                      onChange={(e) => update("llmPrompt", e.target.value)}
                      className={textareaClass}
                    />
                  </Row>
                </>
              )}
            </Section>
          )}

          {tab === "postprocessing" && (
            <Section
              title="Post processing přepisu"
              description="Hotový přepis se ještě pošle přes další AI model k úpravě (např. oprava gramatiky, formátování)."
            >
              <Row>
                <Label htmlFor="postprocess-enabled">Zapnout</Label>
                <Toggle
                  checked={config.postProcessEnabled}
                  onChange={(v) => update("postProcessEnabled", v)}
                />
              </Row>

              {config.postProcessEnabled && (
                <>
                  <Row>
                    <Label htmlFor="postprocess-url">API endpoint</Label>
                    <input
                      id="postprocess-url"
                      type="text"
                      placeholder="http://10.0.0.232:1234"
                      value={config.postProcessUrl}
                      onChange={(e) => update("postProcessUrl", e.target.value)}
                      className={inputClass}
                    />
                  </Row>
                  <Row>
                    <Label htmlFor="postprocess-api-key">API klíč</Label>
                    <input
                      id="postprocess-api-key"
                      type="password"
                      placeholder="Volitelné (sk-…)"
                      value={config.postProcessApiKey}
                      onChange={(e) =>
                        update("postProcessApiKey", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Row>
                  <Row>
                    <Label htmlFor="postprocess-model">Model</Label>
                    <input
                      id="postprocess-model"
                      type="text"
                      placeholder="meta-llama/llama-3.1-8b"
                      value={config.postProcessModel}
                      onChange={(e) =>
                        update("postProcessModel", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Row>
                  <Row>
                    <Label htmlFor="postprocess-fetch-url">
                      Externí data (URL)
                    </Label>
                    <input
                      id="postprocess-fetch-url"
                      type="text"
                      placeholder="Volitelné – https://…"
                      value={config.postProcessFetchUrl}
                      onChange={(e) =>
                        update("postProcessFetchUrl", e.target.value)
                      }
                      className={inputClass}
                    />
                  </Row>
                  <Row column>
                    <Label htmlFor="postprocess-prompt">Prompt</Label>
                    <textarea
                      id="postprocess-prompt"
                      rows={4}
                      value={config.postProcessPrompt}
                      onChange={(e) =>
                        update("postProcessPrompt", e.target.value)
                      }
                      className={textareaClass}
                    />
                    <div className="mt-1 text-[11px] text-slate-400">
                      Zástupný znak{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
                        {"{{data}}"}
                      </code>{" "}
                      v promptu se nahradí daty načtenými z URL výše.
                    </div>
                  </Row>
                </>
              )}
            </Section>
          )}

          {tab === "app" && (
            <Section
              title="Systém"
              description="Chování aplikace v operačním systému."
            >
              <Row>
                <Label htmlFor="open-at-login">Spustit při startu systému</Label>
                <Toggle
                  checked={config.openAtLogin}
                  onChange={(v) => update("openAtLogin", v)}
                />
              </Row>
            </Section>
          )}
        </main>

        {/* ─── Patička ─── */}
        <footer className="flex justify-end gap-2.5 border-t border-slate-200 px-7 py-3.5">
          <button
            onClick={() => window.close()}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[13px] text-slate-700 transition hover:bg-slate-100"
          >
            Zrušit
          </button>
          <button
            onClick={save}
            disabled={!ready}
            className="rounded-md border border-blue-500 bg-blue-500 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Uložit
          </button>
        </footer>
      </div>
    </div>
  );
}
