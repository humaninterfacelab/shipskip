import path from "node:path";

import { describe, expect, test } from "bun:test";

import { resolveSafePath, truncate } from "./utils";

describe("resolveSafePath", () => {
  test("resolves paths inside the workspace", () => {
    expect(resolveSafePath("/workspace", "src/index.ts")).toBe(
      path.resolve("/workspace/src/index.ts"),
    );
  });

  test("rejects paths outside the workspace", () => {
    expect(() => resolveSafePath("/workspace", "../outside.ts")).toThrow(
      "Path escapes workspace",
    );
  });
});

describe("truncate", () => {
  test("returns short text unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("adds a truncation marker when text exceeds the limit", () => {
    expect(truncate("hello world", 5)).toBe("hello\n\n[output truncated]");
  });
});
