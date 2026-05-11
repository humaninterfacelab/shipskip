import { afterEach, describe, expect, mock, test } from "bun:test";

import { getContextLength } from "./context";

const originalFetch = globalThis.fetch;

describe("getContextLength", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("matches exact OpenRouter model ids", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          data: [
            { id: "openrouter/qwen/qwen3-coder:free", context_length: 111 },
            { id: "qwen/qwen3-coder:free", context_length: 222 },
          ],
        }),
      );
    }) as unknown as typeof fetch;

    await expect(getContextLength("qwen/qwen3-coder:free")).resolves.toBe(222);
  });

  test("ignores model id suffixes when matching context length", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          data: [{ id: "qwen/qwen3-coder", context_length: 222 }],
        }),
      );
    }) as unknown as typeof fetch;

    await expect(getContextLength("qwen/qwen3-coder:free")).resolves.toBe(222);
  });

  test("falls back to top provider context length", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "google/gemini-3.1-flash-lite-preview",
              top_provider: { context_length: 333 },
            },
          ],
        }),
      );
    }) as unknown as typeof fetch;

    await expect(
      getContextLength("google/gemini-3.1-flash-lite-preview"),
    ).resolves.toBe(333);
  });
});
