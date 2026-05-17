import path from "node:path";

import { tool } from "ai";
import { execa } from "execa";
import { z } from "zod";

import { createSafeExecutionEnv } from "../safe-env";
import { truncate } from "../utils";

const ALLOWED_COMMANDS = new Set(["npm", "pnpm", "yarn", "bun"]);

const ALLOWED_PACKAGE_MANAGER_ACTIONS = new Set([
  "install",
  "add",
  "remove",
  "run",
  "test",
  "lint",
]);

const DENIED_PACKAGE_MANAGER_ACTIONS = new Set([
  "create",
  "dlx",
  "exec",
  "x",
  "npx",
]);

export function createRunScriptTool(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    runScript: tool({
      description: `Run Node.js and package manager scripts (${[...ALLOWED_COMMANDS].join("/")}) in the workspace`,

      inputSchema: z.object({
        command: z
          .string()
          .min(1)
          .describe("Command executable, for example 'npm', 'pnpm', or 'node'"),

        args: z
          .array(z.string())
          .default([])
          .describe(
            "Command arguments, for example ['test'] or ['run', 'build']",
          ),

        timeoutMs: z.number().int().min(1_000).max(60_000).default(30_000),
      }),

      execute: async ({ command, args = [], timeoutMs }) => {
        validateCommand(command, args);

        const commandLine = [command, ...args].join(" ");

        const result = await execa(command, args, {
          cwd: resolvedWorkspace,
          reject: false,
          timeout: timeoutMs,
          maxBuffer: 5_000_000,
          stdin: "ignore",
          forceKillAfterDelay: 1_000,
          env: createSafeExecutionEnv(),
          extendEnv: false,
        });

        return {
          command: commandLine,
          exitCode: result.exitCode,
          stdout: truncate(result.stdout),
          stderr: truncate(result.stderr),
          failed: result.failed,
          timedOut: result.timedOut,
        };
      },
    }),
  };
}

function validateCommand(command: string, args: string[]) {
  if (!command.trim()) {
    throw new Error("Command cannot be empty");
  }

  if (command !== command.trim() || command.includes(" ")) {
    throw new Error("Command must be a single executable name");
  }

  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  if (args.some((arg) => arg.includes("\0"))) {
    throw new Error("Invalid command argument");
  }

  const [action] = args;

  if (!action) {
    throw new Error("Package manager action is required");
  }

  if (action.startsWith("-")) {
    throw new Error(`Package manager option not allowed: ${action}`);
  }

  if (DENIED_PACKAGE_MANAGER_ACTIONS.has(action)) {
    throw new Error(`Package manager action not allowed: ${action}`);
  }

  if (!ALLOWED_PACKAGE_MANAGER_ACTIONS.has(action)) {
    throw new Error(`Package manager action not allowed: ${action}`);
  }
}
