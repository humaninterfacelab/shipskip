import { openrouter } from "@openrouter/ai-sdk-provider";

export function getModel(modelId: string) {
  const trimmedModelId = modelId.trim();

  if (!trimmedModelId) {
    throw new Error("Model id cannot be empty.");
  }

  return openrouter(trimmedModelId);
}
