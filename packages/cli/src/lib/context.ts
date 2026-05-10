import { getLogger } from "./logger";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[];
};

type OpenRouterModel = {
  id?: string;
  context_length?: number;
  top_provider?: {
    context_length?: number;
  };
};

export async function getContextLength(modelId: string) {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL);

    const data = (await response.json()) as OpenRouterModelsResponse;
    const match = data.data?.find((model) => model.id === modelId);

    return match?.context_length ?? match?.top_provider?.context_length;
  } catch (error) {
    getLogger().error({ err: error }, "Context length lookup failed");
    return undefined;
  }
}
