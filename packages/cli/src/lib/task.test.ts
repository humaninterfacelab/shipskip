import path from "node:path";

import { describe, expect, test } from "bun:test";

import { getTemplateBuildScriptPath } from "./task";

describe("getTemplateBuildScriptPath", () => {
  test("resolves the trusted template build script", () => {
    const target = getTemplateBuildScriptPath("templates/next-app");

    expect(target).toEndWith(
      path.join("packages", "tasks", "templates", "next-app", "build.sh"),
    );
    expect(target).toContain(path.join("templates", "next-app"));
  });

  test("rejects paths outside the task package", () => {
    expect(() => getTemplateBuildScriptPath("../outside")).toThrow(
      "Task asset path escapes package",
    );
  });
});
