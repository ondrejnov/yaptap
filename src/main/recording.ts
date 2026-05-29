import { app, clipboard } from "electron";
import { join } from "path";
import {
  createReadStream,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import loudness from "loudness";
import screenshot from "screenshot-desktop";
import { OpenAI } from "openai";
import { getConfig } from "./config";
import {
  ensureOverlay,
  ensureRecorder,
  getOverlay,
  getRecorder,
  hideOverlay,
  safeSend,
  showOverlay,
} from "./windows";
import { setTrayActive, setTrayError } from "./tray";

let isRecording = false;
let savedVolume: number | null = null;
let currentPromptPromise: Promise<string> | null = null;

export function getIsRecording(): boolean {
  return isRecording;
}

export function setIsRecording(value: boolean): void {
  isRecording = value;
}

// ─── Ztlumení (ducking) hlasitosti ───────────────────────────────────────────
async function duckVolume(): Promise<void> {
  try {
    const current = await loudness.getVolume();
    savedVolume = current;
    await loudness.setVolume(getConfig().duckingVolume ?? 5);
  } catch (e) {
    console.error(
      "Hlasitost – chyba při čtení/nastavení:",
      (e as Error).message,
    );
  }
}

async function restoreVolume(): Promise<void> {
  if (savedVolume === null) return;
  const level = savedVolume;
  savedVolume = null;
  try {
    await loudness.setVolume(level);
  } catch (e) {
    console.error("Hlasitost – chyba při obnovení:", (e as Error).message);
  }
}

// ─── Sestavení promptu (fixní + kontext ze screenshotu) ──────────────────────
async function buildPrompt(): Promise<string> {
  const config = getConfig();
  const basePrompt = config.fixedPrompt || "";

  if (config.screenshotEnabled === false) {
    console.log("Screenshot vypnut, používám fixní prompt.");
    return basePrompt;
  }

  try {
    const screenshotPath = join(app.getPath("temp"), "yaptap-screenshot.png");
    await screenshot({ filename: screenshotPath });
    if (!existsSync(screenshotPath)) return basePrompt;

    const base64Image = readFileSync(screenshotPath).toString("base64");
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 30000);

    let res: Response;
    try {
      res = await fetch(`${config.llmUrl}/v1/chat/completions`, {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.screenshotModel || "google/gemma-4-e4b",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: config.llmPrompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${base64Image}` },
                },
              ],
            },
          ],
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error("Chyba z LLM:", await res.text());
      return basePrompt;
    }

    const data = (await res.json()) as {
      choices?: { message: { content: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return basePrompt;

    const screenshotContext = `Na screenshotu je vidět: ${content}`;
    return basePrompt
      ? `${basePrompt}\n\n${screenshotContext}`
      : screenshotContext;
  } catch (err) {
    console.error("Chyba při pořizování/zpracování screenshotu:", err);
    return basePrompt;
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
export function startRecording(): void {
  console.log("▶ Start nahrávání");

  const recorder = ensureRecorder();
  if (!safeSend(recorder, "start-recording")) {
    console.error("Start nahrávání selhal: recorder window není dostupné");
    isRecording = false;
    setTrayActive(false);
    return;
  }

  // Ztlum hlasitost asynchronně (na macOS to trvá i 500 ms)
  void duckVolume();
  setTrayActive(true);

  ensureOverlay();
  showOverlay();
  // Malé zpoždění – throttlovaný renderer se musí probrat
  setTimeout(() => safeSend(getOverlay(), "recording-start"), 50);

  currentPromptPromise = buildPrompt();
}

export function stopRecording(): void {
  console.log("⏹ Stop nahrávání");
  safeSend(getRecorder(), "stop-recording");
  void restoreVolume();
  setTrayActive(false);
  safeSend(getOverlay(), "recording-stop");
}

// ─── Transkripce přijatého audia ──────────────────────────────────────────────
export async function handleAudioData(arrayBuffer: ArrayBuffer): Promise<void> {
  safeSend(getOverlay(), "transcribing");

  const config = getConfig();
  const tempPath = join(app.getPath("temp"), `yaptap_audio_${Date.now()}.webm`);
  writeFileSync(tempPath, Buffer.from(arrayBuffer));

  let resolvedPrompt = "";
  if (currentPromptPromise) {
    try {
      resolvedPrompt = await currentPromptPromise;
    } catch (e) {
      console.error("Chyba při získávání promptu:", e);
      resolvedPrompt = config.fixedPrompt || "";
    }
  }

  const apiKey = process.env.OPENAI_API_KEY || config.apiKey;
  try {
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        "Není nastaven OpenAI API klíč. Nastavte OPENAI_API_KEY v .env nebo v nastavení aplikace.",
      );
    }
    const openai = new OpenAI({ apiKey: apiKey.trim() });

    const finalPrompt = (
      resolvedPrompt +
      (config.customWords ? "\nspecifické slova: " + config.customWords : "")
    ).trim();

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: createReadStream(tempPath),
      prompt: finalPrompt || undefined,
    });

    const finalText = transcription.text.trim();
    console.log("Transkripce:", finalText);

    if (finalText) {
      pasteText(finalText);
    } else {
      hideOverlay();
    }
  } catch (err) {
    hideOverlay();
    console.error("Chyba při transkripci:", (err as Error).message);
    setTrayError(`Chyba: ${(err as Error).message}`);
  } finally {
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    } catch (e) {
      console.error(
        "Chyba při mazání dočasného souboru:",
        (e as Error).message,
      );
    }
  }
}

/** Vloží text přes schránku + Ctrl/Cmd+V a obnoví původní obsah schránky. */
async function pasteText(text: string): Promise<void> {
  // Skryj overlay těsně před vložením, aby focus zůstal na inputu
  hideOverlay();
  // Krátká pauza – systém musí přepnout focus zpět na okno pod overlay
  await new Promise((resolve) => setTimeout(resolve, 80));

  const prevClipboard = clipboard.readText();
  clipboard.writeText(text);
  try {
    const robot = require("@jitsi/robotjs");
    robot.keyTap(
      "v",
      process.platform === "darwin" ? ["command"] : ["control"],
    );
  } catch (e) {
    console.error("Chyba při vkládání textu (robotjs):", e);
  }
  setTimeout(() => clipboard.writeText(prevClipboard), 500);
}

export function handleRecordingError(err: {
  code?: string;
  message?: string;
}): void {
  console.error("Chyba mikrofonu:", err.code, err.message);
  isRecording = false;
  hideOverlay();
  setTrayActive(false);
  setTrayError(`Mikrofon: ${err.message}`);
}
