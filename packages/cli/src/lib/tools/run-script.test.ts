import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { createRunScriptTool } from "./run-script";

type RunScriptExecute = (input: {
  command: string;
  args?: string[];
  timeoutMs?: number;
}) => Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  failed: boolean;
  timedOut: boolean;
}>;

describe("runScript", () => {
  test("runs an allowed command in the workspace", async () => {
    const workspace = await makePackageWorkspace();
    const result = await runScript(workspace, {
      command: "bun",
      args: ["run", "print-cwd"],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(await fs.realpath(workspace));
  });

  test("does not expose provider secrets to package scripts", async () => {
    const workspace = await makePackageWorkspace();
    const originalApiKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "secret-value";

    try {
      const result = await runScript(workspace, {
        command: "bun",
        args: ["run", "print-secret"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("missing");
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = originalApiKey;
      }
    }
  });

  test("rejects commands outside the allowlist", async () => {
    const workspace = await makePackageWorkspace();

    await expect(
      runScript(workspace, { command: "git", args: ["status"] }),
    ).rejects.toThrow("Command not allowed: git");
  });

  test("rejects direct JavaScript execution", async () => {
    const workspace = await makePackageWorkspace();

    await expect(
      runScript(workspace, {
        command: "bun",
        args: ["-e", "console.log('blocked')"],
      }),
    ).rejects.toThrow("Package manager option not allowed: -e");
  });

  test("rejects empty package manager invocations", async () => {
    const workspace = await makePackageWorkspace();

    await expect(runScript(workspace, { command: "bun" })).rejects.toThrow(
      "Package manager action is required",
    );
  });

  test("rejects package manager exec actions", async () => {
    const workspace = await makePackageWorkspace();

    await expect(
      runScript(workspace, { command: "bun", args: ["x", "eslint"] }),
    ).rejects.toThrow("Package manager action not allowed: x");
  });

  test("rejects command strings with spaces", async () => {
    const workspace = await makePackageWorkspace();

    await expect(runScript(workspace, { command: "bun test" })).rejects.toThrow(
      "Command must be a single executable name",
    );
  });
});

async function runScript(
  workspace: string,
  input: Parameters<RunScriptExecute>[0],
) {
  const tools = createRunScriptTool(workspace);
  const execute = tools.runScript.execute as RunScriptExecute | undefined;

  if (!execute) {
    throw new Error("runScript execute function is missing");
  }

  return await execute({ timeoutMs: 10_000, ...input });
}

async function makePackageWorkspace() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));

  await fs.writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify(
      {
        private: true,
        scripts: {
          "print-cwd": 'bun -e "console.log(process.cwd())"',
          "print-secret":
            "bun -e \"console.log(process.env.OPENROUTER_API_KEY ?? 'missing')\"",
        },
      },
      null,
      2,
    ),
  );

  return workspace;
}
