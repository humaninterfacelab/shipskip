import { describe, expect, test } from "bun:test";

import { getModel } from "./model";
import { createGoogleModel } from "./models/google";
import { createOpenAIModel } from "./models/openai";
import { createOpenRouterModel } from "./models/openrouter";

describe("getModel", () => {
  test("rejects unsupported providers", () => {
    expect(() => getModel("anthropic", "claude-sonnet-4.5")).toThrow(
      "Unsupported model provider: anthropic",
    );
  });

  test("returns model config for supported providers", () => {
    expect(getModel("openai", "gpt-5.1").model).toBeDefined();
    expect(getModel("google", "gemini-3-pro").model).toBeDefined();
    expect(getModel("openrouter", "openai/gpt-5.1").model).toBeDefined();
  });
});

describe("createOpenAIModel", () => {
  test("omits provider options when reasoning is not provided", () => {
    expect(createOpenAIModel({ name: "gpt-5.1" }).providerOptions).toBeUndefined();
  });

  test("maps valid reasoning efforts", () => {
    expect(createOpenAIModel({ name: "gpt-5.1", reasoning: "high" })).toMatchObject({
      providerOptions: {
        openai: {
          reasoningEffort: "high",
        },
      },
    });
  });

  test("rejects invalid reasoning efforts", () => {
    expect(() => createOpenAIModel({ name: "gpt-5.1", reasoning: "xhigh" })).toThrow(
      "OpenAI reasoning must be one of: minimal, low, medium, high.",
    );
  });
});

describe("createGoogleModel", () => {
  test("omits provider options when reasoning is not provided", () => {
    expect(createGoogleModel({ name: "gemini-3-pro" }).providerOptions).toBeUndefined();
  });

  test("maps valid reasoning levels", () => {
    expect(createGoogleModel({ name: "gemini-3-pro", reasoning: "medium" })).toMatchObject({
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "medium",
          },
        },
      },
    });
  });

  test("rejects invalid reasoning levels", () => {
    expect(() =>
      createGoogleModel({ name: "gemini-3-pro", reasoning: "none" }),
    ).toThrow("Google reasoning must be one of: minimal, low, medium, high.");
  });
});

describe("createOpenRouterModel", () => {
  test("omits provider options when reasoning is not provided", () => {
    expect(
      createOpenRouterModel({ name: "openai/gpt-5.1" }).providerOptions,
    ).toBeUndefined();
  });

  test("maps effort-based reasoning", () => {
    expect(
      createOpenRouterModel({ name: "openai/gpt-5.1", reasoning: "xhigh" }),
    ).toMatchObject({
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: "xhigh",
          },
        },
      },
    });
  });

  test("maps numeric reasoning to max tokens", () => {
    expect(
      createOpenRouterModel({ name: "openai/gpt-5.1", reasoning: "1024" }),
    ).toMatchObject({
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 1024,
          },
        },
      },
    });
  });

  test("rejects invalid reasoning values", () => {
    expect(() =>
      createOpenRouterModel({ name: "openai/gpt-5.1", reasoning: "0" }),
    ).toThrow(
      "OpenRouter reasoning must be one of: none, minimal, low, medium, high, xhigh, or a positive max token count.",
    );
  });
});
