import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { createRunCommandTool } from "./run-command";

type RunCommandExecute = (input: { script: string }) => Promise<string>;

describe("runCommand", () => {
  test("runs a package-manager command in the workspace", async () => {
    const workspaceRoot = await makePackageWorkspace();

    const output = await runCommand(
      workspaceRoot,
      'bun -e "console.log(process.cwd())"',
    );

    expect(output.trim()).toBe(await fs.realpath(workspaceRoot));
  });

  test("preserves quoted arguments", async () => {
    const workspaceRoot = await makePackageWorkspace();

    const output = await runCommand(
      workspaceRoot,
      'bun -e "console.log(process.argv[1])" "hello world"',
    );

    expect(output.trim()).toBe("hello world");
  });

  for (const { name, script, error } of [
    {
      name: "shell syntax",
      script: "bun test && bun build",
      error: "Shell syntax is not supported by runCommand",
    },
    {
      name: "multiple lines",
      script: "bun test\nbun build",
      error: "Found multiple lines",
    },
    {
      name: "environment-variable assignment",
      script: "CI=1 bun test",
      error: "Environment-variable assignment is not supported",
    },
    {
      name: "non-package-manager commands",
      script: "node --version",
      error: "Command not allowed: node",
    },
  ]) {
    test(`rejects ${name}`, async () => {
      const workspaceRoot = await makePackageWorkspace();

      await expect(runCommand(workspaceRoot, script)).rejects.toThrow(error);
    });
  }
});

async function runCommand(workspaceRoot: string, script: string) {
  const tools = await createRunCommandTool(workspaceRoot);
  const execute = tools.runCommand.execute as RunCommandExecute | undefined;

  if (!execute) {
    throw new Error("runCommand execute function is missing");
  }

  return await execute({ script });
}

async function makePackageWorkspace() {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));

  await fs.writeFile(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify({ private: true }, null, 2),
  );

  return workspaceRoot;
}
