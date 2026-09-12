import type { AppConfig } from "../shared/types";
import { loadDynamicContext } from "./dynamic-context";

export interface TranscriptionContext {
  prompt: string;
  keywords: string[];
}

export function buildTranscriptionKeywords(...sources: string[]): string[] {
  return [
    ...new Set(
      sources.flatMap((source) =>
        source
          .split(/[,;\r\n]+/)
          .map((word) => word.trim())
          .filter(Boolean),
      ),
    ),
  ];
}

export async function buildTranscriptionContext(
  config: AppConfig,
  readScreenContext: (config: AppConfig) => Promise<string>,
): Promise<TranscriptionContext> {
  const [screenContext, dynamicContext] = await Promise.all([
    config.screenshotEnabled ? readScreenContext(config) : Promise.resolve(""),
    loadDynamicContext(config),
  ]);
  if (dynamicContext.error) {
    console.warn("Dynamický kontext vynechán:", dynamicContext.error);
  }
  const prompt = [config.fixedPrompt.trim(), screenContext]
    .filter(Boolean)
    .join("\n\n");
  return {
    prompt,
    keywords: buildTranscriptionKeywords(
      config.customWords,
      dynamicContext.text,
    ),
  };
}
