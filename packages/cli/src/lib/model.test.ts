import { describe, expect, test } from "bun:test";

import { parseModelProfile } from "./model";

describe("parseModelProfile", () => {
  test("parses provider and model name", () => {
    expect(parseModelProfile("openai/gpt-5.1")).toEqual({
      provider: "openai",
      modelName: "gpt-5.1",
      reasoning: undefined,
    });
  });

  test("parses provider, slash-containing model names, and reasoning", () => {
    expect(
      parseModelProfile("openrouter/meta-llama/llama-3.1-8b-instruct:free#high"),
    ).toEqual({
      provider: "openrouter",
      modelName: "meta-llama/llama-3.1-8b-instruct:free",
      reasoning: "high",
    });
  });

  test("trims surrounding whitespace", () => {
    expect(parseModelProfile("  google/gemini-3-pro  ")).toEqual({
      provider: "google",
      modelName: "gemini-3-pro",
      reasoning: undefined,
    });
  });

  test("rejects missing provider or model names", () => {
    expect(() => parseModelProfile("gpt-5.1")).toThrow(
      "Model must be in the format '<provider>/<model>[#reasoning]'.",
    );
    expect(() => parseModelProfile("openai/")).toThrow(
      "Model must be in the format '<provider>/<model>[#reasoning]'.",
    );
  });

  test("rejects empty reasoning suffixes", () => {
    expect(() => parseModelProfile("openai/gpt-5.1#")).toThrow(
      "Model reasoning cannot be empty when '#' is provided.",
    );
  });
});
