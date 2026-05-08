import { perplexity } from "@ai-sdk/perplexity";

import type { ModelFactory } from "./types";

export const createPerplexityModel: ModelFactory = function ({
  name,
  reasoning,
}) {
  if (reasoning) {
    throw new Error("Perplexity reasoning is selected by model name.");
  }

  return {
    model: perplexity(name),
  };
};
