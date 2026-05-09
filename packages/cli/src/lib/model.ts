import { createGoogleModel } from "./models/google";
import { createOpenAIModel } from "./models/openai";
import { createOpenRouterModel } from "./models/openrouter";
import type { ModelConfig, ModelFactory } from "./models/types";

type ModelProvider = keyof typeof modelProviders;

export type ModelProfile = {
  provider: string;
  modelName: string;
  reasoning?: string;
};

const modelProviders = {
  openrouter: createOpenRouterModel,
  google: createGoogleModel,
  openai: createOpenAIModel,
} satisfies Record<string, ModelFactory>;

export function getModel(
  provider: string,
  name: string,
  reasoning?: string,
): ModelConfig {
  if (!isModelProvider(provider)) {
    throw new Error(`Unsupported model provider: ${provider}`);
  }

  return modelProviders[provider]({ name, reasoning });
}

function isModelProvider(provider: string): provider is ModelProvider {
  return provider in modelProviders;
}

export function parseModelProfile(profile: string): ModelProfile {
  const trimmedProfile = profile.trim();
  const [provider, ...modelParts] = trimmedProfile.split("/");
  const modelNameWithReasoning = modelParts.join("/");

  if (!provider || !modelNameWithReasoning) {
    throw new Error(
      "Model must be in the format '<provider>/<model>[#reasoning]'.",
    );
  }

  const separatorIndex = modelNameWithReasoning.lastIndexOf("#");
  const modelName =
    separatorIndex === -1
      ? modelNameWithReasoning
      : modelNameWithReasoning.slice(0, separatorIndex);
  const reasoning =
    separatorIndex === -1
      ? undefined
      : modelNameWithReasoning.slice(separatorIndex + 1);

  if (!modelName) {
    throw new Error("Model name cannot be empty.");
  }

  if (reasoning === "") {
    throw new Error("Model reasoning cannot be empty when '#' is provided.");
  }

  return {
    provider,
    modelName,
    reasoning,
  };
}
