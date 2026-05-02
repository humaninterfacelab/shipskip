import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

export type ModelConfig = {
  model: LanguageModel;
  providerOptions?: ProviderOptions;
};

export type ModelFactory = (options: {
  name: string;
  reasoning?: string;
}) => ModelConfig;
