import { execFile } from "node:child_process";
import { dirname, isAbsolute } from "node:path";
import type {
  DynamicContextConfig,
  DynamicContextResult,
} from "../shared/types";

const TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_CONTEXT_CHARS = 8_000;

async function fetchContext(rawUrl: string): Promise<string> {
  if (!rawUrl.trim()) throw new Error("Zadejte URL pro načtení kontextu.");
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Zadejte platnou HTTP nebo HTTPS URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Kontext lze načíst pouze z HTTP nebo HTTPS URL.");
  }

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: abort.signal,
    });
    if (!response.ok) {
      abort.abort();
      throw new Error(`Zdroj kontextu vrátil HTTP ${response.status}.`);
    }
    if (!response.body) return "";

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_OUTPUT_BYTES) {
          abort.abort();
          throw new Error("Výstup zdroje kontextu překročil limit 64 KiB.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Načítání kontextu překročilo časový limit 10 sekund.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function runContextScript(config: DynamicContextConfig): Promise<string> {
  const executable = config.dynamicContextExecutable.trim();
  const scriptPath = config.dynamicContextScriptPath.trim();
  if (!executable) throw new Error("Zadejte program pro spuštění skriptu, např. python.");
  if (!scriptPath || !isAbsolute(scriptPath)) {
    throw new Error("Zadejte absolutní cestu ke skriptu.");
  }
  // Each line is one literal argument; paths with spaces need no quoting.
  const args = config.dynamicContextScriptArgs
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  return new Promise((resolve, reject) => {
    execFile(executable, [scriptPath, ...args], {
      cwd: dirname(scriptPath),
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      shell: false,
      windowsHide: true,
      timeout: TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: MAX_OUTPUT_BYTES,
    }, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout);
        return;
      }
      if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        reject(new Error("Výstup skriptu překročil limit 64 KiB."));
      } else if (error.killed) {
        reject(new Error("Skript překročil časový limit 10 sekund."));
      } else {
        const detail = stderr.trim().slice(0, 500) || error.message;
        reject(new Error(`Skript se nepodařilo spustit nebo skončil chybou: ${detail}`));
      }
    });
  });
}

/** Fresh context for one recording (or an explicit settings preview). */
export async function loadDynamicContext(
  config: DynamicContextConfig,
): Promise<DynamicContextResult> {
  if (!config.dynamicContextEnabled) return { text: "" };
  try {
    let output: string;
    switch (config.dynamicContextSource) {
      case "url":
        output = await fetchContext(config.dynamicContextUrl);
        break;
      case "script":
        output = await runContextScript(config);
        break;
      default:
        throw new Error("Neznámý zdroj dynamického kontextu.");
    }
    const text = output.trim();
    if (!text) throw new Error("Zdroj nevrátil žádný kontext.");
    return {
      text: text.slice(0, MAX_CONTEXT_CHARS),
      truncated: text.length > MAX_CONTEXT_CHARS,
    };
  } catch (error) {
    return {
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
