import { useState } from "react";
import type { DynamicContextConfig, DynamicContextResult } from "../../shared/types";

const fieldClass =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "text-[13px] font-medium text-slate-700";

export default function DynamicContextSettings({
  config,
  onChange,
}: {
  config: DynamicContextConfig;
  onChange: (patch: Partial<DynamicContextConfig>) => void;
}): JSX.Element {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<DynamicContextResult | null>(null);

  function update(patch: Partial<DynamicContextConfig>): void {
    setResult(null);
    onChange(patch);
  }

  async function testContext(): Promise<void> {
    setTesting(true);
    setResult(null);
    try {
      setResult(await window.settingsApi.testDynamicContext({
        dynamicContextEnabled: config.dynamicContextEnabled,
        dynamicContextSource: config.dynamicContextSource,
        dynamicContextUrl: config.dynamicContextUrl,
        dynamicContextExecutable: config.dynamicContextExecutable,
        dynamicContextScriptPath: config.dynamicContextScriptPath,
        dynamicContextScriptArgs: config.dynamicContextScriptArgs,
      }));
    } catch (error) {
      setResult({ text: "", error: error instanceof Error ? error.message : String(error) });
    } finally {
      setTesting(false);
    }
  }

  const canTest = config.dynamicContextSource === "url"
    ? !!config.dynamicContextUrl.trim()
    : !!config.dynamicContextExecutable.trim() && !!config.dynamicContextScriptPath.trim();

  return (
    <div className="space-y-3 pt-3">
      <p className="text-[12px] text-slate-500">
        Při každém začátku nahrávání se načte čerstvý kontext a přidá se
        k promptu i vlastním slovíčkům. Při chybě bude přepis pokračovat bez něj.
      </p>
      <fieldset disabled={testing} className="space-y-3 disabled:opacity-60">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="dynamic-context-source" className={labelClass}>Zdroj kontextu</label>
          <select
            id="dynamic-context-source"
            value={config.dynamicContextSource}
            onChange={(e) => update({ dynamicContextSource: e.target.value as DynamicContextConfig["dynamicContextSource"] })}
            className={`${fieldClass} max-w-[220px]`}
          >
            <option value="url">URL</option>
            <option value="script">Skript</option>
          </select>
        </div>
        {config.dynamicContextSource === "url" ? (
          <div className="space-y-1.5">
            <label htmlFor="dynamic-context-url" className={labelClass}>URL kontextu</label>
            <input
              id="dynamic-context-url"
              type="url"
              placeholder="http://localhost:3030/context"
              value={config.dynamicContextUrl}
              onChange={(e) => update({ dynamicContextUrl: e.target.value })}
              className={fieldClass}
            />
            <p className="text-[11px] text-slate-500">
              Adresa má vracet text v UTF-8, například seznam slov oddělených čárkami nebo řádky.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="dynamic-context-executable" className={labelClass}>Program / interpret</label>
              <input
                id="dynamic-context-executable"
                type="text"
                placeholder="python, python3 nebo úplná cesta k python.exe"
                value={config.dynamicContextExecutable}
                onChange={(e) => update({ dynamicContextExecutable: e.target.value })}
                className={fieldClass}
              />
              <p className="text-[11px] text-slate-500">
                Můžete zadat i interpret z virtuálního prostředí nebo jiný program, například node.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dynamic-context-script" className={labelClass}>Cesta ke skriptu</label>
              <input
                id="dynamic-context-script"
                type="text"
                placeholder={window.settingsApi.platform === "win32" ? "C:\\skripty\\kontext.py" : "/Users/jmeno/skripty/kontext.py"}
                value={config.dynamicContextScriptPath}
                onChange={(e) => update({ dynamicContextScriptPath: e.target.value })}
                className={fieldClass}
              />
              <p className="text-[11px] text-slate-500">
                Absolutní cesta bez uvozovek. Skript poběží ve své složce.
                Kontext vypište na standardní výstup, v Pythonu pomocí print(...).
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dynamic-context-args" className={labelClass}>Argumenty skriptu (volitelné)</label>
              <textarea
                id="dynamic-context-args"
                rows={3}
                placeholder={"--limit\n30"}
                value={config.dynamicContextScriptArgs}
                onChange={(e) => update({ dynamicContextScriptArgs: e.target.value })}
                className={`${fieldClass} resize-y`}
              />
              <p className="text-[11px] text-slate-500">
                Každý argument na samostatný řádek, bez obalujících uvozovek i u cest s mezerami.
              </p>
            </div>
          </>
        )}
        <button
          type="button"
          disabled={!canTest || testing}
          onClick={() => void testContext()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? "Načítám kontext…" : "Vyzkoušet a zobrazit kontext"}
        </button>
      </fieldset>
      <div aria-live="polite">
        {result && (result.error ? (
          <p role="alert" className="select-text whitespace-pre-wrap break-words text-[12px] text-red-600">{result.error}</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-slate-700">Načtený kontext</p>
            <pre className="max-h-48 select-text overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[12px] text-slate-700">{result.text}</pre>
            {result.truncated && <p className="text-[11px] text-slate-500">Kontext byl zkrácen na prvních 8 000 znaků.</p>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Časový limit je 10 sekund. Do promptu se přidá nejvýše 8 000 znaků.
        Zkouška použije právě vyplněné hodnoty; pro další nahrávání nastavení uložte.
      </p>
    </div>
  );
}
