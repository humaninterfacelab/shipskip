import {
  openai,
  type OpenAILanguageModelResponsesOptions,
} from "@ai-sdk/openai";

import type { ModelFactory } from "./types";

export const createOpenAIModel: ModelFactory = function ({ name, reasoning }) {
  return {
    model: openai(name),
    providerOptions: reasoning
      ? {
          openai: {
            reasoningEffort: parseReasoningEffort(reasoning),
          } satisfies OpenAILanguageModelResponsesOptions,
        }
      : undefined,
  };
};

function parseReasoningEffort(
  reasoning: string,
): NonNullable<OpenAILanguageModelResponsesOptions["reasoningEffort"]> {
  if (
    reasoning === "minimal" ||
    reasoning === "low" ||
    reasoning === "medium" ||
    reasoning === "high"
  ) {
    return reasoning;
  }

  throw new Error("OpenAI reasoning must be one of: minimal, low, medium, high.");
}
