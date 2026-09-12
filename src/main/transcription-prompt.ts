import type { AppConfig } from "../shared/types";
import { loadDynamicContext } from "./dynamic-context";

export async function buildTranscriptionPrompt(
  config: AppConfig,
  readScreenContext: (config: AppConfig) => Promise<string>,
): Promise<string> {
  const [screenContext, dynamicContext] = await Promise.all([
    config.screenshotEnabled ? readScreenContext(config) : Promise.resolve(""),
    loadDynamicContext(config),
  ]);
  if (dynamicContext.error) {
    console.warn("Dynamický kontext vynechán:", dynamicContext.error);
  }
  return [
    config.fixedPrompt.trim(),
    screenContext,
    config.customWords.trim() ? `Specifická slova: ${config.customWords.trim()}` : "",
    dynamicContext.text ? `Doplňující kontext a slovíčka: ${dynamicContext.text}` : "",
  ].filter(Boolean).join("\n\n");
}
