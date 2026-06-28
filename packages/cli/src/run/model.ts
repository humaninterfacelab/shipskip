export type ModelParts = {
  provider: string;
  modelId: string;
};

export function resolveModelString(modelString: string): ModelParts {
  const firstSlash = modelString.indexOf("/");
  if (firstSlash === -1) {
    throw new Error(
      `--model must be "provider/modelId" (e.g. "openrouter/qwen/qwen3-coder:free"), got: ${modelString}`,
    );
  }
  return {
    provider: modelString.slice(0, firstSlash),
    modelId: modelString.slice(firstSlash + 1),
  };
}