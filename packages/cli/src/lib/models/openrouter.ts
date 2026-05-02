import {
  openrouter,
  type OpenRouterProviderOptions,
} from "@openrouter/ai-sdk-provider";

import type { ModelFactory } from "./types";

export const createOpenRouterModel: ModelFactory = function ({ name, reasoning }) {
  return {
    model: openrouter(name),
    providerOptions: reasoning
      ? {
          openrouter: {
            reasoning: parseReasoning(reasoning),
          } satisfies OpenRouterProviderOptions,
        }
      : undefined,
  };
};

function parseReasoning(
  reasoning: string,
): NonNullable<OpenRouterProviderOptions["reasoning"]> {
  if (
    reasoning === "none" ||
    reasoning === "minimal" ||
    reasoning === "low" ||
    reasoning === "medium" ||
    reasoning === "high" ||
    reasoning === "xhigh"
  ) {
    return { effort: reasoning };
  }

  const maxTokens = Number(reasoning);

  if (Number.isInteger(maxTokens) && maxTokens > 0) {
    return { max_tokens: maxTokens };
  }

  throw new Error(
    "OpenRouter reasoning must be one of: none, minimal, low, medium, high, xhigh, or a positive max token count.",
  );
}
