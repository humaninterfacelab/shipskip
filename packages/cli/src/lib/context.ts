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

const logger = getLogger();

export async function getContextLength(provider: string, modelName: string) {
  try {
    const openRouterModelId =
      provider === "openrouter" ? modelName : `${provider}/${modelName}`;

    const response = await fetch(OPENROUTER_MODELS_URL);

    const data = (await response.json()) as OpenRouterModelsResponse;
    const match = data.data?.find((model) => model.id === openRouterModelId);

    return match?.context_length ?? match?.top_provider?.context_length;
  } catch (error) {
    logger.error(error, "Context length lookup failed");
    return undefined;
  }
}
