import { beforeEach, describe, expect, mock, test } from "bun:test";

const openrouterMock = mock((modelId: string) => ({ modelId }));

mock.module("@openrouter/ai-sdk-provider", () => ({
  openrouter: openrouterMock,
}));

const { getModel } = await import("./model");

describe("getModel", () => {
  beforeEach(() => {
    openrouterMock.mockClear();
  });

  test("rejects empty model ids", () => {
    expect(() => getModel("   ")).toThrow("Model id cannot be empty.");
  });

  test("passes trimmed model ids to OpenRouter", () => {
    getModel(" qwen/qwen3-coder:free ");

    expect(openrouterMock).toHaveBeenCalledWith("qwen/qwen3-coder:free");
  });
});
