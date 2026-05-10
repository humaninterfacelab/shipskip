import path from "node:path";

import { tool } from "ai";
import { execa } from "execa";
import { z } from "zod";

import { resolveSafePath, truncate } from "../utils";

const DENIED_ARGS = [
  "-C",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--config-env",
  "-c",
  "--global",
  "--system",
  "--local",
] as const;

const READ_ONLY_COMMANDS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "branch",
  "ls-files",
]);

export function createGitTool(workspace: string) {
  const cwd = path.resolve(workspace);

  return {
    git: tool({
      description: "Run git commands in the workspace",

      inputSchema: z.object({
        args: z
          .array(z.string())
          .min(1)
          .describe("Git arguments, for example ['status', '--short']"),

        timeoutMs: z.number().int().min(1_000).max(60_000).default(30_000),
      }),

      execute: async ({ args, timeoutMs }) => {
        validateGitArgs(cwd, args);

        const command = `git ${args.join(" ")}`;

        const result = await execa("git", args, {
          cwd,
          reject: false,
          timeout: timeoutMs,
          maxBuffer: 2_000_000,
        });

        return {
          command,
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

function validateGitArgs(workspace: string, args: string[]) {
  const [command, ...commandArgs] = args;

  validateNoDeniedArgs(args);

  if (!command || command.startsWith("-")) {
    throw new Error("Git command must be the first argument");
  }

  if (READ_ONLY_COMMANDS.has(command)) return;

  if (command === "add") {
    validateGitAdd(workspace, commandArgs);
    return;
  }

  if (command === "commit") {
    validateGitCommit(commandArgs);
    return;
  }

  throw new Error(`Git command not allowed: ${command}`);
}

function validateNoDeniedArgs(args: string[]) {
  for (const arg of args) {
    if (arg.includes("\0")) {
      throw new Error("Invalid git argument");
    }

    if (
      DENIED_ARGS.some(
        (denied) => arg === denied || arg.startsWith(`${denied}=`),
      )
    ) {
      throw new Error(`Git argument not allowed: ${arg}`);
    }
  }
}

function validateGitAdd(workspace: string, args: string[]) {
  if (args.length === 0) {
    throw new Error("git add requires at least one path");
  }

  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`git add option not allowed: ${arg}`);
    }

    resolveSafePath(workspace, arg);
  }
}

function validateGitCommit(args: string[]) {
  const [flag, message] = args;

  if (args.length !== 2 || flag !== "-m" || !message || !message.trim()) {
    throw new Error("git commit only supports: git commit -m <message>");
  }
}
