import { google, type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

import type { ModelFactory } from "./types";

export const createGoogleModel: ModelFactory = function ({ name, reasoning }) {
  return {
    model: google(name),
    providerOptions: reasoning
      ? {
          google: {
            thinkingConfig: {
              includeThoughts: true,
              thinkingLevel: parseThinkingLevel(reasoning),
            },
          } satisfies GoogleGenerativeAIProviderOptions,
        }
      : undefined,
  };
};

function parseThinkingLevel(
  reasoning: string,
): NonNullable<
  NonNullable<GoogleGenerativeAIProviderOptions["thinkingConfig"]>["thinkingLevel"]
> {
  if (
    reasoning === "minimal" ||
    reasoning === "low" ||
    reasoning === "medium" ||
    reasoning === "high"
  ) {
    return reasoning;
  }

  throw new Error("Google reasoning must be one of: minimal, low, medium, high.");
}
