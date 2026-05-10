const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

function normalizeModelId(modelId: string) {
  return modelId.trim().split(":", 1)[0];
}

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
    const normalizedModelId = normalizeModelId(modelId);
    const match = data.data?.find(
      (model) => model.id && normalizeModelId(model.id) === normalizedModelId,
    );

    return match?.context_length ?? match?.top_provider?.context_length;
  } catch {
    return undefined;
  }
}
